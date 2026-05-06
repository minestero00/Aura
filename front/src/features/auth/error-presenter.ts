import { Alert } from "react-native";
import { ApiError } from "@lib/api/client";

interface PresentOptions {
  /** Where this error happened — used as Alert title prefix. e.g. "세션 복원", "로그인". */
  contextLabel?: string;
  /** Optional callback when user taps "다시 시도" in actionable errors. */
  onRetry?: () => void;
}

/**
 * Show a friendly Korean alert for auth-related failures.
 * Categorises by HTTP status, ApiError code, and network error patterns.
 * Always includes a brief detail line so 운영자가 진단할 수 있도록 한다.
 */
export function presentLoginError(error: unknown, opts: PresentOptions = {}) {
  const contextLabel = opts.contextLabel ?? "로그인";

  if (error instanceof ApiError) {
    const detailReason = extractDetailReason(error.details);
    const detailLine = detailReason ? `\n\n상세: ${detailReason}` : "";

    if (error.status === 401) {
      Alert.alert(
        "세션이 만료되었어요",
        `${contextLabel} 중 인증이 만료되었어요. 다시 로그인해주세요.${detailLine}`
      );
      return;
    }
    if (error.status === 403) {
      Alert.alert(
        "접근 권한이 없어요",
        `${contextLabel} 권한이 부족해요. 관리자에게 문의해주세요.${detailLine}`
      );
      return;
    }
    if (error.status === 429) {
      Alert.alert(
        "요청이 너무 많아요",
        `${contextLabel} 요청이 잠깐 제한됐어요. 잠시 후 다시 시도해주세요.${detailLine}`
      );
      return;
    }
    if (error.status >= 500) {
      Alert.alert(
        "서버에 일시적 문제가 있어요",
        `${contextLabel} 중 서버 응답에 문제가 있어요. 잠시 후 다시 시도해주세요.${detailLine}`
      );
      return;
    }
    Alert.alert(`${contextLabel} 오류`, `${error.message}${detailLine}`);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (isNetworkErrorMessage(message)) {
    Alert.alert(
      "서버에 연결할 수 없어요",
      `네트워크 또는 서버 상태를 확인해주세요.\n\n상세: ${message}`
    );
    return;
  }

  Alert.alert(
    `${contextLabel} 중 문제가 발생했어요`,
    `잠시 후 다시 시도해주세요.\n\n상세: ${message}`
  );
}

function isNetworkErrorMessage(message: string): boolean {
  return /network|fetch|timed? ?out|connection|refused|aborted/i.test(message);
}

function extractDetailReason(details: unknown): string | null {
  if (details && typeof details === "object" && "reason" in details) {
    const reason = (details as { reason?: unknown }).reason;
    if (typeof reason === "string" && reason.length > 0) {
      return reason;
    }
  }
  return null;
}
