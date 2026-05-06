import { Platform } from "react-native";
import { API_BASE_URL_ANDROID, API_BASE_URL_IOS } from "@env";
import { getCurrentAccessToken } from "@lib/supabase/client";

export const API_BASE_URL =
  Platform.OS === "android" ? API_BASE_URL_ANDROID : API_BASE_URL_IOS;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  accessToken?: string;
  /** Per-request timeout in ms. Default 15000. Prevents hung connections from freezing UI. */
  timeoutMs?: number;
  retry?: {
    maxAttempts?: number;
    retryOn429?: boolean;
    retryOn5xx?: boolean;
    baseDelayMs?: number;
  };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken, headers, retry, timeoutMs, ...rest } = options;
  const method = (rest.method ?? "GET").toUpperCase();
  const isSafeMethod = method === "GET" || method === "HEAD";
  const maxAttempts = Math.max(1, retry?.maxAttempts ?? (isSafeMethod ? 3 : 1));
  const retryOn429 = retry?.retryOn429 ?? true;
  const retryOn5xx = retry?.retryOn5xx ?? true;
  const baseDelayMs = Math.max(100, retry?.baseDelayMs ?? 350);
  const requestTimeoutMs = timeoutMs ?? 15000;

  async function sleep(ms: number) {
    await new Promise<void>(resolve => setTimeout(() => resolve(), ms));
  }

  function jitterDelay(attempt: number) {
    const exp = Math.min(4, attempt - 1);
    const jitter = 0.8 + Math.random() * 0.4;
    return Math.round(baseDelayMs * 2 ** exp * jitter);
  }

  function parseRetryAfterSeconds(response: Response) {
    const value = response.headers.get("Retry-After");
    if (!value) {
      return null;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds;
    }
    return null;
  }

  let lastErrorPayload: unknown = null;
  let lastStatus = 0;
  let lastCode: string | undefined;
  let lastMessage = "";

  // If no explicit token provided, pull the current Supabase JWT.
  // This makes every authenticated request work with zero call-site changes.
  const tokenForRequest = accessToken ?? (await getCurrentAccessToken());

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response;

    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), requestTimeoutMs);

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        method,
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
          ...(tokenForRequest ? { Authorization: `Bearer ${tokenForRequest}` } : {}),
          ...headers
        }
      });
    } catch (error) {
      clearTimeout(timeoutHandle);
      const isAbort = error instanceof Error && error.name === "AbortError";
      if (attempt < maxAttempts && isSafeMethod && !isAbort) {
        await sleep(jitterDelay(attempt));
        continue;
      }
      if (isAbort) {
        throw new ApiError(
          `요청이 ${requestTimeoutMs}ms 안에 완료되지 않았어요.`,
          0,
          "REQUEST_TIMEOUT"
        );
      }
      throw error;
    }
    clearTimeout(timeoutHandle);

    if (response.ok) {
      if (response.status === 204) {
        return undefined as T;
      }
      return response.json() as Promise<T>;
    }

    const errorPayload = await response.json().catch(() => null);
    const message = errorPayload?.error?.message || `Request failed with status ${response.status}.`;
    const code = errorPayload?.error?.code;
    const details = errorPayload?.error?.details;
    lastErrorPayload = details;
    lastStatus = response.status;
    lastCode = code;
    lastMessage = message;

    const canRetry429 = isSafeMethod && retryOn429 && response.status === 429;
    const canRetry5xx = isSafeMethod && retryOn5xx && response.status >= 500 && response.status <= 599;

    if (attempt < maxAttempts && (canRetry429 || canRetry5xx)) {
      const retryAfterSeconds = parseRetryAfterSeconds(response);
      if (retryAfterSeconds && retryAfterSeconds > 0) {
        await sleep(retryAfterSeconds * 1000);
      } else {
        await sleep(jitterDelay(attempt));
      }
      continue;
    }

    throw new ApiError(message, response.status, code, details);
  }

  throw new ApiError(
    lastMessage || "Request failed.",
    lastStatus || 500,
    lastCode,
    lastErrorPayload
  );
}
