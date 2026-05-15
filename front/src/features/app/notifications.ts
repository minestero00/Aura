import notifee from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";

// Daily brief 알림은 backend cron이 FCM/APNs로 발송 (back/src/modules/briefings/push.ts).
// frontend는 더 이상 OS-scheduled local notification을 만들지 않는다 — 권한 ensure만 담당.
// 단, 사용자가 푸시를 탭해서 앱이 열린 경우의 라우팅은 여전히 frontend 책임.

const DAILY_BRIEF_TYPE = "daily-briefing";

export interface DailyBriefNotificationStatus {
  permissionGranted: boolean;
}

export async function ensureDailyBriefNotificationPermission(): Promise<boolean> {
  const result = await notifee.requestPermission();
  return result.authorizationStatus >= 1;
}

export async function getDailyBriefNotificationStatus(): Promise<DailyBriefNotificationStatus> {
  const settings = await notifee.getNotificationSettings();
  return { permissionGranted: settings.authorizationStatus >= 1 };
}

export async function getInitialDailyBriefOpen(): Promise<boolean> {
  const remoteMessage = await messaging().getInitialNotification();
  return remoteMessage?.data?.type === DAILY_BRIEF_TYPE;
}

export function subscribeToDailyBriefOpen(onOpen: () => void): () => void {
  return messaging().onNotificationOpenedApp(remoteMessage => {
    if (remoteMessage.data?.type === DAILY_BRIEF_TYPE) {
      onOpen();
    }
  });
}
