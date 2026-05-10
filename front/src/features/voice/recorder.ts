// 음성 녹음(Whisper STT) — 일시 비활성.
//
// 시도한 라이브러리:
// - react-native-audio-recorder-player v4 — react-native-nitro-modules 의존 (Android build 실패)
// - react-native-audio-recorder-player v3 — RN 0.84의 ReactContextBaseJavaModule API 변경으로
//   `currentActivity` / `applicationContext` reference 못 찾음 (kotlin compile fail).
//
// 추후 옵션:
// - patch-package로 v3 라이브러리 fix (currentActivity → reactApplicationContext.currentActivity)
// - 다른 라이브러리 (react-native-audio-record 등) 검토
// - 자체 native module 구현 (가장 robust, 시간 소모 큼)
//
// 현재는 stub — start() 호출 시 throw → ask-screen에서 voicePermissionDenied / voiceFailed toast.

export type VoiceState = "idle" | "recording" | "transcribing";

class VoiceRecorderStub {
  async ensurePermission(): Promise<boolean> {
    return false;
  }

  async start(): Promise<void> {
    throw new Error("Voice recording is temporarily unavailable.");
  }

  async stopAndTranscribe(_language: "ko" | "en"): Promise<string> {
    throw new Error("Voice recording is temporarily unavailable.");
  }

  async cancel(): Promise<void> {
    // no-op
  }
}

export const voiceRecorder = new VoiceRecorderStub();
