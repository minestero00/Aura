"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiRequestError, postFormData } from "@/lib/api";
import { useToast } from "@/components/Toast";

// MediaRecorder 청크 단위. 10s마다 ondataavailable → Whisper에 업로드.
// 청크 사이 단어가 끊길 수 있음 — Whisper는 청크별로 독립 transcribe (accepted limitation).
const STT_CHUNK_MS = 10_000;
// MIME 우선순위 (브라우저별 지원 차이). MediaRecorder.isTypeSupported로 첫 번째 지원되는 것 선택.
const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mt of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  return null;  // 브라우저가 어느 것도 지원 안 함 — Safari 매우 구버전 등
}

type SttStatus = "idle" | "active" | "permission_denied" | "unsupported" | "quota_exhausted" | "error";

// localStorage에 저장하는 작성 중 draft. 브라우저 닫혀도 다음 접속 시 복구.
// 단, 사용자가 직접 시작한 단일 draft만 보관 — 이전 draft은 새 draft 시작 시 폐기.
const DRAFT_KEY = "aura:meetings:new:draft:v1";
const DRAFT_AUTOSAVE_INTERVAL_MS = 15_000;

interface DraftPayload {
  title: string;
  templateId: string;
  body: string;
  transcript: string[];
  elapsed: number;
  eventId: string | null;
  savedAt: number;
}

