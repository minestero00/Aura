import { Platform } from "react-native";
import PushNotificationIOS, {
  type PushNotification
} from "@react-native-community/push-notification-ios";

// Daily brief 알림은 backend cron이 FCM/APNs로 발송 (back/src/modules/briefings/push.ts).
// frontend는 더 이상 OS-scheduled local notification을 만들지 않는다 — 권한 ensure만 담당.
// 단, 사용자가 푸시를 탭해서 앱이 열린 경우의 라우팅은 여전히 frontend 책임.

const DAILY_BRIEF_TYPE = "daily-briefing";

export interface DailyBriefNotificationStatus {
  permissionGranted: boolean;
}

function isDailyBriefNotification(notification: PushNotification | null) {
  if (!notification) {
    return false;
  }
  return notification.getData().type === DAILY_BRIEF_TYPE;
}

/**
 * 알림 권한을 요청하고 부여 여부 반환. 권한이 거부 상태면 silent하게 false 반환
 * (사용자에겐 settings 화면에서 status row로 안내). iOS는 PushNotificationIOS,
 * Android는 system 권한 + post notification permission(API 33+)이 별도지만 RN의
 * Notifications 라이브러리가 처리. 현 단계는 iOS만 명시적으로 다루고 Android는
 * permission denied 상태가 아니라 가정.
 */
export async function ensureDailyBriefNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const result = await PushNotificationIOS.requestPermissions({
      alert: true,
      badge: true,
      sound: true
    });
    return Boolean(result.alert || result.badge || result.sound);
  }
  return true;
}

export async function getDailyBriefNotificationStatus(): Promise<DailyBriefNotificationStatus> {
  if (Platform.OS !== "ios") {
    return { permissionGranted: true };
  }

  const permissionGranted = await new Promise<boolean>(resolve => {
    PushNotificationIOS.checkPermissions(permissions => {
      resolve(Boolean(permissions.alert || permissions.badge || permissions.sound));
    });
  });

  return { permissionGranted };
}

export async function getInitialDailyBriefOpen() {
  if (Platform.OS !== "ios") {
    return false;
  }

  const notification = await PushNotificationIOS.getInitialNotification();
  return isDailyBriefNotification(notification);
}

export function subscribeToDailyBriefOpen(onOpen: () => void) {
  if (Platform.OS !== "ios") {
    return () => undefined;
  }

  const handleNotification = (notification: PushNotification) => {
    if (!isDailyBriefNotification(notification)) {
      return;
    }

    const isUserInteraction = notification.getData().userInteraction === 1;

    if (isUserInteraction) {
      onOpen();
    }
  };

  PushNotificationIOS.addEventListener("localNotification", handleNotification);

  return () => {
    PushNotificationIOS.removeEventListener("localNotification");
  };
}
