import { getCurrentDeviceLocation } from "@features/location/current-location";
import { reportDepartureLocation } from "./api";

/**
 * 위치를 backend에 보고. sign-in 직후, foreground 복귀 시 호출.
 * 권한 거부 / GPS unavailable이면 silent 종료 — 출발 알림은 작동 안 하지만 앱 정상.
 */
export async function reportCurrentLocationOnce(): Promise<void> {
  try {
    const result = await getCurrentDeviceLocation();
    if (result.kind !== "ok") return;
    await reportDepartureLocation({
      lat: result.lat,
      lng: result.lng
    });
  } catch {
    // ignore — 다음 foreground/sign-in 시 재시도.
  }
}
