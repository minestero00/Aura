import { Linking, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from "react-native";

interface GeofenceRegionInput {
  id: string;
  lat: number;
  lng: number;
  /** meters. iOS는 maximumRegionMonitoringDistance로 자동 clamp. */
  radius?: number;
  /** stop 이름 — native 알림 메시지에 "{name} 근처에 도착했습니다."로 사용. */
  name?: string;
  /** "transit-arrival"(기본) | "destination" — 알림 메시지 분기에 사용. */
  type?: "transit-arrival" | "destination";
}

interface GeofenceEnterEvent {
  id: string;
}

interface GeofenceErrorEvent {
  id: string;
  message: string;
}

interface NativeTransitGeofence {
  startMonitoring(regions: GeofenceRegionInput[]): Promise<{ added: number }>;
  stopMonitoring(): Promise<void>;
  addListener?(event: string): void;
  removeListeners?(count: number): void;
}

const moduleHandle =
  Platform.OS === "ios" || Platform.OS === "android"
    ? (NativeModules.TransitGeofence as NativeTransitGeofence | undefined)
    : undefined;

const emitter = moduleHandle ? new NativeEventEmitter(moduleHandle as unknown as { addListener: (event: string) => void; removeListeners: (count: number) => void }) : null;

export function isBackgroundGeofenceAvailable(): boolean {
  return moduleHandle !== undefined;
}

/** trip 시작/leg 변경 시 호출. 기존 등록을 모두 교체. */
export async function startBackgroundMonitoring(regions: GeofenceRegionInput[]): Promise<number> {
  if (!moduleHandle) return 0;
  const result = await moduleHandle.startMonitoring(regions);
  return result.added;
}

/** trip 종료 시 호출. */
export async function stopBackgroundMonitoring(): Promise<void> {
  if (!moduleHandle) return;
  await moduleHandle.stopMonitoring();
}

/** Foreground에서 ENTER 이벤트 listen. background는 native가 알림으로 처리. */
export function subscribeBackgroundEnter(handler: (event: GeofenceEnterEvent) => void) {
  if (!emitter) return () => undefined;
  const sub = emitter.addListener("AuraTransitGeofenceEnter", (event: GeofenceEnterEvent) => {
    handler(event);
  });
  return () => sub.remove();
}

export function subscribeBackgroundError(handler: (event: GeofenceErrorEvent) => void) {
  if (!emitter) return () => undefined;
  const sub = emitter.addListener("AuraTransitGeofenceError", (event: GeofenceErrorEvent) => {
    handler(event);
  });
  return () => sub.remove();
}

export type BackgroundPermissionResult = "granted" | "denied" | "settings-needed";

/**
 * Background location 권한 요청.
 * - Android 11+ (API 30+): ACCESS_BACKGROUND_LOCATION는 in-app prompt 안 뜸 →
 *   사용자를 system Settings로 보내야 한다. fine location은 in-app으로 받음.
 * - Android 10 (API 29): system prompt로 받을 수 있음.
 * - iOS: native가 startMonitoring 시 requestAlwaysAuthorization 호출. 사용자가
 *   "When in Use" 선택했으면 in-app으로 다시 못 묻고 Settings에서만 변경 가능.
 */
export async function requestBackgroundLocationPermission(): Promise<BackgroundPermissionResult> {
  if (Platform.OS === "android") {
    try {
      const fine = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (fine !== PermissionsAndroid.RESULTS.GRANTED) return "denied";
      const apiLevel = typeof Platform.Version === "number" ? Platform.Version : 0;
      if (apiLevel < 29) return "granted";
      const bg = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      );
      if (bg === PermissionsAndroid.RESULTS.GRANTED) return "granted";
      // Android 11+: NEVER_ASK_AGAIN/DENIED 모두 settings로 보내야 변경 가능.
      return "settings-needed";
    } catch {
      return "denied";
    }
  }
  // iOS — Settings 외 in-app 변경 경로 없음.
  return "settings-needed";
}

/** OS 설정의 앱 상세 페이지 열기 — 사용자가 "Always" 선택 가능. */
export async function openLocationSettings(): Promise<void> {
  await Linking.openSettings();
}
