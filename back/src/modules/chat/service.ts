import { createAnthropicJsonSummary, streamAnthropicText } from "../../lib/ai/anthropic.js";
import { requireUser } from "../auth/guards.js";
import { briefingsService } from "../briefings/service.js";
import { usageService } from "../usage/service.js";
import { chatRepository } from "./repository.js";
import type { ChatCitation, ChatReply } from "./types.js";

interface ChatModelOutput {
  answer: string;
  citations: ChatCitation[];
}

function buildFallbackAnswer(
  _question: string,
  language: "en" | "ko",
  emailHeadline: string | null,
  newsHeadline: string | null
) {
  if (language === "ko") {
    const contextLines = [
      emailHeadline ? `오늘 메일 핵심: ${emailHeadline}` : null,
      newsHeadline ? `오늘 뉴스 핵심: ${newsHeadline}` : null
    ].filter(Boolean);

    const message =
      "잠시 답변을 가져오지 못했어요. 잠시 후 다시 질문해주세요." +
      (contextLines.length ? `\n\n참고로 ${contextLines.join(" / ")}` : "");

    return {
      answer: message,
      citations: [] as ChatCitation[]
    };
  }

  const contextLines = [
    emailHeadline ? `Today's mail: ${emailHeadline}` : null,
    newsHeadline ? `Today's news: ${newsHeadline}` : null
  ].filter(Boolean);

  const message =
    "I couldn't generate an answer right now. Please try again in a moment." +
    (contextLines.length ? `\n\nFor reference — ${contextLines.join(" / ")}` : "");

  return {
    answer: message,
    citations: [] as ChatCitation[]
  };
}

function sanitizeAnswer(answer: string, question: string) {
  const normalizedAnswer = answer.trim();
  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    return normalizedAnswer;
  }

  const escapedQuestion = normalizedQuestion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const questionPrefixPattern = new RegExp(`^${escapedQuestion}[\\s\\S]*?\\n+`, "i");

  if (questionPrefixPattern.test(normalizedAnswer)) {
    return normalizedAnswer.replace(questionPrefixPattern, "").trim() || normalizedAnswer;
  }

  if (normalizedAnswer.toLowerCase().startsWith(normalizedQuestion.toLowerCase())) {
    return normalizedAnswer.slice(normalizedQuestion.length).trimStart();
  }

  return normalizedAnswer;
}

function sanitizeCitations(citations: ChatCitation[]) {
  return citations
    .filter(
      citation =>
        (citation.type === "news" || citation.type === "mail" || citation.type === "briefing") &&
        Boolean(citation.title?.trim())
    )
    .slice(0, 4)
    .map(citation => ({
      type: citation.type,
      title: citation.title.trim(),
      url: citation.url
    }));
}