function loadDraft(): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    // 7일 지난 draft는 무시 — 너무 오래된 건 회의 내용 의미 없음.
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60_000) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(payload: Omit<DraftPayload, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {
    // QuotaExceededError 등 — silent
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
}

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
  const toast = useToast();
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
  const [showDraftRestore, setShowDraftRestore] = useState<DraftPayload | null>(null);
  const [sttStatus, setSttStatus] = useState<SttStatus>("idle");

  const startRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const savedAfterCreateRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mimeRef = useRef<string | null>(null);

  // 진입 시 localStorage 검사 — 이전 draft 있으면 복구 prompt.
  // mount-once side effect (외부 store hydration 패턴). 직접 setState 의도된 동작.
  useEffect(() => {
    const draft = loadDraft();
    if (draft && (draft.body !== TEMPLATE_BODY[draft.templateId] || draft.transcript.length > 0)) {
      // 빈 템플릿 그대로면 무시 (의미 있는 작업 X)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowDraftRestore(draft);
    }
  }, []);

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

  // recording 단계에서 주기적으로 localStorage에 백업 — 브라우저 닫힘 대비
  useEffect(() => {
    if (step !== "recording") return;
    const flush = () => saveDraft({ title, templateId, body, transcript, elapsed, eventId: eventId ?? null });
    flush();  // 즉시 1회
    const id = setInterval(flush, DRAFT_AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, title, body, transcript, templateId]);

  // 브라우저 닫힘 / 새로고침 경고 — recording 중이거나 의미 있는 노트 작성 후
  useEffect(() => {
    if (step !== "recording") return;
    if (savedAfterCreateRef.current) return;  // 이미 저장 후 navigating
    const handler = (e: BeforeUnloadEvent) => {
      // 모던 브라우저는 returnValue만 보고 사용자에게 confirm 다이얼로그 노출
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step]);

  const fmtElapsed = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    setBody(TEMPLATE_BODY[id] ?? "");
  };

  // MediaRecorder + Whisper 청크 업로드 시작.
  // 권한 거부 / 미지원 브라우저 / quota 초과 시 sttStatus만 갱신, 노트 입력은 계속 가능.
  const startSttPipeline = useCallback(async () => {
    if (recorderRef.current) return;  // 이미 동작 중
    const mime = pickMimeType();
    if (!mime) {
      setSttStatus("unsupported");
      toast.push({ level: "info", text: "이 브라우저는 자막을 지원하지 않습니다. 노트만 사용해주세요." });
      return;
    }
    mimeRef.current = mime;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setSttStatus("permission_denied");
      toast.push({ level: "error", text: "마이크 권한이 거부되었습니다. 노트는 계속 입력할 수 있습니다." });
      return;
    }
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = async ev => {
      if (!ev.data || ev.data.size === 0) return;
      const fd = new FormData();
      fd.append("audio", ev.data, `chunk.${mime.includes("webm") ? "webm" : "mp4"}`);
      try {
        const { text } = await postFormData<{ ok: boolean; text: string }>("/voice/transcribe", fd);
        const trimmed = text?.trim();
        if (trimmed) setTranscript(prev => [...prev, trimmed]);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 429) {
          setSttStatus("quota_exhausted");
          // 한도 초과 시 더 이상 업로드 안 함 — 녹음 자체는 사용자 의지대로
          try { recorder.stop(); } catch { /* */ }
          toast.push({ level: "error", text: "오늘 자막 한도에 도달했습니다. 녹음은 계속 가능하지만 자막은 더 이상 생성되지 않습니다." });
        } else {
          // 단발 실패 — 다음 청크에서 자동 복구. status 변경 X.
          console.error("[voice] chunk transcribe failed:", err);
        }
      }
    };
    recorder.start(STT_CHUNK_MS);
    recorderRef.current = recorder;
    setSttStatus("active");
  }, [toast]);

  const stopSttPipeline = useCallback(() => {
    if (recorderRef.current) {
      try { recorderRef.current.stop(); } catch { /* */ }
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // 컴포넌트 unmount 시 stream/recorder 정리 — 마이크 indicator OFF
  useEffect(() => {
    return () => stopSttPipeline();
  }, [stopSttPipeline]);

  const startRecording = useCallback(() => {
    setStep("recording");
    setRecording(true);
    void startSttPipeline();
  }, [startSttPipeline]);

  const toggleRecording = () => {
    setRecording(prev => {
      const next = !prev;
      const rec = recorderRef.current;
      if (next) {
        // pause→resume 또는 (draft 복구 후) 처음 시작
        if (rec && rec.state === "paused") {
          try { rec.resume(); } catch { /* */ }
        } else if (!rec) {
          void startSttPipeline();
        }
      } else {
        // 일시정지 (mic stream은 유지 — UX 빠른 재개)
        if (rec && rec.state === "recording") {
          try { rec.pause(); } catch { /* */ }
        }
      }
      return next;
    });
  };

  const restoreDraft = (draft: DraftPayload) => {
    setTitle(draft.title);
    setTemplateId(draft.templateId);
    setBody(draft.body);
    setTranscript(draft.transcript);
    setElapsed(draft.elapsed);
    setStep("recording");
    setRecording(false);  // 복구 시 기본 정지 상태 — 사용자가 재개 결정 (STT pipeline은 아직 시작 X)
    setShowDraftRestore(null);
    toast.push({ level: "info", text: "이전 작업을 복구했습니다. 녹음 재개 시 자막도 다시 시작됩니다." });
  };

  const discardDraft = () => {
    clearDraft();
    setShowDraftRestore(null);
  };

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
      // 저장 성공 → STT 정리 + draft 폐기 + beforeunload 가드 해제 + detail로 이동
      savedAfterCreateRef.current = true;
      stopSttPipeline();
      clearDraft();
      router.push(`/meetings/${note.id}?summarize=1`);
    } catch (e) {
      console.error(e);
      setSaving(false);
      if (e instanceof ApiRequestError) {
        if (e.status === 403) {
          toast.push({
            level: "error",
            text: "Business 구독이 필요합니다.",
            actionLabel: "구독 페이지",
            onAction: () => router.push("/pricing"),
          });
        } else if (e.status === 400) {
          toast.push({ level: "error", text: "내용이 너무 깁니다. (제목 ≤300자, 본문 ≤50,000자)" });
        } else {
          toast.push({
            level: "error",
            text: "저장 실패. 작성 중인 내용은 자동 복구됩니다. 다시 시도해주세요.",
            actionLabel: "재시도",
            onAction: () => void handleFinish(),
          });
        }
      } else {
        toast.push({
          level: "error",
          text: "네트워크 오류. 작성 내용은 자동 보관됩니다.",
          actionLabel: "재시도",
          onAction: () => void handleFinish(),
        });
      }
    }
  };

  if (step === "setup") {
    return (
      <div className="h-full overflow-auto flex items-start justify-center pt-8 px-4">
        <div className="w-full max-w-lg space-y-5">
          {showDraftRestore && (
            <div
              className="rounded-[12px] p-4 flex items-start gap-3"
              style={{ background: "var(--aurora-soft)", border: "1px solid var(--aurora)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "var(--aurora)", flexShrink: 0, marginTop: 2 }}>
                <path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.6 4.6l2.1 2.1M13.3 13.3l2.1 2.1M4.6 15.4l2.1-2.1M13.3 6.7l2.1-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--text)" }}>이전 작업이 남아 있습니다</p>
                <p className="text-[12px] mb-3" style={{ color: "var(--text-2)" }}>
                  &quot;{showDraftRestore.title}&quot; · {Math.floor(showDraftRestore.elapsed / 60)}분 {showDraftRestore.elapsed % 60}초 작성됨
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restoreDraft(showDraftRestore)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-white"
                    style={{ background: "var(--aurora)" }}
                  >
                    이어 작성
                  </button>
                  <button
                    onClick={discardDraft}
                    className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--line)" }}
                  >
                    삭제하고 새로 시작
                  </button>
                </div>
              </div>
            </div>
          )}

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
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto"
                style={{
                  background:
                    sttStatus === "active" ? "rgba(31,203,122,.12)"
                      : sttStatus === "permission_denied" || sttStatus === "quota_exhausted" || sttStatus === "error" ? "var(--error-soft)"
                        : "var(--surface-muted)",
                  color:
                    sttStatus === "active" ? "var(--success)"
                      : sttStatus === "permission_denied" || sttStatus === "quota_exhausted" || sttStatus === "error" ? "var(--error)"
                        : "var(--text-muted)",
                }}
              >
                {sttStatus === "active" ? "Whisper · 활성"
                  : sttStatus === "permission_denied" ? "마이크 권한 거부"
                    : sttStatus === "unsupported" ? "브라우저 미지원"
                      : sttStatus === "quota_exhausted" ? "오늘 한도 초과"
                        : sttStatus === "error" ? "일시 중단"
                          : "Whisper STT"}
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
