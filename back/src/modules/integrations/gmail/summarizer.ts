import { createAnthropicJsonSummary } from "../../../lib/ai/anthropic.js";
import { config } from "../../../config/env.js";
import { usageService } from "../../usage/service.js";
import type { GmailMessageSummary, GmailReplyContext } from "./gmail-api.js";

function containsHangul(value: string) {
  return /[가-힣]/.test(value);
}

interface GmailDigest {
  headline: string;
  bullets: string[];
}

function buildFallbackDigest(messages: GmailMessageSummary[], language: "en" | "ko"): GmailDigest {
  const senders = Array.from(new Set(messages.map(message => message.from))).slice(0, 3);

  if (language === "ko") {
    return {
      headline:
        messages.length > 0
          ? `${senders.join(", ")} 관련 중요한 메일 ${messages.length}건`
          : "중요한 메일이 없습니다",
      bullets: messages.slice(0, 3).map(message => {
        const snippet = message.snippet.trim();
        return `${message.subject}: ${snippet || "미리보기가 없습니다."}`;
      })
    };
  }

  return {
    headline:
      messages.length > 0
        ? `${messages.length} recent emails from ${senders.join(", ")}`
        : "No recent emails found",
    bullets: messages.slice(0, 3).map(message => {
      const snippet = message.snippet.trim();
      return `${message.subject} — ${snippet || "No preview available."}`;
    })
  };
}

export async function summarizeGmailMessages(
  messages: GmailMessageSummary[],
  language: "en" | "ko",
  userId?: string
) {
  if (messages.length === 0) {
    return buildFallbackDigest(messages, language);
  }

  const fallback = buildFallbackDigest(messages, language);
  const result = await createAnthropicJsonSummary<GmailDigest>({
    model: config.anthropicModelLight || undefined,
    maxTokens: 250,
    system:
      language === "ko"
        ? "당신은 사용자의 메일을 모바일용으로 한국어 요약한다. headline 과 bullets 키를 가진 strict JSON만 반환하라. 가장 중요한 내용만 2~3개의 짧은 bullet로 정리하고, 일정, 요청, 회신 필요 여부를 우선하라. 모든 문장은 반드시 자연스러운 한국어 한글로 작성하고 영어 문장으로 답하지 마라."
        : "You summarize a user's emails for a mobile assistant. Return strict JSON with keys headline and bullets. Focus on urgency, commitments, and important senders. Keep only 2 to 3 short bullets.",
    payload: messages.map(message => ({
      responseLanguage: language,
      from: message.from,
      subject: message.subject,
      receivedAt: message.receivedAt,
      snippet: message.snippet
    })),
    fallback
  });

  if (userId && result.usage) {
    await usageService.recordModelUsage({
      userId,
      feature: "email_summary",
      ...result.usage
    });
  }

  const parsed = result.data;

  if (!parsed.headline || !Array.isArray(parsed.bullets)) {
    return buildFallbackDigest(messages, language);
  }

  if (language === "ko") {
    const combined = `${parsed.headline}\n${parsed.bullets.join("\n")}`;
    if (!containsHangul(combined)) {
      return buildFallbackDigest(messages, language);
    }
  }

  return {
    headline: parsed.headline,
    bullets: parsed.bullets.slice(0, 3)
  };
}

interface GmailReplyDraft {
  subject: string;
  body: string;
}

function buildFallbackReplyDraft(context: GmailReplyContext, language: "en" | "ko"): GmailReplyDraft {
  if (language === "ko") {
    return {
      subject: context.subject.toLowerCase().startsWith("re:") ? context.subject : `Re: ${context.subject}`,
      body: `안녕하세요,\n\n메일 확인했습니다. 보내주신 내용을 검토했고 곧 다시 답변드리겠습니다.\n\n감사합니다.`
    };
  }

  return {
    subject: context.subject.toLowerCase().startsWith("re:") ? context.subject : `Re: ${context.subject}`,
    body: "Hi,\n\nThanks for your email. I reviewed your message and will follow up shortly.\n\nBest,"
  };
}

export async function generateReplyDraft(
  context: GmailReplyContext,
  language: "en" | "ko",
  userId?: string
) {
  const fallback = buildFallbackReplyDraft(context, language);
  const result = await createAnthropicJsonSummary<GmailReplyDraft>({
    maxTokens: 220,
    system:
      language === "ko"
        ? "당신은 이메일 답장 초안을 한국어로 작성한다. subject 와 body 키를 가진 strict JSON만 반환하라. 공손하고 간결하게, 3~5문장 이내로 실제 회신 가능한 문장만 작성하라. 모든 문장은 한국어 한글로 작성하라."
        : "You write a concise email reply draft. Return strict JSON with keys subject and body. Keep it polite, practical, and within 3 to 5 sentences.",
    payload: {
      responseLanguage: language,
      from: context.from,
      subject: context.subject,
      snippet: context.snippet
    },
    fallback
  });

  if (userId && result.usage) {
    await usageService.recordModelUsage({
      userId,
      feature: "email_summary",
      ...result.usage
    });
  }

  const parsed = result.data;

  if (!parsed.subject || !parsed.body) {
    return fallback;
  }

  if (language === "ko" && !containsHangul(`${parsed.subject}\n${parsed.body}`)) {
    return fallback;
  }

  return parsed;
}
