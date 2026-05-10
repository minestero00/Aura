import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import { advanceActiveTripLeg, clearActiveTrip, loadActiveTrip } from "./client-trip";
import type { ActiveTripState } from "./client-trip";
import type { DirectionsLeg } from "./types";
import {
  cancelTransitArrivalNotifications,
  ensureTransitNotificationPermission,
  presentTransitArrivalNotification
} from "./notifications";
import {
  isBackgroundGeofenceAvailable,
  startBackgroundMonitoring,
  stopBackgroundMonitoring,
  subscribeBackgroundEnter
} from "./native-geofence";

const POLL_INTERVAL_MS = 15_000;
const ARRIVAL_RADIUS_METERS = 300;
const FINAL_ARRIVAL_RADIUS_METERS = 30;
// transit 정류장은 한 정거장 전부터 알림이 떠야 사용자가 하차 준비 가능 — iOS region monitoring은 도시 환경에서 ~100m 오차가 있어 350m 정도 줘야 안정적.
const BACKGROUND_REGION_RADIUS_METERS = 350;
// 최종 목적지(집/사무실)는 너무 일찍 알림 오면 부정확 — 100m로 분리.
const BACKGROUND_DEST_RADIUS_METERS = 100;

type TransitLeg = Extract<DirectionsLeg, { mode: "transit" }>;

export interface GeofenceStatus {
  active: boolean;
  distanceMeters: number | null;
  targetStopName: string | null;
  notificationDenied: boolean;
  backgroundActive: boolean;
}

interface PollingTarget {
  name: string;
  lat: number;
  lng: number;
  isFinal: boolean;
}

/**
 * 현재 leg 기준 다음 도달해야 할 좌표(target).
 * - transit leg → arrivalStop (정류장 도착이 leg 종료)
 * - walking leg + 다음이 transit → 다음 transit departureStop (도보 끝 = 정류장)
 * - walking leg + 마지막 → endLocation (전체 destination)
 */
function getPollingTarget(trip: ActiveTripState): PollingTarget | null {
  const currentLeg = trip.legs[trip.currentLegIndex];
  if (!currentLeg) return null;
  const isLastLeg = trip.currentLegIndex >= trip.legs.length - 1;

  if (currentLeg.mode === "transit") {
    return {
      name: currentLeg.arrivalStop.name,
      lat: currentLeg.arrivalStop.lat,
      lng: currentLeg.arrivalStop.lng,
      isFinal: isLastLeg && !trip.endLocation
        ? true
        : isLastLeg && trip.endLocation
          ? // 마지막 transit leg의 arrival이 endLocation과 거의 동일하면 final로 간주
            haversineMeters(
              currentLeg.arrivalStop.lat,
              currentLeg.arrivalStop.lng,
              trip.endLocation.lat,
              trip.endLocation.lng
            ) < 50
          : false
    };
  }

  // walking
  const nextLeg = trip.legs[trip.currentLegIndex + 1];
  if (nextLeg?.mode === "transit") {
    return {
      name: nextLeg.departureStop.name,
      lat: nextLeg.departureStop.lat,
      lng: nextLeg.departureStop.lng,
      isFinal: false
    };
  }
  // 다음 leg 없음(마지막 walking) — endLocation
  if (trip.endLocation) {
    return {
      name: trip.destinationLabel || "destination",
      lat: trip.endLocation.lat,
      lng: trip.endLocation.lng,
      isFinal: true
    };
  }
  return null;
}

interface RegionInput {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  type: "transit-arrival" | "destination";
}

/** 모든 leg + 최종 destination을 한꺼번에 region 등록. iOS 한도 20개 안. */
function buildRegions(trip: ActiveTripState): RegionInput[] {
  const regions: RegionInput[] = [];

  trip.legs.forEach((leg, index) => {
    if (leg.mode === "transit") {
      regions.push({
        id: `leg-${index}`,
        lat: leg.arrivalStop.lat,
        lng: leg.arrivalStop.lng,
        radius: BACKGROUND_REGION_RADIUS_METERS,
        name: leg.arrivalStop.name,
        type: "transit-arrival"
      });
      return;
    }
    // walking — 다음 transit leg가 있으면 그 departureStop을 region target
    const nextLeg = trip.legs[index + 1];
    if (nextLeg?.mode === "transit") {
      regions.push({
        id: `leg-${index}`,
        lat: nextLeg.departureStop.lat,
        lng: nextLeg.departureStop.lng,
        radius: BACKGROUND_REGION_RADIUS_METERS,
        name: nextLeg.departureStop.name,
        type: "transit-arrival"
      });
    }
    // 마지막 walking은 dest region이 별도로 처리
  });

  if (trip.endLocation) {
    regions.push({
      id: "dest",
      lat: trip.endLocation.lat,
      lng: trip.endLocation.lng,
      radius: BACKGROUND_DEST_RADIUS_METERS,
      name: trip.destinationLabel || "목적지",
      type: "destination"
    });
  }

  return regions;
}

