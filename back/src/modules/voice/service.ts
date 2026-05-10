import { config } from "../../config/env.js";
import { AppError } from "../../lib/errors/app-error.js";
import { usageService } from "../usage/service.js";

const WHISPER_TIMEOUT_MS = 30_000;
const WHISPER_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

interface TranscribeInput {
  userId: string;
  audio: Buffer;
  mimeType: string;
  /** ISO 639-1 (e.g. "ko", "en"). 미지정 시 Whisper가 자동 감지. */
  language?: string;
  /** 디버깅/로그용 파일 이름. */
  filename?: string;
}

export async function transcribeAudio(input: TranscribeInput): Promise<{ text: string; durationSeconds: number | null }> {
  if (!config.openaiApiKey) {
    throw new AppError(503, "VOICE_UNCONFIGURED", "OPENAI_API_KEY is not configured.");
  }

  // 사용량 가드 — 음성 입력이 비싸서 일별 한도 강제. usage feature 키 voice_transcribe.
  await usageService.consumeOrThrow({ userId: input.userId, feature: "voice_transcribe" });

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(input.audio)], { type: input.mimeType });
  formData.append("file", blob, input.filename ?? "audio.m4a");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  if (input.language) {
    formData.append("language", input.language);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WHISPER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(WHISPER_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${config.openaiApiKey}`
      },
      body: formData
    });
  } catch (error) {
    throw new AppError(502, "VOICE_TRANSCRIBE_FAILED", "Failed to reach Whisper API.", {
      reason: error instanceof Error ? error.message : String(error)
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AppError(502, "VOICE_TRANSCRIBE_FAILED", "Whisper returned an error.", {
      status: response.status,
      body: body.slice(0, 500)
    });
  }

  const payload = (await response.json()) as { text?: string; duration?: number };
  return {
    text: typeof payload.text === "string" ? payload.text.trim() : "",
    durationSeconds: typeof payload.duration === "number" ? payload.duration : null
  };
}
