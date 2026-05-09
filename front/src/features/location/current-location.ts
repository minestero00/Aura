import Geolocation from "@react-native-community/geolocation";
import { PermissionsAndroid, Platform } from "react-native";

export interface DeviceLocation {
  lat: number;
  lng: number;
}

const PERMISSION_RESPONSE_TIMEOUT_MS = 5_000;
const POSITION_TOTAL_TIMEOUT_MS = 10_000;

async function requestAndroidLocationPermission() {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * iOS의 `Geolocation.requestAuthorization`이 가끔 callback을 부르지 않고
 * Promise가 영영 settle 안 되는 이슈가 있다(특히 새 시뮬레이터). UI가
 * "불러오는 중..." 상태로 stuck되지 않도록 timeout race를 둔다.
 */
async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    return requestAndroidLocationPermission();
  }

  const sdkPath = new Promise<boolean>(resolve => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false)
    );
  });

  const timeoutPath = new Promise<boolean>(resolve =>
    setTimeout(() => resolve(false), PERMISSION_RESPONSE_TIMEOUT_MS)
  );

  return Promise.race([sdkPath, timeoutPath]);
}

export async function getCurrentDeviceLocation(): Promise<DeviceLocation | null> {
  const granted = await ensureLocationPermission();
  if (!granted) {
    return null;
  }

  const positionPath = new Promise<DeviceLocation | null>(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        resolve(null);
      },
      {
        timeout: 8_000,
        enableHighAccuracy: false,
        maximumAge: 60_000
      }
    );
  });

  // 한 번 더 외부 timeout(10s)으로 둘러싼다 — getCurrentPosition의 timeout
  // 옵션이 동작하지 않는 RN/iOS 환경 대비.
  const totalTimeoutPath = new Promise<DeviceLocation | null>(resolve =>
    setTimeout(() => resolve(null), POSITION_TOTAL_TIMEOUT_MS)
  );

  return Promise.race([positionPath, totalTimeoutPath]);
}
