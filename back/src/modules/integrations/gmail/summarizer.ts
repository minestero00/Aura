import { createAnthropicJsonSummary } from "../../../lib/ai/anthropic.js";
import { config } from "../../../config/env.js";
import { usageService } from "../../usage/service.js";
import type { GmailMessageLabel, GmailMessageSummary, GmailReplyContext } from "./gmail-api.js";

function containsHangul(value: string) {
  return /[가-힣]/.test(value);
}

/**
 * "Name <email>" → "Name", "User via Service <email>" → "Service".
 * headline에 발신자 표시할 때 길고 시끄러운 이메일 부분을 제거하기 위함.
 */
function shortSenderName(from: string): string {
  let name = from.replace(/\s*<[^>]+>\s*$/, "").trim();
  name = name.replace(/^["']|["']$/g, "").trim();
  const viaMatch = name.match(/\bvia\s+(.+)$/i);
  if (viaMatch) name = viaMatch[1].trim();
  if (name.length > 20) name = `${name.slice(0, 18).trim()}…`;
  return name || from;
}

interface MessageLabelEntry {
  id: string;
  label: GmailMessageLabel;
}

interface GmailDigest {
  headline: string;
  bullets: string[];
  labels?: MessageLabelEntry[];
}

const VALID_LABELS: ReadonlySet<GmailMessageLabel> = new Set([
  "needs_reply",
  "info",
  "promo",
  "social"
]);

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function buildFallbackDigest(messages: GmailMessageSummary[], language: "en" | "ko"): GmailDigest {
  const senders = Array.from(new Set(messages.map(message => shortSenderName(message.from)))).slice(0, 3);

  if (language === "ko") {
    return {
      headline:
        messages.length > 0
          ? `${senders.join(", ")} 메일 ${messages.length}건`
          : "중요한 메일이 없습니다",
      bullets: messages.slice(0, 3).map(message => {
        const subject = truncate(message.subject.trim(), 28);
        return subject || "메일 1건";
      })
    };
  }

  return {
    headline:
      messages.length > 0
        ? `${senders.join(", ")} — ${messages.length} emails`
        : "No recent emails found",
    bullets: messages.slice(0, 3).map(message => {
      return truncate(message.subject.trim(), 40) || "1 email";
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
    maxTokens: 400,
    system:
      language === "ko"
        ? "당신은 사용자의 메일을 모바일용으로 한국어 요약하고 자동 분류한다. headline, bullets, labels 세 키를 가진 strict JSON만 반환하라.\n- headline: 30자 이내. 발신자 핵심 이름 2~3개를 쉼표로 잇고 \"메일 N건\" 형태. 이메일 주소(`<...>`)는 절대 포함하지 마라. 예: \"Google, TestFlight, SoundCloud 메일 8건\".\n- bullets: 가장 중요한 내용만 2~3개. 각 bullet은 반드시 20자 이내 짧은 한국어 문장. snippet을 그대로 복사하지 말고 핵심 행동/상황만 추출. 예: \"비밀번호 재설정 필요\", \"오늘 오후 2시 미팅\", \"결제 완료\".\n- labels: 입력된 모든 메일에 대해 [{id, label}] 배열. label은 정확히 다음 4가지 중 하나: \"needs_reply\"(즉답이 필요한 개인 요청/질문), \"info\"(정보성 알림/뉴스레터/일정), \"promo\"(광고/프로모션), \"social\"(SNS 알림/커뮤니티)."
        : "You summarize a user's emails for a mobile assistant and auto-classify each. Return strict JSON with keys headline, bullets, and labels.\n- headline: under 40 chars. Join 2~3 short sender names with commas and add \"— N emails\". Never include email addresses (`<...>`). Example: \"Google, TestFlight, SoundCloud — 8 emails\".\n- bullets: 2~3 bullets, each under 40 chars. Extract key action/event only — never copy raw snippet text. Examples: \"Password reset needed\", \"Meeting at 2pm today\", \"Payment confirmed\".\n- labels: array of {id, label} for every input message. label must be exactly one of \"needs_reply\" (personal questions/requests needing a reply), \"info\" (informational/newsletter/agenda), \"promo\" (marketing/ads), \"social\" (social network notifications).",
    payload: messages.map(message => ({
      responseLanguage: language,
      id: message.id,
      from: shortSenderName(message.from),
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

  // LLM이 prompt 무시하고 긴 발신자 주소 그대로 넣는 케이스 가드.
  // 60자 초과 또는 `<email>` 포함 시 fallback headline으로 강제 교체.
  if (parsed.headline.length > 60 || /<[^>]+@[^>]+>/.test(parsed.headline)) {
    parsed.headline = fallback.headline;
  }

  if (language === "ko") {
    const combined = `${parsed.headline}\n${parsed.bullets.join("\n")}`;
    if (!containsHangul(combined)) {
      return buildFallbackDigest(messages, language);
    }
  }

  // labels — Anthropic이 보낸 [{id, label}] 검증 후 그대로 둠. 잘못된 label은 "info"로 fallback.
  const safeLabels: MessageLabelEntry[] | undefined = Array.isArray(parsed.labels)
    ? parsed.labels.flatMap(entry => {
        if (!entry || typeof entry.id !== "string") return [];
        const label = VALID_LABELS.has(entry.label as GmailMessageLabel)
          ? (entry.label as GmailMessageLabel)
          : "info";
        return [{ id: entry.id, label }];
      })
    : undefined;

  return {
    headline: parsed.headline,
    bullets: parsed.bullets.slice(0, 3).map(b => truncate(String(b), 40)),
    labels: safeLabels
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

export interface ExtractedCalendarEvent {
  hasEnoughInfo: boolean;
  title: string;
  startsAt: string | null; // ISO 8601 (timezone 포함). null이면 미확정.
  endsAt: string | null;
  location: string | null;
  allDay: boolean;
  details: string | null;
}

const EMPTY_EVENT: ExtractedCalendarEvent = {
  hasEnoughInfo: false,
  title: "",
  startsAt: null,
  endsAt: null,
  location: null,
  allDay: false,
  details: null
};

/**
 * Gmail 메시지 본문에서 일정(약속/회의/예약/항공편 등)을 추출. 정보 불충분이면
 * hasEnoughInfo=false 반환 — frontend가 modal에서 알림.
 */
export async function extractCalendarEventFromMessage(input: {
  subject: string;
  from: string;
  body: string;
  receivedAt: string | null;
  language: "en" | "ko";
  userId?: string;
  timezone: string;
}): Promise<ExtractedCalendarEvent> {
  const result = await createAnthropicJsonSummary<ExtractedCalendarEvent>({
    maxTokens: 380,
    system:
      input.language === "ko"
        ? "당신은 이메일에서 캘린더에 추가할 일정을 추출한다. 일정이 명확하면 hasEnoughInfo=true, 그렇지 않으면 false. startsAt/endsAt은 ISO 8601 (시간대 오프셋 포함). 종일 일정이면 allDay=true 이고 시간 부분은 사용자 timezone 자정으로 두라. 추출 못하면 빈 문자열/null. 모든 텍스트는 한국어."
        : "Extract a single calendar event from the email if any. Set hasEnoughInfo=true only when both date and time (or all-day) are clearly known. startsAt/endsAt as ISO 8601 with timezone. Use user's timezone for all-day. If unknown, leave empty string/null.",
    payload: {
      responseLanguage: input.language,
      userTimezone: input.timezone,
      receivedAt: input.receivedAt,
      from: input.from,
      subject: input.subject,
      body: input.body,
      schemaHint: {
        hasEnoughInfo: "boolean",
        title: "short event title",
        startsAt: "ISO 8601 string or null",
        endsAt: "ISO 8601 string or null",
        location: "string or null",
        allDay: "boolean",
        details: "1~2 sentence summary in the same language as responseLanguage"
      }
    },
    fallback: EMPTY_EVENT
  });

  if (input.userId && result.usage) {
    await usageService.recordModelUsage({
      userId: input.userId,
      feature: "email_summary",
      ...result.usage
    });
  }

  const parsed = result.data ?? EMPTY_EVENT;
  return {
    hasEnoughInfo: Boolean(parsed.hasEnoughInfo),
    title: typeof parsed.title === "string" ? parsed.title.slice(0, 200) : "",
    startsAt: typeof parsed.startsAt === "string" && parsed.startsAt ? parsed.startsAt : null,
    endsAt: typeof parsed.endsAt === "string" && parsed.endsAt ? parsed.endsAt : null,
    location: typeof parsed.location === "string" && parsed.location ? parsed.location : null,
    allDay: Boolean(parsed.allDay),
    details: typeof parsed.details === "string" && parsed.details ? parsed.details.slice(0, 600) : null
  };
}
