import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import { advanceActiveTripLeg, loadActiveTrip } from "./client-trip";
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
const ARRIVAL_RADIUS_METERS = 150;

type TransitLeg = Extract<DirectionsLeg, { mode: "transit" }>;

export interface GeofenceStatus {
  /** 현재 polling 활성 여부. trip이 없거나 현재 leg가 walking이면 false. */
  active: boolean;
  /** 사용자 → target stop 거리(m). 측정 전 또는 walking leg면 null. */
  distanceMeters: number | null;
  /** 현재 target stop name. 없으면 null. */
  targetStopName: string | null;
  /** 알림 권한이 거부됐을 때 true — banner에서 hint. */
  notificationDenied: boolean;
  /** background region monitoring 활성 여부 — banner hint. */
  backgroundActive: boolean;
}

const BACKGROUND_REGION_RADIUS_METERS = 200;

/**
 * Foreground geofence MVP.
 * - 현재 leg가 transit이면 arrivalStop을 target으로 polling
 * - 사용자가 ARRIVAL_RADIUS_METERS 안으로 들어오면 advanceActiveTripLeg + 로컬
 *   알림 발사 → onChange 호출
 * - 현재 leg가 walking이면 polling 중지 (도착 시점은 manual "다음 단계로" 버튼)
 * - background 진행은 추후 native module에서 처리. 지금은 앱이 foreground일
 *   때만 동작하며 AppState change에 따라 polling을 멈췄다 재개한다.
 */
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

  // Background region monitoring — trip 시작 시 모든 transit leg arrivalStop을
  // 한 번에 region으로 등록. 백그라운드에서 ENTER 이벤트가 발생하면 native가
  // local notification을 띄우고, 앱이 살아있으면 JS에도 이벤트가 와서 advance.
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

    const transitRegions = trip.legs
      .map((leg, index) => {
        if (leg.mode !== "transit") return null;
        return {
          id: `leg-${index}`,
          lat: leg.arrivalStop.lat,
          lng: leg.arrivalStop.lng,
          radius: BACKGROUND_REGION_RADIUS_METERS
        };
      })
      .filter((r): r is { id: string; lat: number; lng: number; radius: number } => r !== null);

    if (transitRegions.length === 0) {
      setStatus(prev => ({ ...prev, backgroundActive: false }));
      return;
    }

    void startBackgroundMonitoring(transitRegions)
      .then(() => setStatus(prev => ({ ...prev, backgroundActive: true })))
      .catch(() => setStatus(prev => ({ ...prev, backgroundActive: false })));

    const unsubscribe = subscribeBackgroundEnter(async event => {
      // ENTER가 트리거된 leg index 추출. 현재보다 미래 leg면 그 index까지 advance.
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
    };
  }, [trip?.id]);

  // 알림 권한 요청 — trip 시작 시 한 번. 거부면 silent. 재요청은 OS가 막음.
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

    const currentLeg = trip.legs[trip.currentLegIndex];
    if (!currentLeg || currentLeg.mode !== "transit") {
      // walking leg면 polling 중지. distance는 비움.
      setStatus(prev => ({ ...prev, active: false, distanceMeters: null, targetStopName: null }));
      return;
    }

    const target = currentLeg.arrivalStop;
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
      const distance = haversineMeters(loc.lat, loc.lng, target.lat, target.lng);
      if (__DEV__) {
        // dev log — 시뮬레이터 좌표 넣고 거리 변화 확인용. prod 빌드에서는 조건 false.
        // eslint-disable-next-line no-console
        console.log(
          `[geofence] target=${target.name}(${target.lat.toFixed(5)},${target.lng.toFixed(5)}) ` +
            `here=(${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}) distance=${Math.round(distance)}m`
        );
      }
      setStatus(prev => ({ ...prev, distanceMeters: Math.round(distance) }));

      if (distance <= ARRIVAL_RADIUS_METERS) {
        // 도착 — advance + 알림. polling은 다음 effect run에서 새 target 설정.
        await presentTransitArrivalNotification({
          tripId: trip!.id,
          legIndex: trip!.currentLegIndex,
          stopName: target.name,
          language
        });
        const next = await advanceActiveTripLeg();
        onChangeRef.current(next);
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

  // trip이 없어진 직후엔 모든 알림 cleanup. (trip 종료 시점에 한 번만 실행)
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
