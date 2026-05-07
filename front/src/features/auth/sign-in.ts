import { Platform } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as KakaoLogin from "@react-native-seoul/kakao-login";
import { KAKAO_LOGIN_ENABLED } from "@env";
import { supabase } from "@lib/supabase/client";
import { mark } from "@features/auth/timing";

const GOOGLE_NATIVE_HANG_TIMEOUT_MS = 30_000;
const SUPABASE_POLL_OVERALL_TIMEOUT_MS = 12_000;
const SUPABASE_POLL_START_DELAY_MS = 600;
const SUPABASE_POLL_INTERVAL_MS = 250;
const SLOW_PATH_THRESHOLD_MS = 1_500;

export class SignInError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// ── Google ───────────────────────────────────────────────────────────────────
// Uses native Google Sign-In to mint an idToken, then hands the idToken to
// Supabase which mints its own session JWT (auth.users gets the same user
// regardless of which app — dumb or AURA — signed in first).
export async function signInWithGoogle(): Promise<void> {
  mark("start");
  await ensureGooglePlayServicesIfAndroid();
  const idToken = await acquireGoogleIdToken();
  await exchangeIdTokenWithSupabase(idToken);
}

async function ensureGooglePlayServicesIfAndroid(): Promise<void> {
  if (Platform.OS !== "android") return;
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
}

/** 네이티브 Google 모달을 열어 idToken을 받음. 시뮬레이터에서 native dialog가
 * hang하는 케이스 대응으로 timeout race. */
async function acquireGoogleIdToken(): Promise<string> {
  const response = await Promise.race([
    GoogleSignin.signIn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new SignInError(
              "GOOGLE_TIMEOUT",
              "Google 로그인이 응답하지 않아요. 다시 시도해주세요."
            )
          ),
        GOOGLE_NATIVE_HANG_TIMEOUT_MS
      )
    )
  ]);
  mark("modal-done");

  if (response.type !== "success") {
    throw new SignInError("GOOGLE_CANCELLED", "Google 로그인이 취소되었습니다.");
  }
  const idToken = response.data.idToken;
  if (!idToken) {
    throw new SignInError("GOOGLE_NO_TOKEN", "Google에서 idToken을 받지 못했습니다.");
  }
  return idToken;
}

/** Supabase로 idToken 전달해 세션 발급. RN 환경에서 SDK 후처리(AsyncStorage
 * write / lock chain)가 늦게 settle하는 hang 패턴이 있어, 네트워크 응답이
 * 도착하면 SDK 내부 state에 진입한 세션을 getSession()으로 직접 확인해 우회. */
async function exchangeIdTokenWithSupabase(idToken: string): Promise<void> {
  mark("sb-call");
  const startedAt = Date.now();

  const sdkPath = supabase.auth
    .signInWithIdToken({ provider: "google", token: idToken })
    .then(result => {
      mark("sb-resolve");
      return { kind: "sdk" as const, result };
    });

  const polledPath = (async () => {
    await new Promise<void>(r => setTimeout(r, SUPABASE_POLL_START_DELAY_MS));
    while (Date.now() - startedAt < SUPABASE_POLL_OVERALL_TIMEOUT_MS) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        mark("sb-polled");
        return { kind: "polled" as const, session: data.session };
      }
      await new Promise<void>(r => setTimeout(r, SUPABASE_POLL_INTERVAL_MS));
    }
    throw new SignInError(
      "SUPABASE_GOOGLE_TIMEOUT",
      "Supabase 응답이 너무 늦어요. 다시 시도해주세요."
    );
  })();

  const winner = await Promise.race([sdkPath, polledPath]);
  const elapsed = Date.now() - startedAt;
  if (elapsed > SLOW_PATH_THRESHOLD_MS) {
    console.log(
      `[auth] signIn slow path — ${elapsed}ms via ${winner.kind}. SDK 후처리 지연.`
    );
  }

  if (winner.kind === "sdk" && winner.result.error) {
    throw new SignInError("SUPABASE_GOOGLE_FAILED", winner.result.error.message);
  }
}

// ── Kakao ────────────────────────────────────────────────────────────────────
// Kakao SDK opens KakaoTalk (or web fallback) → returns access token.
// Supabase Auth → Kakao provider must be configured with the same Kakao app.
// Note: idToken is only available if "OpenID Connect 활성화" is enabled in
// Kakao Developers; otherwise fall back to oauth flow via Supabase if you
// configure a redirect URL.
export async function signInWithKakao(): Promise<void> {
  const result = await KakaoLogin.login();

  // The newer Kakao SDK returns idToken when OpenID Connect is on.
  const idToken = (result as { idToken?: string }).idToken;
  if (!idToken) {
    throw new SignInError(
      "KAKAO_NO_ID_TOKEN",
      "Kakao OpenID Connect를 활성화한 뒤 다시 시도해주세요."
    );
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "kakao",
    token: idToken
  });

  if (error) {
    throw new SignInError("SUPABASE_KAKAO_FAILED", error.message);
  }
}

// ── Phone OTP ────────────────────────────────────────────────────────────────
// Two-step: request OTP → verify OTP. The phone number must be E.164 format
// (e.g. +821012345678).
export async function requestPhoneOtp(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalized,
    options: { channel: "sms" }
  });
  if (error) {
    throw new SignInError("PHONE_OTP_REQUEST_FAILED", error.message);
  }
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<void> {
  const normalized = normalizePhone(phone);
  const { error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token,
    type: "sms"
  });
  if (error) {
    throw new SignInError("PHONE_OTP_VERIFY_FAILED", error.message);
  }
}

// ── Email + Password (Dumb account import) ───────────────────────────────────
export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new SignInError("EMAIL_SIGN_IN_FAILED", error.message);
  }
}

// ── Sign out ─────────────────────────────────────────────────────────────────
export async function signOutEverywhere(): Promise<void> {
  await supabase.auth.signOut().catch(() => undefined);
  await GoogleSignin.signOut().catch(() => undefined);
  // Kakao SDK가 초기화되지 않은 상태에서 logout 호출하면 native segfault.
  // initializeKakaoSDK는 KAKAO_LOGIN_ENABLED=true일 때만 실행된다.
  if (KAKAO_LOGIN_ENABLED === "true") {
    await KakaoLogin.logout().catch(() => undefined);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/\s|-/g, "");
  // Assume Korean local number if it begins with 0
  if (/^0\d{9,10}$/.test(trimmed)) return `+82${trimmed.slice(1)}`;
  return trimmed.replace(/\s|-/g, "");
}

export function isGoogleCancelError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = (error as { code?: string }).code;
  return code === statusCodes.SIGN_IN_CANCELLED;
}

export function isGooglePlayServicesError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return (error as { code?: string }).code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE;
}