export const chatService = {
  async ask(userId: string, input: { message: string; language: "en" | "ko"; sessionId?: string }) {
    requireUser(userId);

    const sessionId = await chatRepository.ensureSession(userId, input.sessionId);
    const recentMessages = await chatRepository.listRecentMessages(userId, sessionId, 8);

    const dailyBrief = await briefingsService.getDailyBrief(userId, input.language);
    const emailDigest = dailyBrief.snapshot.email.digest;
    const newsBriefing = dailyBrief.snapshot.news.briefing;
    const topEmailMessages = dailyBrief.snapshot.email.messages.slice(0, 4);
    const topNews = dailyBrief.snapshot.news.articles.slice(0, 4);
    const fallback = buildFallbackAnswer(
      input.message,
      input.language,
      emailDigest?.headline ?? null,
      newsBriefing?.headline ?? null
    );

    const cachedDailyBrief = {
      emailDigest,
      newsBriefing,
      topEmailMessages: topEmailMessages.map(message => ({
        from: message.from,
        subject: message.subject,
        snippet: message.snippet
      })),
      topNews: topNews.map(article => ({
        title: article.title,
        source: article.source,
        category: article.category,
        link: article.link
      }))
    };

    const result = await createAnthropicJsonSummary<ChatModelOutput>({
      maxTokens: 500,
      system:
        input.language === "ko"
          ? "당신은 사용자의 일일 브리핑 앱 안에서 동작하는 개인 비서다. 답변은 반드시 한국어로, 3~6문장 안에서 핵심만 말하라. 사용자의 질문 문장을 반복하거나 그대로 재출력하지 말고 답변만 작성하라. JSON 객체만 반환하고 키는 answer, citations를 사용한다. citations는 근거 항목 배열이며 각 항목은 type(news|mail|briefing), title, url(옵션) 구조를 따른다."
          : "You are a personal assistant inside a daily briefing app. Reply in concise English within 3 to 6 sentences. Do not repeat or restate the user's question; provide answer-only output. Return JSON only with keys answer and citations. citations must be an array of objects using type(news|mail|briefing), title, and optional url.",
      cachedPayload: { dailyBrief: cachedDailyBrief },
      payload: {
        language: input.language,
        question: input.message,
        history: recentMessages.map(message => ({
          role: message.role,
          content: message.content
        }))
      },
      fallback
    });

    if (result.usage) {
      await usageService.recordModelUsage({
        userId,
        feature: "chat",
        ...result.usage
      });
    }

    const parsed = result.data;
    const answer = sanitizeAnswer(parsed.answer?.trim() || fallback.answer, input.message);
    const citations = sanitizeCitations(parsed.citations ?? fallback.citations);

    const userMessage = await chatRepository.addMessage(userId, sessionId, "user", input.message, []);
    const assistantMessage = await chatRepository.addMessage(
      userId,
      sessionId,
      "assistant",
      answer,
      citations
    );
    const recent = await chatRepository.listRecentMessages(userId, sessionId, 20);
    const messages = [userMessage, assistantMessage, ...recent]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .filter((message, index, array) => array.findIndex(item => item.id === message.id) === index);

    return {
      sessionId,
      answer: assistantMessage.content,
      citations,
      messages
    } satisfies ChatReply;
  },

  async streamReply(
    userId: string,
    input: { message: string; language: "en" | "ko"; sessionId?: string },
    handlers: {
      onDelta: (text: string) => void;
      onMeta: (meta: { sessionId: string }) => void;
      onComplete: (final: { answer: string; citations: ChatCitation[] }) => void;
      onError: (error: Error) => void;
    }
  ) {
    requireUser(userId);

    const sessionId = await chatRepository.ensureSession(userId, input.sessionId);
    handlers.onMeta({ sessionId });

    const recentMessages = await chatRepository.listRecentMessages(userId, sessionId, 8);
    const dailyBrief = await briefingsService.getDailyBrief(userId, input.language);
    const emailDigest = dailyBrief.snapshot.email.digest;
    const newsBriefing = dailyBrief.snapshot.news.briefing;
    const topEmailMessages = dailyBrief.snapshot.email.messages.slice(0, 4);
    const topNews = dailyBrief.snapshot.news.articles.slice(0, 4);

    const system =
      input.language === "ko"
        ? "당신은 사용자의 일일 브리핑 앱 안에서 동작하는 개인 비서다. 답변은 반드시 한국어로 3~6문장 안에서 핵심만 말하라. 사용자의 질문 문장을 반복하거나 그대로 재출력하지 말고 답변만 작성하라. 답변 본문 외에 메타데이터/JSON은 출력하지 마라."
        : "You are a personal assistant inside a daily briefing app. Reply in concise English within 3 to 6 sentences. Do not repeat or restate the user's question; provide answer-only output. Do not include metadata or JSON.";

    const cachedDailyBriefStream = JSON.stringify({
      dailyBrief: {
        emailDigest,
        newsBriefing,
        topEmailMessages: topEmailMessages.map(m => ({
          from: m.from,
          subject: m.subject,
          snippet: m.snippet
        })),
        topNews: topNews.map(article => ({
          title: article.title,
          source: article.source,
          category: article.category,
          link: article.link
        }))
      }
    });

    const freshTurnPayload = JSON.stringify({
      language: input.language,
      question: input.message,
      history: recentMessages.map(m => ({ role: m.role, content: m.content }))
    });

    const userPersisted = await chatRepository.addMessage(userId, sessionId, "user", input.message, []);

    let usage: Awaited<ReturnType<typeof streamAnthropicText>>["usage"] = null;
    let fullText = "";
    try {
      const result = await streamAnthropicText(
        {
          maxTokens: 500,
          system,
          userMessage: { cached: cachedDailyBriefStream, fresh: freshTurnPayload }
        },
        {
          onTextDelta: delta => {
            fullText += delta;
            handlers.onDelta(delta);
          },
          onError: handlers.onError
        }
      );
      usage = result.usage;
    } catch (error) {
      handlers.onError(error instanceof Error ? error : new Error(String(error)));
    }

    if (usage) {
      await usageService.recordModelUsage({
        userId,
        feature: "chat",
        ...usage
      });
    }

    const finalAnswer = sanitizeAnswer(fullText.trim() || "", input.message);
    if (!finalAnswer) {
      const fallback = buildFallbackAnswer(
        input.message,
        input.language,
        emailDigest?.headline ?? null,
        newsBriefing?.headline ?? null
      );
      handlers.onComplete({ answer: fallback.answer, citations: fallback.citations });
      await chatRepository.addMessage(userId, sessionId, "assistant", fallback.answer, []);
      void userPersisted;
      return;
    }

    const citations: ChatCitation[] = [];
    handlers.onComplete({ answer: finalAnswer, citations });
    await chatRepository.addMessage(userId, sessionId, "assistant", finalAnswer, citations);
    void userPersisted;
  }
};
