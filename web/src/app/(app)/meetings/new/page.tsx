"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

const TEMPLATES = [
  { id: "general",    label: "일반 회의",   desc: "목적·논의·결정·액션아이템" },
  { id: "standup",    label: "스탠드업",    desc: "어제·오늘·블로커" },
  { id: "one_on_one", label: "1:1 미팅",    desc: "근황·피드백·다음 목표" },
  { id: "customer",   label: "고객 미팅",   desc: "요구사항·다음 단계" },
  { id: "project",    label: "프로젝트",    desc: "현황·이슈·액션아이템" }
];

const TEMPLATE_BODY: Record<string, string> = {
  general: `## 목적\n\n## 주요 논의\n\n## 결정 사항\n\n## 액션 아이템\n| 담당자 | 내용 | 마감 |\n|--------|------|------|\n| | | |\n\n## 다음 회의`,
  standup: `## 어제\n\n## 오늘\n\n## 블로커`,
  one_on_one: `## 근황\n\n## 진행 중인 업무\n\n## 피드백\n\n## 다음까지 할 것`,
  customer: `## 고객 요구사항\n\n## 논의된 내용\n\n## 다음 단계\n| 담당 | 내용 | 기한 |\n|------|------|------|\n| | | |\n\n## 후속 발송 내용`,
  project: `## 현황 요약\n\n## 이슈 / 리스크\n\n## 결정 사항\n\n## 액션 아이템\n| 담당자 | 내용 | 마감 |\n|--------|------|------|\n| | | |`
};

type Step = "setup" | "recording";

