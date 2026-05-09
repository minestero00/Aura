import { NativeEventEmitter, NativeModules, Platform } from "react-native";

interface GeofenceRegionInput {
  id: string;
  lat: number;
  lng: number;
  /** meters. iOS는 maximumRegionMonitoringDistance로 자동 clamp. */
  radius?: number;
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
  Platform.OS === "ios" ? (NativeModules.TransitGeofence as NativeTransitGeofence | undefined) : undefined;

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
