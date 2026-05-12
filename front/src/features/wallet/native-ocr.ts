import { NativeModules, Platform } from "react-native";

interface NativeAuraOCR {
  extractText(imagePath: string): Promise<{ lines: string[]; fullText: string }>;
  cropBarcode?(imagePath: string): Promise<{ base64: string; mime: string } | null>;
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

/**
 * 이미지에서 바코드/QR 영역만 detect → crop된 base64 반환.
 * 점원이 화면 가득한 바코드를 스캔할 수 있게. 없으면 null → frontend는 원본 fallback.
 * iOS Vision (J.3.e), Android는 후속 ML Kit barcode-scanning 도입 후.
 */
export async function cropBarcodeFromImage(imagePath: string): Promise<{ base64: string; mime: string } | null> {
  if (!moduleHandle || !moduleHandle.cropBarcode) return null;
  try {
    const result = await moduleHandle.cropBarcode(imagePath);
    if (!result || typeof result.base64 !== "string") return null;
    return { base64: result.base64, mime: result.mime || "image/png" };
  } catch {
    return null;
  }
}