export default function NewMeetingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [step, setStep] = useState<Step>("setup");
  const [title, setTitle] = useState("회의 제목");
  const [templateId, setTemplateId] = useState("general");
  const [body, setBody] = useState(TEMPLATE_BODY["general"]!);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const startRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Load event details if eventId provided
  useEffect(() => {
    if (!eventId) return;
    api.get<{ title: string }>(`/calendar/events/${eventId}`)
      .then(ev => { if (ev.title) setTitle(ev.title); })
      .catch(() => undefined);
  }, [eventId]);

  // Timer
  useEffect(() => {
    if (recording) {
      startRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const fmtElapsed = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    setBody(TEMPLATE_BODY[id] ?? "");
  };

  const startRecording = useCallback(() => {
    setStep("recording");
    setRecording(true);
    // STT 구현 예정: getDisplayMedia + Whisper API 스트리밍
  }, []);

  const toggleRecording = () => setRecording(r => !r);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const note = await api.post<{ id: string }>("/business/meetings", {
        title,
        body,
        rawTranscript: transcript.join("\n"),
        templateId,
        eventId: eventId ?? undefined
      });
      router.push(`/meetings/${note.id}?summarize=1`);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  if (step === "setup") {
    return (
      <div className="h-full overflow-auto flex items-start justify-center pt-8 px-4">
        <div className="w-full max-w-lg space-y-5">
          {/* Title */}
          <div>
            <h1 className="text-[18px] font-bold mb-0.5" style={{ color: "var(--text)" }}>새 회의 시작</h1>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>제목과 템플릿을 선택하면 바로 시작합니다</p>
          </div>

          {/* Meeting title input */}
          <div>
            <label className="text-[12px] font-semibold block mb-1.5" style={{ color: "var(--text-2)" }}>회의 제목</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="회의 제목을 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-[10px] text-[14px] outline-none transition-all"
              style={{
                background: "var(--surface)",
                border: "1.5px solid var(--line-strong)",
                color: "var(--text)"
              }}
              onFocus={e => (e.target.style.borderColor = "var(--aurora)")}
              onBlur={e => (e.target.style.borderColor = "var(--line-strong)")}
            />
          </div>

          {/* Template selection */}
          <div>
            <label className="text-[12px] font-semibold block mb-1.5" style={{ color: "var(--text-2)" }}>회의록 템플릿</label>
            <div className="space-y-1.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] border text-left transition-all"
                  style={{
                    background: templateId === t.id ? "var(--aurora-soft)" : "var(--surface)",
                    borderColor: templateId === t.id ? "var(--aurora)" : "var(--line)",
                    boxShadow: "var(--shadow-card)"
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none transition-colors"
                    style={{
                      borderColor: templateId === t.id ? "var(--aurora)" : "var(--line-strong)",
                      background: templateId === t.id ? "var(--aurora)" : "transparent"
                    }}
                  >
                    {templateId === t.id && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{t.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={startRecording}
            disabled={!title.trim()}
            className="w-full py-3 rounded-[12px] text-[14px] font-bold text-white transition-opacity disabled:opacity-40"
            style={{ background: "var(--aurora)" }}
          >
            회의 시작 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div
        className="flex-none flex items-center gap-3 px-5 py-2.5"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
      >
        {/* Recording status */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
            style={{
              background: recording ? "var(--error-soft)" : "var(--surface-muted)",
              color: recording ? "var(--error)" : "var(--text-muted)"
            }}
          >
            {recording ? <><span className="rec-dot" style={{ width: 6, height: 6 }} />녹음 중</> : "▶ 재개"}
          </button>
          <span className="text-[13px] font-mono font-medium" style={{ color: "var(--text-2)" }}>
            {fmtElapsed(elapsed)}
          </span>
        </div>

        <div className="flex-1 min-w-0 text-center">
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>{title}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFocusMode(f => !f)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{
              background: focusMode ? "var(--aurora-soft)" : "var(--surface-muted)",
              color: focusMode ? "var(--aurora)" : "var(--text-muted)"
            }}
          >
            {focusMode ? "집중 해제" : "집중 모드"}
          </button>
          <button
            onClick={() => void handleFinish()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--aurora)" }}
          >
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            종료 + AI 요약
          </button>
        </div>
      </div>

      {/* 2-panel editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: notes editor */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ borderRight: focusMode ? "none" : "1px solid var(--line)" }}
        >
          <div
            className="flex-none px-4 py-2 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--aurora)" }}>
              <path d="M2 2.5A1 1 0 0 1 3 1.5h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9Z" fill="currentColor" opacity=".3"/>
              <path d="M4 5h6M4 7.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>내 노트</p>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}>Markdown</span>
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            className="flex-1 resize-none px-5 py-4 text-[13px] leading-relaxed outline-none font-mono"
            style={{ background: "var(--surface)", color: "var(--text)" }}
            placeholder="회의 내용을 입력하세요…"
          />
        </div>

        {/* Right: transcript */}
        {!focusMode && (
          <div className="w-[45%] flex-none flex flex-col overflow-hidden">
            <div
              className="flex-none px-4 py-2 flex items-center gap-2"
              style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}
            >
              <div className="flex items-center gap-1.5">
                {recording && <span className="rec-dot" style={{ width: 6, height: 6 }} />}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: recording ? "var(--error)" : "var(--text-muted)" }}>
                  <rect x="5" y="1" width="4" height="8" rx="2" fill="currentColor" opacity=".8"/>
                  <path d="M2 7a5 5 0 0 0 10 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M7 12v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>실시간 자막</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: "var(--surface-muted)", color: "var(--text-muted)" }}>
                Whisper STT — 구현 예정
              </span>
            </div>
            <div
              className="flex-1 overflow-auto px-4 py-3 space-y-2"
              style={{ background: "var(--elevated)" }}
            >
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--text-muted)" }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="opacity-30">
                    <rect x="12" y="3" width="8" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 16a11 11 0 0 0 22 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M16 27v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p className="text-[12px] text-center">
                    {recording ? "음성을 감지하는 중…" : "녹음을 시작하면 자막이 표시됩니다"}
                  </p>
                </div>
              ) : (
                transcript.map((line, i) => (
                  <p key={i} className="text-[12px] leading-relaxed px-2 py-1.5 rounded-lg" style={{ background: "var(--surface)", color: "var(--text)" }}>
                    {line}
                  </p>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
