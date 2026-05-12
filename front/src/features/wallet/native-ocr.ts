import { NativeModules, Platform } from "react-native";

interface NativeAuraOCR {
  extractText(imagePath: string): Promise<{ lines: string[]; fullText: string }>;
}

const moduleHandle =
  Platform.OS === "ios" || Platform.OS === "android"
    ? (NativeModules.AuraOCR as NativeAuraOCR | undefined)
    : undefined;

export function isNativeOcrAvailable(): boolean {
  return moduleHandle !== undefined;
}

export interface OcrResult {
  lines: string[];
  fullText: string;
}

/**
 * On-device OCR — iOS Vision (J.3.a) / Android ML Kit Korean (J.3.b).
 * Native module이 등록 안 됐으면 null 반환 (silent skip, health 패턴).
 *
 * 이미지/추출 텍스트는 외부 서버로 가지 않음. 정형화(brand/title/expires)는
 * J.3.d backend LLM 호출에서 처리 — 그 때는 raw text만 전달.
 */
export async function extractTextFromImage(imagePath: string): Promise<OcrResult | null> {
  if (!moduleHandle) return null;
  try {
    const result = await moduleHandle.extractText(imagePath);
    return {
      lines: Array.isArray(result.lines) ? result.lines : [],
      fullText: typeof result.fullText === "string" ? result.fullText : ""
    };
  } catch {
    return null;
  }
}
