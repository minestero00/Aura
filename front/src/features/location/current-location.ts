import Geolocation from "@react-native-community/geolocation";
import { PermissionsAndroid, Platform } from "react-native";

export interface DeviceLocation {
  lat: number;
  lng: number;
}

/**
 * 위치를 가져오는 시도의 결과.
 * - ok: 좌표 확보.
 * - permission-denied: 사용자가 예전에 거부했거나 현재 거부 상태(iOS는 한 번
 *   거부하면 in-app 다이얼로그 못 띄움 → Settings 진입 안내가 유일).
 * - unavailable: 권한은 있지만 현재 좌표 못 잡음(시뮬레이터 좌표 미설정,
 *   GPS 신호 없음 등).
 */
export type LocationResult =
  | { kind: "ok"; lat: number; lng: number }
  | { kind: "permission-denied" }
  | { kind: "unavailable" };

const PERMISSION_RESPONSE_TIMEOUT_MS = 5_000;
const POSITION_TOTAL_TIMEOUT_MS = 10_000;

// iOS Geolocation error code 1 = PERMISSION_DENIED (W3C standard).
const ERR_PERMISSION_DENIED = 1;

async function requestAndroidLocationPermission(): Promise<"granted" | "denied"> {
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  return result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied";
}

/**
 * iOS의 `Geolocation.requestAuthorization`이 callback을 부르지 않고 Promise가
 * 영영 settle 안 되는 이슈 방어 — timeout race로 보완.
 */
async function ensureLocationPermission(): Promise<"granted" | "denied" | "unknown"> {
  if (Platform.OS === "android") {
    return requestAndroidLocationPermission();
  }

  const sdkPath = new Promise<"granted" | "denied">(resolve => {
    Geolocation.requestAuthorization(
      () => resolve("granted"),
      () => resolve("denied")
    );
  });

  const timeoutPath = new Promise<"unknown">(resolve =>
    setTimeout(() => resolve("unknown"), PERMISSION_RESPONSE_TIMEOUT_MS)
  );

  return Promise.race([sdkPath, timeoutPath]);
}

/**
 * 현재 좌표를 가져오되 실패 사유를 명확히 분류한다. caller가 "권한 안내
 * 모달" / "재시도" / "위치 데이터 없음" 흐름을 분기할 수 있도록.
 */
export async function getCurrentDeviceLocation(): Promise<LocationResult> {
  const permission = await ensureLocationPermission();
  if (permission === "denied") {
    return { kind: "permission-denied" };
  }
  // "unknown"은 system이 응답을 안 한 케이스 — 일단 위치 시도해서 실제
  // 응답으로 분기. (자주 권한이 살아있는데 timeout만 일찍 발생하는 패턴)

  const positionPath = new Promise<LocationResult>(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          kind: "ok",
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      error => {
        if (error?.code === ERR_PERMISSION_DENIED) {
          resolve({ kind: "permission-denied" });
        } else {
          resolve({ kind: "unavailable" });
        }
      },
      {
        timeout: 8_000,
        enableHighAccuracy: false,
        maximumAge: 60_000
      }
    );
  });

  // 외부 timeout (10s) — getCurrentPosition의 timeout 옵션이 동작 안 하는
  // RN/iOS 환경 대비.
  const totalTimeoutPath = new Promise<LocationResult>(resolve =>
    setTimeout(() => resolve({ kind: "unavailable" }), POSITION_TOTAL_TIMEOUT_MS)
  );

  return Promise.race([positionPath, totalTimeoutPath]);
}
