import { createAnthropicJsonSummary } from "../../lib/ai/anthropic.js";
import { usageService } from "../usage/service.js";
import type { MeetingNote } from "./repository.js";

/**
 * 회의록 본문(markdown) + 원본 자막을 Anthropic에 보내서
 * - 한 줄 요약
 * - action items (담당자/내용/기한)
 * - 결정 사항
 * - 다음 단계
 * 를 추출. JSON으로 받아 markdown으로 재조립.
 *
 * 비용: Sonnet 입력 $3/MTok, 출력 $15/MTok. 평균 회의 1건당 ~$0.05 예상.
 * usage feature key: `meeting_summarize` — 일일 한도 강제.
 */

interface SummarizeResult {
  summary: string;
  actionItems: Array<{ owner: string; task: string; due: string }>;
  decisions: string[];
  nextSteps: string[];
}

const FALLBACK: SummarizeResult = {
  summary: "",
  actionItems: [],
  decisions: [],
  nextSteps: [],
};

const SYSTEM_PROMPT = `당신은 회의록 요약 전문가입니다. 다음 JSON 스키마로만 응답하세요. 다른 텍스트 추가 금지.

{
  "summary": "회의 핵심을 1-2문장으로",
  "actionItems": [{ "owner": "담당자명 또는 빈 문자열", "task": "구체적 행동", "due": "기한 또는 빈 문자열" }],
  "decisions": ["결정된 사항 한 줄씩"],
  "nextSteps": ["다음 회의/단계 한 줄씩"]
}

규칙:
- 추측 금지. 본문/자막에 명시된 내용만 추출.
- actionItems는 동사로 시작하는 구체 행동 ("X 검토" 같은 모호 표현 X)
- 빈 결과면 배열 빈 채로 반환 (decisions: [], 등)
- 한국어 입력은 한국어로, 영어 입력은 영어로 응답`;

export async function summarizeMeetingNote(
  userId: string,
  note: MeetingNote,
): Promise<{ markdown: string; result: SummarizeResult; tokensUsed: number }> {
  // 사용량 가드 — Anthropic call 전에 무조건.
  await usageService.consumeOrThrow({ userId, feature: "meeting_summarize" });

  const payload = {
    title: note.title,
    body: note.body,
    transcript: note.rawTranscript ?? "",
  };

  const { data, usage } = await createAnthropicJsonSummary<SummarizeResult>({
    maxTokens: 1500,
    system: SYSTEM_PROMPT,
    payload,
    fallback: FALLBACK,
  });

  // 호출 비용 기록 (best-effort, 실패해도 사용자 응답 진행)
  if (usage) {
    void usageService.recordModelUsage({
      userId,
      feature: "meeting_summarize",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: usage.costUsd,
      latencyMs: usage.latencyMs,
    }).catch(() => undefined);
  }

  return {
    markdown: assembleMarkdown(data),
    result: data,
    tokensUsed: usage ? usage.inputTokens + usage.outputTokens : 0,
  };
}

function assembleMarkdown(r: SummarizeResult): string {
  const lines: string[] = [];

  if (r.summary) {
    lines.push("## 요약", "", r.summary, "");
  }

  if (r.decisions.length > 0) {
    lines.push("## 결정 사항", "");
    for (const d of r.decisions) lines.push(`- ${d}`);
    lines.push("");
  }

  if (r.actionItems.length > 0) {
    lines.push("## 액션 아이템", "");
    lines.push("| 담당자 | 내용 | 마감 |", "|--------|------|------|");
    for (const a of r.actionItems) lines.push(`| ${a.owner || "—"} | ${a.task} | ${a.due || "—"} |`);
    lines.push("");
  }

  if (r.nextSteps.length > 0) {
    lines.push("## 다음 단계", "");
    for (const s of r.nextSteps) lines.push(`- ${s}`);
    lines.push("");
  }

  return lines.join("\n").trim();
}
