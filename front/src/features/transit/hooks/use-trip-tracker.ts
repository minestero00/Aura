import { useEffect, useRef, useState } from "react";
import Geolocation from "@react-native-community/geolocation";
import { Alert, AppState, PermissionsAndroid, Platform } from "react-native";
import { endTrip as endTripApi, pingTrip } from "@features/transit/api";
import type { TransitPingResult, TransitTrip } from "@features/transit/types";

interface TripTrackerInput {
  trip: TransitTrip | null;
  pollingIntervalMs?: number;
  closeRangeIntervalMs?: number;
  closeRangeStops?: number;
  onUpdate?: (result: TransitPingResult) => void;
  onArrived?: (result: TransitPingResult) => void;
  onError?: (error: Error) => void;
}

export interface TripTrackerState {
  isTracking: boolean;
  permissionGranted: boolean;
  lastResult: TransitPingResult | null;
  error: Error | null;
  stop: (reason?: "cancelled" | "arrived") => Promise<void>;
}

const DEFAULT_INTERVAL = 30_000;
const CLOSE_RANGE_INTERVAL = 60_000;
const CLOSE_RANGE_STOPS = 2;

async function ensureBackgroundLocation() {
  if (Platform.OS === "android") {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (fine !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
    if (Platform.Version >= 29) {
      const bg = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      );
      return bg === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  return new Promise<boolean>(resolve => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false)
    );
  });
}

function readLocationOnce(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { timeout: 8_000, enableHighAccuracy: true, maximumAge: 5_000 }
    );
  });
}

export function useTripTracker(input: TripTrackerInput): TripTrackerState {
  const {
    trip,
    pollingIntervalMs = DEFAULT_INTERVAL,
    closeRangeIntervalMs = CLOSE_RANGE_INTERVAL,
    closeRangeStops = CLOSE_RANGE_STOPS
  } = input;

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastResult, setLastResult] = useState<TransitPingResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const tripIdRef = useRef<string | null>(null);
  const pollingMsRef = useRef(pollingIntervalMs);

  function clearTick() {
    if (tickRef.current) {
      clearTimeout(tickRef.current);
      tickRef.current = null;
    }
  }

  async function pingOnce() {
    const tripId = tripIdRef.current;
    if (!tripId) {
      return;
    }
    const location = await readLocationOnce();
    if (!location) {
      return;
    }
    try {
      const result = await pingTrip(tripId, location);
      if (!isMountedRef.current) return;
      setLastResult(result);
      input.onUpdate?.(result);
      if (result.trip.status === "arrived") {
        clearTick();
        input.onArrived?.(result);
        return;
      }
      if (
        typeof result.remainingStops === "number" &&
        result.remainingStops <= closeRangeStops
      ) {
        pollingMsRef.current = closeRangeIntervalMs;
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (!isMountedRef.current) return;
      setError(err);
      input.onError?.(err);
    }
  }

  function scheduleNext() {
    clearTick();
    tickRef.current = setTimeout(async () => {
      await pingOnce();
      if (isMountedRef.current && tripIdRef.current) {
        scheduleNext();
      }
    }, pollingMsRef.current);
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTick();
    };
  }, []);

  useEffect(() => {
    tripIdRef.current = trip?.id ?? null;
    pollingMsRef.current = pollingIntervalMs;

    if (!trip || trip.status !== "active") {
      clearTick();
      return;
    }

    let cancelled = false;
    (async () => {
      const granted = await ensureBackgroundLocation();
      if (!isMountedRef.current || cancelled) return;
      setPermissionGranted(granted);
      if (!granted) {
        Alert.alert("위치 권한 필요", "도착 알림을 보내려면 위치 권한이 필요합니다.");
        return;
      }
      await pingOnce();
      if (!isMountedRef.current || cancelled) return;
      scheduleNext();
    })();

    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") {
        void pingOnce();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
      clearTick();
    };
  }, [trip?.id, trip?.status, pollingIntervalMs, closeRangeIntervalMs, closeRangeStops]);

  async function stop(reason: "cancelled" | "arrived" = "cancelled") {
    clearTick();
    const tripId = tripIdRef.current;
    tripIdRef.current = null;
    if (!tripId) return;
    try {
      await endTripApi(tripId, reason);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      input.onError?.(err);
    }
  }

  return {
    isTracking: tripIdRef.current !== null,
    permissionGranted,
    lastResult,
    error,
    stop
  };
}
