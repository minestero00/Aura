import { PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';
import { registerPushDevice } from '@features/transit/api';

// Daily brief / transit / system push 토큰 등록 — 사용자 sign-in 후 1회 + token rotate 자동 갱신.
// backend는 단일 provider(FCM)로 발송하므로 platform 구분 없이 동일한 token 등록 흐름.
//
// React Native Firebase v22+ modular API 사용 (namespaced `messaging()` deprecated).
// 마이그레이션 가이드: https://rnfirebase.io/migrating-to-v22

let lastRegisteredToken: string | null = null;

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const apiLevel =
      typeof Platform.Version === 'number' ? Platform.Version : 0;
    if (apiLevel >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }
  // iOS — Firebase가 APNs 권한 요청 + APNs token forward(AppDelegate에서 처리).
  const status = await requestPermission(getMessaging());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

/**
 * sign-in 직후 1회 호출. FCM token 받아서 backend에 등록.
 * 권한 거부면 silent하게 null 반환 (사용자에겐 settings 화면 status row로 안내).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[FCM] registerForPushNotifications: start');
  }
  try {
    const granted = await ensureNotificationPermission();
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[FCM] permission granted=', granted);
    }
    if (!granted) return null;

    const messaging = getMessaging();

    // iOS: APNs token이 도착해야 FCM token 발급. AppDelegate가 forward하므로 잠시 대기 후 try.
    if (Platform.OS === 'ios') {
      await registerDeviceForRemoteMessages(messaging);
    }

    const token = await getToken(messaging);
    console.log(`[FCM] token = ${token}`);
    if (!token) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[FCM] getToken returned empty');
      }
      return null;
    }

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        `[FCM] token=${token.slice(0, 32)}... (len=${token.length}) platform=${
          Platform.OS
        }`,
      );
      // 디버깅 중에는 캐시 hit으로 backend 호출이 skip되지 않게 강제 진행.
      // 이전 세션 캐시 = ${lastRegisteredToken === token}
      console.log(
        `[FCM] cache match? ${
          token === lastRegisteredToken ? 'YES (forced re-register)' : 'NO'
        }`,
      );
    }

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[FCM] calling registerPushDevice...');
    }
    const result = await registerPushDevice({
      platform: Platform.OS as 'ios' | 'android',
      pushToken: token,
    });
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[FCM] backend register OK:', JSON.stringify(result));
    }
    lastRegisteredToken = token;
    return token;
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[FCM] register FAILED:',
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
        error instanceof Error ? error.stack : '',
      );
    }
    return null;
  }
}

/** token rotate 발생 시 backend에 재등록. sign-in 동안 active. */
export function subscribeToPushTokenRefresh(): () => void {
  try {
    return onTokenRefresh(getMessaging(), async newToken => {
      try {
        await registerPushDevice({
          platform: Platform.OS as 'ios' | 'android',
          pushToken: newToken,
        });
        lastRegisteredToken = newToken;
      } catch {
        // 다음 token rotate 또는 sign-in 시 재시도.
      }
    });
  } catch {
    return () => undefined;
  }
}
