import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DirectionsOption } from "./types";

const ACTIVE_TRIP_KEY = "aura.transit.activeTrip";

/**
 * Client-driven transit trip 상태. 서버에 ping/저장하지 않고 device의
 * AsyncStorage에만 유지. iOS Region Monitoring(Step 5+)이 leg 도착마다
 * currentLegIndex를 갱신해 진행 추적.
 */
export interface ActiveTripState {
  /** 클라이언트가 생성한 uuid (앱 재시작/OS 깨움 시 trip 식별용) */
  id: string;
  /** 사용자가 검색에 입력한 목적지 텍스트("광운대학교") */
  destinationLabel: string;
  /** ISO timestamp */
  startedAt: string;
  /** Directions API로 받은 경로의 leg 배열 — 그대로 보존 */
  legs: DirectionsOption["legs"];
  /** 현재 진행 중인 leg index (0부터). geofence ENTER 시 += 1. */
  currentLegIndex: number;
}

function generateTripId() {
  // 외부 uuid 의존 없이 충돌 가능성 매우 낮은 random id.
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `trip-${time}-${rand}`;
}

export function createActiveTripFromOption(
  option: DirectionsOption,
  destinationLabel: string
): ActiveTripState {
  return {
    id: generateTripId(),
    destinationLabel,
    startedAt: new Date().toISOString(),
    legs: option.legs,
    currentLegIndex: 0
  };
}

export async function loadActiveTrip(): Promise<ActiveTripState | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TRIP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTripState;
    if (!parsed || typeof parsed.id !== "string" || !Array.isArray(parsed.legs)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveActiveTrip(state: ActiveTripState): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(state));
}

export async function clearActiveTrip(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_TRIP_KEY);
}

/** geofence ENTER로 다음 leg로 넘어갔을 때 호출. 마지막 leg면 자동 정리. */
export async function advanceActiveTripLeg(): Promise<ActiveTripState | null> {
  const current = await loadActiveTrip();
  if (!current) return null;
  const nextIndex = current.currentLegIndex + 1;
  if (nextIndex >= current.legs.length) {
    await clearActiveTrip();
    return null;
  }
  const next: ActiveTripState = { ...current, currentLegIndex: nextIndex };
  await saveActiveTrip(next);
  return next;
}
