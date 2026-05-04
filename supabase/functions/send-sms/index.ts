/**
 * Supabase Send SMS Hook → Solapi (Coolsms 후속)
 *
 * Supabase Auth가 Phone OTP를 보낼 때마다 이 함수를 호출합니다.
 * payload.user.phone 으로 코드를 발송한 뒤 200을 돌려주면 Supabase는
 * 자체 OTP 저장 / 검증 / auth.users.phone 채우기 / JWT 발급을 처리합니다.
 *
 * 인증: standard-webhooks signature (Supabase Auth가 자동으로 추가).
 *   - Header: webhook-id, webhook-timestamp, webhook-signature
 *   - signature = base64(HMAC-SHA256(secret, "{id}.{timestamp}.{rawBody}"))
 *
 * 환경변수 (Supabase Dashboard → Functions → send-sms → Secrets):
 *   SOLAPI_API_KEY
 *   SOLAPI_API_SECRET
 *   SMS_SENDER             (예: 01012345678 — 발신번호로 사전 등록 필요)
 *   SEND_SMS_HOOK_SECRET   (Auth Hook 활성화 시 표시되는 v1,whsec_... 문자열)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const SOLAPI_API_KEY = Deno.env.get("SOLAPI_API_KEY") ?? "";
const SOLAPI_API_SECRET = Deno.env.get("SOLAPI_API_SECRET") ?? "";
const SMS_SENDER = Deno.env.get("SMS_SENDER") ?? "";
const HOOK_SECRET_RAW = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";

const SOLAPI_ENDPOINT = "https://api.solapi.com/messages/v4/send";
const TIMESTAMP_TOLERANCE_S = 5 * 60;

interface SendSmsHookPayload {
  user: { id: string; phone?: string; email?: string };
  sms: { otp: string };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function buildSolapiAuthorization(): string {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", SOLAPI_API_SECRET)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}

function normalizePhoneForSolapi(phone: string): string {
  // Solapi expects domestic Korean format: 01012345678 (no plus, no dashes)
  const trimmed = phone.replace(/[\s-]/g, "");
  if (trimmed.startsWith("+82")) return "0" + trimmed.slice(3);
  if (trimmed.startsWith("82")) return "0" + trimmed.slice(2);
  return trimmed;
}

/**
 * Verifies a standard-webhooks payload (the format Supabase Auth Hooks emit).
 * Throws on any failure; returns true on success.
 */
function verifyStandardWebhook(rawBody: string, headers: Headers, hookSecretRaw: string) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");

  if (!id || !timestamp || !signatureHeader) {
    throw new Error("missing webhook-id / webhook-timestamp / webhook-signature");
  }

  // Check timestamp tolerance (replay protection)
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) throw new Error("invalid timestamp");
  const nowS = Math.floor(Date.now() / 1000);
  if (Math.abs(nowS - tsNum) > TIMESTAMP_TOLERANCE_S) {
    throw new Error("timestamp outside tolerance window");
  }

  // Strip "v1,whsec_" prefix and base64-decode the secret
  const base64Secret = hookSecretRaw.replace(/^v1,whsec_/, "");
  const secretBytes = Buffer.from(base64Secret, "base64");
  if (secretBytes.length === 0) throw new Error("invalid hook secret");

  // Compute expected signature
  const toSign = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(toSign).digest("base64");

  // Header may contain multiple "v1,sig v2,sig ..." — Supabase uses v1
  const provided = signatureHeader
    .split(" ")
    .map(part => part.trim())
    .filter(part => part.startsWith("v1,"))
    .map(part => part.slice(3));

  for (const candidate of provided) {
    const a = Buffer.from(candidate, "base64");
    const b = Buffer.from(expected, "base64");
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true;
    }
  }
  throw new Error("signature mismatch");
}

Deno.serve(async (req) => {
  try {
    if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SMS_SENDER) {
      console.error("send-sms: missing Solapi env (SOLAPI_API_KEY/SECRET/SENDER)");
      return jsonResponse({ error: "configuration_missing" }, 500);
    }
    if (!HOOK_SECRET_RAW) {
      console.error("send-sms: missing SEND_SMS_HOOK_SECRET");
      return jsonResponse({ error: "configuration_missing" }, 500);
    }

    const rawBody = await req.text();

    try {
      verifyStandardWebhook(rawBody, req.headers, HOOK_SECRET_RAW);
    } catch (verifyErr) {
      console.error("send-sms: signature verification failed", verifyErr);
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const payload = JSON.parse(rawBody) as SendSmsHookPayload;
    const phone = payload.user?.phone;
    const otp = payload.sms?.otp;
    if (!phone || !otp) {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    const message = {
      message: {
        to: normalizePhoneForSolapi(phone),
        from: SMS_SENDER,
        text: `[AURA] 인증번호 ${otp} (10분 안에 입력해주세요)`
      }
    };

    const response = await fetch(SOLAPI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: buildSolapiAuthorization(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("send-sms: solapi rejected", { status: response.status, result });
      return jsonResponse({ error: "sms_send_failed", details: result }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("send-sms: unhandled error", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
