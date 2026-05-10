import { PermissionsAndroid, Platform } from "react-native";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import { transcribeAudioFile } from "./api";

export type VoiceState = "idle" | "recording" | "transcribing";

// react-native-audio-recorder-player v4는 default export가 singleton instance라
// new로 생성 안 함.
class VoiceRecorder {
  private player = AudioRecorderPlayer;
  private currentPath: string | null = null;
  private isActive = false;

  async ensurePermission(): Promise<boolean> {
    if (Platform.OS !== "android") {
      // iOS — 첫 record 시 OS가 마이크 권한 요청. 별도 prompt 불필요.
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  async start(): Promise<void> {
    if (this.isActive) return;
    const ok = await this.ensurePermission();
    if (!ok) {
      throw new Error("Microphone permission denied");
    }
    this.isActive = true;
    // path를 undefined로 두면 라이브러리가 OS 캐시 디렉토리에 m4a 파일 생성.
    const path = await this.player.startRecorder();
    this.currentPath = path;
  }

  async stopAndTranscribe(language: "ko" | "en"): Promise<string> {
    if (!this.isActive) return "";
    let path: string | null = this.currentPath;
    try {
      const result = await this.player.stopRecorder();
      path = path ?? result;
    } finally {
      this.player.removeRecordBackListener();
      this.isActive = false;
    }
    if (!path) {
      throw new Error("Recording produced no file");
    }
    const response = await transcribeAudioFile({ filePath: path, language });
    return response.text;
  }

  async cancel(): Promise<void> {
    if (!this.isActive) return;
    try {
      await this.player.stopRecorder();
    } catch {
      // ignore
    } finally {
      this.player.removeRecordBackListener();
      this.isActive = false;
      this.currentPath = null;
    }
  }
}

export const voiceRecorder = new VoiceRecorder();