export function useGeofenceTracker({
  trip,
  language,
  onChange
}: {
  trip: ActiveTripState | null;
  language: "ko" | "en";
  onChange: (next: ActiveTripState | null) => void;
}): GeofenceStatus {
  const [status, setStatus] = useState<GeofenceStatus>({
    active: false,
    distanceMeters: null,
    targetStopName: null,
    notificationDenied: false,
    backgroundActive: false
  });

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // backgroundActive를 ref로도 보관 — AppState listener가 stale closure 없이 체크.
  const backgroundActiveRef = useRef(status.backgroundActive);
  backgroundActiveRef.current = status.backgroundActive;

  // 알림 권한 요청 — trip 시작 시 한 번.
  useEffect(() => {
    if (!trip) return;
    let cancelled = false;
    void ensureTransitNotificationPermission().then(granted => {
      if (cancelled) return;
      setStatus(prev => ({ ...prev, notificationDenied: !granted }));
    });
    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  // Background region monitoring — trip 시작 시 모든 leg + dest 일괄 등록.
  useEffect(() => {
    if (!trip) {
      void stopBackgroundMonitoring();
      setStatus(prev => ({ ...prev, backgroundActive: false }));
      return;
    }
    if (!isBackgroundGeofenceAvailable()) {
      setStatus(prev => ({ ...prev, backgroundActive: false }));
      return;
    }

    const regions = buildRegions(trip);
    if (regions.length === 0) {
      setStatus(prev => ({ ...prev, backgroundActive: false }));
      return;
    }

    void startBackgroundMonitoring(regions)
      .then(added => setStatus(prev => ({ ...prev, backgroundActive: added > 0 })))
      .catch(() => setStatus(prev => ({ ...prev, backgroundActive: false })));

    // 사용자가 Settings에서 권한을 "Always"로 바꾸고 앱으로 돌아오는 시점을
    // 잡아 자동으로 startMonitoring 재시도. 이미 active이면 skip.
    const appStateSub = AppState.addEventListener("change", state => {
      if (state !== "active") return;
      if (backgroundActiveRef.current) return;
      void startBackgroundMonitoring(regions)
        .then(added => {
          if (added > 0) {
            setStatus(prev => ({ ...prev, backgroundActive: true }));
          }
        })
        .catch(() => undefined);
    });

    const unsubscribe = subscribeBackgroundEnter(async event => {
      if (event.id === "dest") {
        // 최종 도착 — trip 정리 (native가 별도 알림 이미 표시).
        await clearActiveTrip();
        onChangeRef.current(null);
        return;
      }
      const match = event.id.match(/leg-(\d+)/);
      if (!match) return;
      const enteredLegIndex = parseInt(match[1], 10);
      let current = await loadActiveTrip();
      if (!current) return;
      while (current && current.currentLegIndex <= enteredLegIndex) {
        const next = await advanceActiveTripLeg();
        if (!next || next === current) break;
        current = next;
      }
      onChangeRef.current(current);
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, [trip?.id]);

  // Foreground polling — current leg 기반 동적 target.
  useEffect(() => {
    if (!trip) {
      setStatus(prev => ({
        active: false,
        distanceMeters: null,
        targetStopName: null,
        notificationDenied: false,
        backgroundActive: prev.backgroundActive
      }));
      return;
    }

    const target = getPollingTarget(trip);
    if (!target) {
      setStatus(prev => ({ ...prev, active: false, distanceMeters: null, targetStopName: null }));
      return;
    }

    setStatus(prev => ({
      ...prev,
      active: true,
      targetStopName: target.name
    }));

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;

    async function pollOnce() {
      if (cancelled) return;
      const loc = await getCurrentDeviceLocation();
      if (cancelled) return;
      if (loc.kind !== "ok") return;
      const distance = haversineMeters(loc.lat, loc.lng, target!.lat, target!.lng);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(
          `[geofence] target=${target!.name}(${target!.lat.toFixed(5)},${target!.lng.toFixed(5)}) ` +
            `here=(${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}) ` +
            `distance=${Math.round(distance)}m final=${target!.isFinal}`
        );
      }
      setStatus(prev => ({ ...prev, distanceMeters: Math.round(distance) }));

      const radius = target!.isFinal ? FINAL_ARRIVAL_RADIUS_METERS : ARRIVAL_RADIUS_METERS;
      if (distance <= radius) {
        // native geofence가 활성이면 native가 알림 발사 + JS는 leg advance만 — 중복 방지.
        // native가 비활성(simulator/권한 거부)일 때만 JS가 fallback으로 알림 발사.
        const shouldFireNotification = !backgroundActiveRef.current;
        if (target!.isFinal) {
          if (shouldFireNotification) {
            await presentTransitArrivalNotification({
              tripId: trip!.id,
              legIndex: -1,
              stopName: target!.name,
              language,
              type: "destination"
            });
          }
          await clearActiveTrip();
          onChangeRef.current(null);
        } else {
          if (shouldFireNotification) {
            await presentTransitArrivalNotification({
              tripId: trip!.id,
              legIndex: trip!.currentLegIndex,
              stopName: target!.name,
              language,
              type: "transit-arrival"
            });
          }
          const next = await advanceActiveTripLeg();
          onChangeRef.current(next);
        }
      }
    }

    function startPolling() {
      if (intervalId) return;
      void pollOnce();
      intervalId = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    if (AppState.currentState === "active") startPolling();

    appStateSub = AppState.addEventListener("change", state => {
      if (state === "active") startPolling();
      else stopPolling();
    });

    return () => {
      cancelled = true;
      stopPolling();
      appStateSub?.remove();
    };
  }, [trip?.id, trip?.currentLegIndex, language]);

  // trip 종료 시 pending 알림 cleanup.
  const lastTripIdRef = useRef<string | null>(null);
  const lastLegCountRef = useRef<number>(0);
  useEffect(() => {
    if (trip) {
      lastTripIdRef.current = trip.id;
      lastLegCountRef.current = trip.legs.length;
      return;
    }
    if (lastTripIdRef.current) {
      cancelTransitArrivalNotifications(lastTripIdRef.current, lastLegCountRef.current);
      lastTripIdRef.current = null;
      lastLegCountRef.current = 0;
    }
  }, [trip?.id]);

  return status;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
