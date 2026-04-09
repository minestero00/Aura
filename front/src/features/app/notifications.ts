import { Platform } from "react-native";
import PushNotificationIOS, {
  type PushNotification
} from "@react-native-community/push-notification-ios";
import type { AppLanguage } from "@features/app/i18n";

const DAILY_BRIEF_NOTIFICATION_ID = "aura-daily-briefing";
const DAILY_BRIEF_TYPE = "daily-briefing";

export interface DailyBriefNotificationStatus {
  enabled: boolean;
  permissionGranted: boolean;
}

function getNextNineAM() {
  return getNextBriefDate("09:00:00");
}

function getNextBriefDate(time: string) {
  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function buildCopy(language: AppLanguage) {
  if (language === "ko") {
    return {
      title: "Aura",
      body: "오늘의 브리핑이 도착했습니다"
    };
  }

  return {
    title: "Aura",
    body: "Today's briefing is ready"
  };
}

function isDailyBriefNotification(notification: PushNotification | null) {
  if (!notification) {
    return false;
  }

  return notification.getData().type === DAILY_BRIEF_TYPE;
}

export async function scheduleDailyBriefingNotification(language: AppLanguage, time = "09:00:00") {
  if (Platform.OS !== "ios") {
    return false;
  }

  const permissions = await PushNotificationIOS.requestPermissions({
    alert: true,
    badge: true,
    sound: true
  });

  const permissionGranted = Boolean(permissions.alert || permissions.badge || permissions.sound);

  if (!permissionGranted) {
    return false;
  }

  PushNotificationIOS.removePendingNotificationRequests([DAILY_BRIEF_NOTIFICATION_ID]);

  const copy = buildCopy(language);

  PushNotificationIOS.addNotificationRequest({
    id: DAILY_BRIEF_NOTIFICATION_ID,
    title: copy.title,
    body: copy.body,
    fireDate: getNextBriefDate(time),
    repeats: true,
    repeatsComponent: {
      hour: true,
      minute: true
    },
    userInfo: {
      type: DAILY_BRIEF_TYPE
    }
  });

  return true;
}

export function cancelDailyBriefingNotification() {
  if (Platform.OS !== "ios") {
    return;
  }

  PushNotificationIOS.removePendingNotificationRequests([DAILY_BRIEF_NOTIFICATION_ID]);
}

export async function getDailyBriefNotificationStatus(): Promise<DailyBriefNotificationStatus> {
  if (Platform.OS !== "ios") {
    return {
      enabled: false,
      permissionGranted: false
    };
  }

  const permissionGranted = await new Promise<boolean>(resolve => {
    PushNotificationIOS.checkPermissions(permissions => {
      resolve(Boolean(permissions.alert || permissions.badge || permissions.sound));
    });
  });

  const enabled = await new Promise<boolean>(resolve => {
    PushNotificationIOS.getPendingNotificationRequests(requests => {
      resolve(requests.some(request => request.id === DAILY_BRIEF_NOTIFICATION_ID));
    });
  });

  return {
    enabled,
    permissionGranted
  };
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
