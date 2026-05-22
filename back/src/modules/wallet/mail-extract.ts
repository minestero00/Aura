import { authStore } from "../auth/store.js";
import {
  fetchRecentGmailMessages,
  fetchGmailMessageBody
} from "../integrations/gmail/gmail-api.js";
import { pushService } from "../push/service.js";
import { extractCouponFromMessage, looksLikeCoupon } from "./extractor.js";
import { walletRepository } from "./repository.js";
import { walletService } from "./service.js";
import { AppError } from "../../lib/errors/app-error.js";
import type { CodeFormat } from "./types.js";

/**
 * J.2 — 메일 자동 추출 cron.
 *
 * Flow (사용자 1명):
 * 1. Gmail 연결 + push_enabled 가드 통과 확인
 * 2. 최근 3일 inbox 메시지 N개 fetch (metadata만)
 * 3. wallet_processed_mails 비교 → 미처리만 남김
 * 4. subject+snippet 기준 looksLikeCoupon 1차 deterministic 필터
 * 5. 통과한 메일만 body fetch + LLM extractor 호출
 * 6. confidence ≥ AUTO_SAVE_THRESHOLD 그리고 code 존재 → walletService.createCoupon
 * 7. processed_mails에 결과 status 기록 (재처리 방지)
 * 8. 자동 저장 ≥1건이면 push 1건 ("쿠폰 N건이 지갑에 추가되었습니다")
 *
 * 비용: looksLikeCoupon 통과한 메일만 LLM call (~600 in + 200 out token). 일반
 * 사용자 inbox 100통 중 1-3통 매칭이라 가정 → ~$0.0006 / 사용자 / cycle.
 *
 * 안전 invariants:
 * - extractor.recordModelUsage가 wallet_extract feature로 비용 추적
 * - 메일 본문은 로그에 출력 X (PII)
 * - duplicate code는 createCoupon이 409 throw → "duplicate" 상태로 기록 (성공 카운트 X)
 * - 모든 에러는 사용자별로 isolate — 한 사용자 실패가 다른 사용자에 전파 X
 */

const AUTO_SAVE_THRESHOLD = 0.6;
const MAIL_BATCH_SIZE = 30;          // 1 cycle당 사용자별 최대 메일 수
const MAIL_QUERY = "in:inbox newer_than:3d";

interface ExtractResult {
  fetched: number;
  filtered: number;        // looksLikeCoupon 통과한 수
  llmCalled: number;       // 실제 LLM 호출 수
  saved: number;
  duplicates: number;
  lowConfidence: number;
  errors: number;
}

const EMPTY_RESULT: ExtractResult = {
  fetched: 0, filtered: 0, llmCalled: 0,
  saved: 0, duplicates: 0, lowConfidence: 0, errors: 0,
};

function resolveLanguage(timezone: string): "ko" | "en" {
  return timezone.startsWith("Asia/") ? "ko" : "en";
}

