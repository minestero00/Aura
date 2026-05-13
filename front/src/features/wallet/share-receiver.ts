import { NativeEventEmitter, NativeModules, Platform } from "react-native";

/**
 * iOS Share Extension(AuraCouponShare) — 외부 앱에서 이미지를 AURA로 공유 시
 * App Group(group.com.dumbteam.aura)에 적재된 pending payload를 RN에 전달.
 *
 * 사용 패턴:
 * - app launch 시 fetchPendingShare() 1회 호출 (cold start로 깨어난 경우)
 * - subscribeToShare(handler) 등록 — 앱이 foreground일 때 새 share 도착 이벤트
 *
 * Android는 추후 별도 module 추가 시 같은 API surface로 통합.
 */

export interface SharePayload {
  kind: "image" | "text";
  /** App Group temp file (file://...). Native OCR이 이 path를 읽는다. */
  imagePath?: string;
  /** UI 미리보기 + createCoupon codeImageBase64에 사용. */
  imageBase64?: string;
  imageMime?: string;
  text?: string;
}

const NativeShareReceiver: {
  fetchPending?: () => Promise<SharePayload | null>;
} = NativeModules.AuraShareReceiver ?? {};

const emitter =
  Platform.OS === "ios" && NativeModules.AuraShareReceiver
    ? new NativeEventEmitter(NativeModules.AuraShareReceiver)
    : null;

export async function fetchPendingShare(): Promise<SharePayload | null> {
  if (!NativeShareReceiver.fetchPending) return null;
  try {
    const result = await NativeShareReceiver.fetchPending();
    return result ?? null;
  } catch {
    return null;
  }
}

export function subscribeToShare(handler: (payload: SharePayload) => void): () => void {
  if (!emitter) return () => undefined;
  const subscription = emitter.addListener("onShareReceived", handler);
  return () => subscription.remove();
}
