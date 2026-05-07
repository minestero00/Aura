import { Platform } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as KakaoLogin from "@react-native-seoul/kakao-login";
import { KAKAO_LOGIN_ENABLED } from "@env";
import { supabase } from "@lib/supabase/client";

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
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  // race 로 native dialog hang 방지. 시뮬레이터에서 GoogleSignin native flow 가
  // 가끔 응답을 안 돌려주는 케이스 대응.
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
        30_000
      )
    )
  ]);

  if (response.type !== "success") {
    throw new SignInError("GOOGLE_CANCELLED", "Google 로그인이 취소되었습니다.");
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new SignInError("GOOGLE_NO_TOKEN", "Google에서 idToken을 받지 못했습니다.");
  }

  // Supabase JS의 signInWithIdToken은 RN 환경에서 가끔 네트워크 응답을
  // 받은 뒤 내부 후처리(AsyncStorage write / lock chain)에서 promise를
  // 늦게 settle시키는 hang 패턴이 있다. 네트워크 응답이 도착하면 세션은
  // SDK 내부 state에 진입하므로 getSession()으로 직접 확인해 우회한다.
  // poll 시작 지연은 600ms — SDK가 정상 빠른 응답일 때는 race 영향 없음,
  // 느릴 때는 빠르게 fallback 진입.
  const startedAt = Date.now();
  const signInPromise = supabase.auth
    .signInWithIdToken({ provider: "google", token: idToken })
    .then(result => ({ kind: "sdk" as const, result }));

  const sessionPolledPromise = (async () => {
    await new Promise<void>(r => setTimeout(r, 600));
    while (Date.now() - startedAt < 12_000) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return { kind: "polled" as const, session: data.session };
      }
      await new Promise<void>(r => setTimeout(r, 250));
    }
    throw new SignInError(
      "SUPABASE_GOOGLE_TIMEOUT",
      "Supabase 응답이 너무 늦어요. 다시 시도해주세요."
    );
  })();

  const winner = await Promise.race([signInPromise, sessionPolledPromise]);
  const elapsed = Date.now() - startedAt;
  if (elapsed > 1_500) {
    console.warn(
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