export async function extractCouponsForUser(userId: string): Promise<ExtractResult> {
  const user = authStore.findUserById(userId);
  if (!user) return EMPTY_RESULT;

  // Gmail 연결 안 됐으면 즉시 종료 — 외부 API 호출 0
  const connection = authStore.getGmailConnection(userId);
  if (!connection) return EMPTY_RESULT;

  let messages: Awaited<ReturnType<typeof fetchRecentGmailMessages>>;
  try {
    messages = await fetchRecentGmailMessages(userId, { limit: MAIL_BATCH_SIZE, query: MAIL_QUERY });
  } catch {
    // 토큰 만료 / 네트워크 실패 — silent skip (다음 cycle에서 재시도)
    return EMPTY_RESULT;
  }

  const result: ExtractResult = { ...EMPTY_RESULT, fetched: messages.length };
  if (messages.length === 0) return result;

  // 이미 처리한 메시지는 건너뛰기
  const processedIds = await walletRepository.getProcessedMailIds(userId, messages.map(m => m.id));
  const fresh = messages.filter(m => !processedIds.has(m.id));

  const language = resolveLanguage(user.timezone);

  for (const meta of fresh) {
    // 1차 필터: subject+snippet 기반 키워드 매칭. body fetch 안 함.
    if (!looksLikeCoupon({ subject: meta.subject, snippet: meta.snippet })) {
      await walletRepository.recordProcessedMail({
        userId, messageId: meta.id, status: "no_match", couponId: null,
      });
      continue;
    }
    result.filtered += 1;

    // body fetch (full content) — fetchGmailMessageBody는 {id, body, ...} 객체 반환
    let body = "";
    try {
      const full = await fetchGmailMessageBody(userId, meta.id);
      body = full.body ?? "";
    } catch {
      // body fetch 실패 — error 기록만, candidate skip
      result.errors += 1;
      await walletRepository.recordProcessedMail({
        userId, messageId: meta.id, status: "error", couponId: null,
      });
      continue;
    }

    // LLM 추출
    let extracted: Awaited<ReturnType<typeof extractCouponFromMessage>>;
    try {
      result.llmCalled += 1;
      extracted = await extractCouponFromMessage({
        subject: meta.subject,
        from: meta.from,
        body,
        receivedAt: meta.receivedAt,
        language,
        userId,
      });
    } catch (err) {
      result.errors += 1;
      console.log(JSON.stringify({
        level: "warn",
        service: "aura-worker",
        module: "wallet/mail-extract",
        message: "extract LLM call failed",
        userId,
        messageId: meta.id,
        error: err instanceof Error ? err.message : String(err),
      }));
      await walletRepository.recordProcessedMail({
        userId, messageId: meta.id, status: "error", couponId: null,
      });
      continue;
    }

    // 임계값 미달 또는 code 누락 → 자동 저장 X
    if (extracted.confidence < AUTO_SAVE_THRESHOLD || !extracted.code || !extracted.title) {
      result.lowConfidence += 1;
      await walletRepository.recordProcessedMail({
        userId, messageId: meta.id, status: "low_confidence", couponId: null,
      });
      continue;
    }

    // 자동 저장
    try {
      const coupon = await walletService.createCoupon({
        userId,
        brand: (extracted.brand ?? meta.from.split("<")[0]?.trim() ?? "Unknown").slice(0, 100),
        title: extracted.title,
        code: extracted.code,
        codeFormat: (extracted.codeFormat ?? "text_only") as CodeFormat,
        codeImagePath: null,
        codeImageBase64: null,
        expiresAt: extracted.expiresAt,
        source: "mail_auto",
        sourceRef: meta.id,
        geofence: null,
        notes: null,
      });
      result.saved += 1;
      await walletRepository.recordProcessedMail({
        userId, messageId: meta.id, status: "extracted", couponId: coupon.id,
      });
    } catch (err) {
      if (err instanceof AppError && err.code === "WALLET_DUPLICATE_CODE") {
        result.duplicates += 1;
        await walletRepository.recordProcessedMail({
          userId, messageId: meta.id, status: "duplicate", couponId: null,
        });
      } else {
        result.errors += 1;
        console.log(JSON.stringify({
          level: "warn",
          service: "aura-worker",
          module: "wallet/mail-extract",
          message: "createCoupon failed",
          userId,
          messageId: meta.id,
          error: err instanceof Error ? err.message : String(err),
        }));
        await walletRepository.recordProcessedMail({
          userId, messageId: meta.id, status: "error", couponId: null,
        });
      }
    }
  }

  // 자동 저장 ≥ 1 → bundled push 1건
  if (result.saved > 0) {
    const preferences = authStore.getPreferences(userId);
    if (preferences?.pushEnabled !== false) {
      const lang = language;
      const title = lang === "ko" ? `쿠폰 ${result.saved}건이 지갑에 추가되었습니다` : `${result.saved} coupons added to your wallet`;
      const body  = lang === "ko" ? "메일에서 자동으로 정리했어요. 지갑에서 확인하세요." : "Auto-imported from your inbox. Check your wallet.";
      await pushService.sendToUser(userId, {
        title,
        body,
        category: "wallet_mail_extract",
        data: { type: "wallet-mail-extract", count: result.saved },
      }).catch(() => undefined);
    }
  }

  return result;
}

export async function extractCouponsForAllUsers(): Promise<void> {
  await authStore.refreshActiveUsersFromDb().catch(error => {
    console.log(JSON.stringify({
      level: "warn",
      service: "aura-worker",
      module: "wallet/mail-extract",
      message: "refreshActiveUsersFromDb failed",
      error: error instanceof Error ? error.message : String(error),
    }));
  });

  const users = authStore.listUsers();
  let totalSaved = 0;
  let totalLlmCalls = 0;
  let usersWithSaves = 0;

  for (const user of users) {
    try {
      const r = await extractCouponsForUser(user.id);
      totalSaved += r.saved;
      totalLlmCalls += r.llmCalled;
      if (r.saved > 0) usersWithSaves += 1;
    } catch (error) {
      console.log(JSON.stringify({
        level: "warn",
        service: "aura-worker",
        module: "wallet/mail-extract",
        message: "extractCouponsForUser threw",
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  // 30일 지난 processed_mails 정리 (cycle 1회당 1번)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  await walletRepository.purgeOldProcessedMails(cutoff).catch(() => undefined);

  if (totalLlmCalls > 0 || totalSaved > 0) {
    console.log(JSON.stringify({
      level: "info",
      service: "aura-worker",
      module: "wallet/mail-extract",
      message: "cycle done",
      users: users.length,
      llmCalls: totalLlmCalls,
      saved: totalSaved,
      usersWithSaves,
    }));
  }
}
