import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyBriefSnapshot } from "@features/briefings/types";

/**
 * 사용자/언어별 daily brief 스냅샷을 AsyncStorage에 캐시.
 * 같은 날짜(local YYYY-MM-DD)면 cold launch 시 네트워크 호출 없이 재사용.
 * 사용자가 수동 새로고침 버튼을 누르면 force refresh — 백엔드 호출 + 캐시 갱신.
 *
 * 백엔드 자체 캐시(briefings/service.ts: today's snapshot 재사용)와 함께 동작 —
 * 클라가 네트워크 round-trip조차 생략한다.
 */

const KEY_PREFIX = "aura.dailyBrief";

interface CachedDailyBrief {
  snapshot: DailyBriefSnapshot;
  /** 캐시 작성 시점의 local YYYY-MM-DD (디바이스 로컬 자정 기준 day 매칭). */
  localDay: string;
  savedAt: string;
}

function makeKey(userId: string, language: "ko" | "en") {
  return `${KEY_PREFIX}.${userId}.${language}`;
}

function todayLocalDay(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function loadCachedDailyBrief(
  userId: string,
  language: "ko" | "en"
): Promise<DailyBriefSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(makeKey(userId, language));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDailyBrief;
    if (parsed.localDay !== todayLocalDay()) return null;
    return parsed.snapshot;
  } catch {
    return null;
  }
}

export async function saveDailyBriefCache(
  userId: string,
  language: "ko" | "en",
  snapshot: DailyBriefSnapshot
): Promise<void> {
  try {
    const payload: CachedDailyBrief = {
      snapshot,
      localDay: todayLocalDay(),
      savedAt: new Date().toISOString()
    };
    await AsyncStorage.setItem(makeKey(userId, language), JSON.stringify(payload));
  } catch {
    // best-effort — 실패해도 무시
  }
}

export async function clearDailyBriefCache(userId: string, language: "ko" | "en"): Promise<void> {
  try {
    await AsyncStorage.removeItem(makeKey(userId, language));
  } catch {
    // ignore
  }
}
