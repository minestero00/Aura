import { NativeModules, Platform } from "react-native";
import { postDailyHealth } from "./api";

interface NativeAuraHealth {
  /** 어제 자정~오늘 자정(local) 사이 누적 데이터를 OS Health store에서 읽어 반환.
      미구현/권한 거부면 모두 null. */
  readYesterday: () => Promise<{
    sleepMinutes: number | null;
    steps: number | null;
    avgHrBpm: number | null;
  }>;
  /** OS Settings로 권한 화면 열기. iOS HealthKit / Android Health Connect 각각 native 구현. */
  requestPermission: () => Promise<boolean>;
}

const moduleHandle: NativeAuraHealth | undefined =
  Platform.OS === "android" || Platform.OS === "ios"
    ? (NativeModules.AuraHealth as NativeAuraHealth | undefined)
    : undefined;

function yesterdayLocalDate(): string {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // ISO local — Intl.DateTimeFormat en-CA로 YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/**
 * 매일 morning brief 직전 호출. native module이 없거나(미구현) 권한 거부면 silent skip.
 * Daily brief의 톤 조절(수면 부족 시 "오늘은 가볍게")에 사용 — backend prompt 통합은
 * 별도 단계 (G.2.x).
 */
export async function syncYesterdayHealth(): Promise<boolean> {
  if (!moduleHandle) return false;
  try {
    const data = await moduleHandle.readYesterday();
    // 모두 null이면 의미 없는 row 만들지 않음.
    if (data.sleepMinutes == null && data.steps == null && data.avgHrBpm == null) {
      return false;
    }
    await postDailyHealth({
      date: yesterdayLocalDate(),
      sleepMinutes: data.sleepMinutes,
      steps: data.steps,
      avgHrBpm: data.avgHrBpm
    });
    return true;
  } catch {
    return false;
  }
}

export async function requestHealthPermission(): Promise<boolean> {
  if (!moduleHandle) return false;
  try {
    return await moduleHandle.requestPermission();
  } catch {
    return false;
  }
}
