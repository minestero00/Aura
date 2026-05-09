import { Platform } from "react-native";
import PushNotificationIOS from "@react-native-community/push-notification-ios";

const ARRIVAL_NOTIFICATION_PREFIX = "aura-transit-arrival";

/**
 * 위치 기반 정류장 도착 알림. iOS local notification — fireDate 미설정 →
 * 즉시 표시. id에 tripId+legIndex가 포함돼 동일 leg 중복 발사를 방지.
 *
 * Android 대응은 추후(현재 daily-brief notification도 iOS-only).
 */
export async function presentTransitArrivalNotification(input: {
  tripId: string;
  legIndex: number;
  stopName: string;
  language: "ko" | "en";
  type?: "transit-arrival" | "destination";
}) {
  if (Platform.OS !== "ios") return;

  const granted = await new Promise<boolean>(resolve => {
    PushNotificationIOS.checkPermissions(permissions => {
      resolve(Boolean(permissions.alert || permissions.badge || permissions.sound));
    });
  });
  if (!granted) {
    // 권한 없을 때 silent 무시 — banner UI에서 hint로 안내.
    return;
  }

  const type = input.type ?? "transit-arrival";
  const id = `${ARRIVAL_NOTIFICATION_PREFIX}-${input.tripId}-${input.legIndex}`;
  const copy =
    input.language === "ko"
      ? type === "destination"
        ? {
            title: "AURA 도착 알림",
            body: `${input.stopName}에 거의 도착했어요. 조심히 도착하셨나요?`
          }
        : { title: "AURA 도착 알림", body: `${input.stopName} 근처에 도착했습니다.` }
      : type === "destination"
        ? {
            title: "AURA arrival",
            body: `Approaching ${input.stopName}. Did you arrive safely?`
          }
        : { title: "AURA arrival", body: `Approaching ${input.stopName}.` };

  PushNotificationIOS.addNotificationRequest({
    id,
    title: copy.title,
    body: copy.body,
    fireDate: new Date(Date.now() + 500),
    userInfo: { type, tripId: input.tripId, legIndex: input.legIndex }
  });
}

/** trip 종료 시 해당 trip의 모든 도착 알림을 cleanup. */
export function cancelTransitArrivalNotifications(tripId: string, legCount: number) {
  if (Platform.OS !== "ios") return;
  const ids = Array.from(
    { length: legCount },
    (_, i) => `${ARRIVAL_NOTIFICATION_PREFIX}-${tripId}-${i}`
  );
  PushNotificationIOS.removePendingNotificationRequests(ids);
}

/** transit 알림 권한 요청. ClientActiveTripBanner 첫 mount 시 호출. */
export async function ensureTransitNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  const result = await PushNotificationIOS.requestPermissions({
    alert: true,
    badge: true,
    sound: true
  });
  return Boolean(result.alert || result.badge || result.sound);
}
