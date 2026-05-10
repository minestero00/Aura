import { Platform } from "react-native";
import { API_BASE_URL } from "@lib/api/client";
import { getCurrentAccessToken } from "@lib/supabase/client";

interface TranscribeResponse {
  ok: true;
  text: string;
  durationSeconds: number | null;
}

/**
 * apiRequest는 JSON body 가정이라 multipart 직접 fetch.
 * file path → FormData → POST /api/v1/voice/transcribe.
 */
export async function transcribeAudioFile(input: {
  filePath: string;
  language?: "ko" | "en";
}): Promise<TranscribeResponse> {
  const accessToken = await getCurrentAccessToken();
  if (!accessToken) {
    throw new Error("No access token available");
  }

  const formData = new FormData();
  // file path는 RN audio recorder가 반환하는 file:// URI. iOS는 m4a, Android는 mp4(m4a).
  // FormData가 RN에서 file URI를 그대로 받으면 자동 multipart 처리.
  const fileName = Platform.OS === "ios" ? "audio.m4a" : "audio.mp4";
  const fileType = Platform.OS === "ios" ? "audio/m4a" : "audio/mp4";
  formData.append("audio", {
    uri: input.filePath,
    name: fileName,
    type: fileType
  } as unknown as Blob);
  if (input.language) {
    formData.append("language", input.language);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/voice/transcribe`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Transcribe failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return (await response.json()) as TranscribeResponse;
}
