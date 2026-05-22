"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface MeetingNote {
  id: string;
  title: string;
  body: string;
  rawTranscript: string | null;
  status: "draft" | "done";
  templateId: string | null;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;  // ISO — If-Match 동시 편집 감지 용도
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function MeetingNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const { data: note, error, isLoading, mutate } = useSWR<MeetingNote>(
    `/business/meetings/${id}`,
    (p: string) => api.get<MeetingNote>(p),
    {
      onSuccess: n => { if (!editing) setBody(n.body); },
      shouldRetryOnError: (err: unknown) => {
        // 404/403은 재시도 무의미 — 사용자에게 명시적 에러 노출
        if (err instanceof ApiRequestError && (err.status === 404 || err.status === 403)) return false;
        return true;
      },
    }
  );

  const handleSave = async (opts: { overrideConflict?: boolean } = {}) => {
    if (!note) return;
    setSaving(true);
    try {
      // 동시 편집 감지: If-Match에 마지막으로 본 updated_at 전송.
      // overrideConflict=true면 강제 덮어쓰기 (헤더 안 보냄 → 백엔드 기존 last-write-wins).
      const headers = opts.overrideConflict ? undefined : { "If-Match": note.updatedAt };
      await api.patch(`/business/meetings/${id}`, { body }, headers);
      await mutate();
      setEditing(false);
      toast.push({ level: "success", text: "회의록을 저장했습니다." });
    } catch (e) {
      if (e instanceof ApiRequestError) {
        if (e.status === 412) {
          // 다른 곳에서 먼저 저장됨 — 사용자에게 선택 제시
          const current = e.data["current"] as MeetingNote | undefined;
          toast.push({
            level: "error",
            text: "다른 곳에서 이 회의록을 먼저 수정했습니다. 내 변경 사항을 강제 저장하시겠어요?",
            actionLabel: "내 버전으로 덮어쓰기",
            onAction: () => void handleSave({ overrideConflict: true }),
          });
          // 동시에 SWR 캐시 새로 받은 버전으로 갱신 — 사용자가 비교 가능
          if (current) await mutate(current as MeetingNote, false);
          else await mutate();
        } else if (e.status === 404) {
          toast.push({ level: "error", text: "이 회의록은 삭제되었습니다.", actionLabel: "목록으로", onAction: () => router.push("/meetings") });
        } else if (e.status === 400) {
          toast.push({ level: "error", text: "내용이 너무 깁니다 (50,000자 한도)." });
        } else {
          toast.push({ level: "error", text: "저장 실패. 잠시 후 다시 시도해주세요.", actionLabel: "재시도", onAction: () => void handleSave() });
        }
      } else {
        toast.push({ level: "error", text: "네트워크 오류. 인터넷 연결을 확인해주세요.", actionLabel: "재시도", onAction: () => void handleSave() });
      }
    } finally {
      setSaving(false);
    }
  };

  // 공유 모달 열기: 토큰이 없으면 발급 후 표시. 있으면 그대로 표시.
  const handleOpenShare = async () => {
    setSharing(true);
    try {
      if (!note?.shareToken) {
        await api.post<{ shareToken: string }>(`/business/meetings/${id}/share`);
        await mutate();
      }
      setShareModalOpen(true);
    } catch (e) {
      toast.push({
        level: "error",
        text: e instanceof ApiRequestError && e.status === 404
          ? "이 회의록은 삭제되었습니다."
          : "공유 링크 생성 실패. 다시 시도해주세요.",
      });
    } finally {
      setSharing(false);
    }
  };

  const copyShareUrl = async (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.push({ level: "success", text: "공유 링크를 클립보드에 복사했습니다." });
    } catch {
      window.prompt("이 링크를 복사하세요:", url);
    }
  };

  const revokeShare = async () => {
    if (!confirm("공유를 중지하면 기존 링크가 즉시 무효화됩니다. 계속하시겠습니까?")) return;
    setRevoking(true);
    try {
      await api.delete(`/business/meetings/${id}/share`);
      await mutate();
      setShareModalOpen(false);
      toast.push({ level: "success", text: "공유를 중지했습니다. 기존 링크는 더 이상 작동하지 않습니다." });
    } catch (e) {
      toast.push({
        level: "error",
        text: e instanceof ApiRequestError && e.status === 404
          ? "이 회의록은 삭제되었습니다."
          : "공유 중지 실패. 다시 시도해주세요.",
      });
    } finally {
      setRevoking(false);
    }
  };

  const handleExport = async (fmt: "md" | "docx") => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      toast.push({ level: "error", text: "API URL이 설정되지 않았습니다." });
      return;
    }
    window.open(`${apiUrl}/business/meetings/${id}/export?format=${fmt}`, "_blank");
  };

  // 로딩 / 에러 / 404 분기 — 기존 spinner 무한 대체
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !note) {
    const isNotFound = error instanceof ApiRequestError && (error.status === 404 || error.status === 403);
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--surface-muted)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="var(--text-muted)" strokeWidth="1.5" />
              <path d="M10 6v5M10 13.5v.5" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-[15px] font-bold mb-1" style={{ color: "var(--text)" }}>
            {isNotFound ? "회의록을 찾을 수 없습니다" : "회의록을 불러올 수 없습니다"}
          </h2>
          <p className="text-[12px] mb-5" style={{ color: "var(--text-muted)" }}>
            {isNotFound
              ? "삭제되었거나 접근 권한이 없는 회의록입니다."
              : "네트워크 오류 또는 일시적인 문제일 수 있습니다."}
          </p>
          <div className="flex items-center justify-center gap-2">
            {!isNotFound && (
              <button
                onClick={() => void mutate()}
                className="px-4 py-2 rounded-full text-[12px] font-semibold"
                style={{ background: "var(--surface-muted)", color: "var(--text-2)" }}
              >
                다시 시도
              </button>
            )}
            <Link
              href="/meetings"
              className="px-4 py-2 rounded-full text-[12px] font-semibold text-white"
              style={{ background: "var(--aurora)" }}
            >
              목록으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div
        className="flex-none flex items-center gap-3 px-5 py-3"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
      >
        <button
          onClick={() => router.back()}
          className="flex-none p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-muted)]"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{note.title}</h1>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtDateTime(note.createdAt)}</p>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setBody(note.body); }}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-[var(--surface-muted)]"
                style={{ color: "var(--text-muted)" }}
              >
                취소
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "var(--aurora)" }}
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                style={{ background: "var(--surface-muted)", color: "var(--text-2)" }}
              >
                수정
              </button>
              <button
                onClick={() => void handleOpenShare()}
                disabled={sharing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-60"
                style={{
                  background: note.shareToken ? "rgba(31,203,122,.12)" : "var(--surface-muted)",
                  color: note.shareToken ? "var(--success)" : "var(--text-2)"
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M7 1H3a1 1 0 0 0-1 1v7M5 3h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {note.shareToken ? "공유 중" : "공유"}
              </button>
              <div className="relative group">
                <button
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ background: "var(--surface-muted)", color: "var(--text-2)" }}
                >
                  내보내기 ▾
                </button>
                <div
                  className="absolute right-0 top-full mt-1 w-32 rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10"
                  style={{ background: "var(--surface)", boxShadow: "var(--shadow-float)", border: "1px solid var(--line)" }}
                >
                  <button onClick={() => void handleExport("md")} className="w-full text-left px-3.5 py-2.5 text-[12px] hover:bg-[var(--surface-muted)] transition-colors" style={{ color: "var(--text)" }}>
                    .md (Markdown)
                  </button>
                  <button onClick={() => void handleExport("docx")} className="w-full text-left px-3.5 py-2.5 text-[12px] hover:bg-[var(--surface-muted)] transition-colors" style={{ color: "var(--text)" }}>
                    .docx (Word)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {editing ? (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            className="w-full h-full resize-none px-8 py-6 text-[13px] leading-relaxed outline-none font-mono"
            style={{ background: "var(--surface)", color: "var(--text)" }}
          />
        ) : (
          <div
            className="max-w-2xl mx-auto px-8 py-6"
          >
            {/* Markdown preview — raw for now */}
            <pre
              className="text-[13px] leading-relaxed whitespace-pre-wrap font-mono"
              style={{ color: "var(--text)" }}
            >
              {note.body || <span style={{ color: "var(--text-muted)" }}>내용이 없습니다</span>}
            </pre>

            {note.rawTranscript && (
              <details className="mt-8">
                <summary
                  className="text-[12px] font-semibold cursor-pointer select-none"
                  style={{ color: "var(--text-muted)" }}
                >
                  원본 자막 보기
                </summary>
                <pre
                  className="mt-2 text-[12px] leading-relaxed whitespace-pre-wrap p-4 rounded-[10px]"
                  style={{ background: "var(--surface-muted)", color: "var(--text-2)" }}
                >
                  {note.rawTranscript}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Share modal */}
      {shareModalOpen && note.shareToken && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,.4)" }}
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[16px] p-5"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-float)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold" style={{ color: "var(--text)" }}>공유 링크</h2>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] transition-colors"
                aria-label="닫기"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
              이 링크를 받은 사람은 로그인 없이 회의록을 볼 수 있습니다. 원본 자막은 노출되지 않습니다.
            </p>

            <div
              className="flex items-center gap-2 p-2.5 rounded-[10px] mb-4"
              style={{ background: "var(--surface-muted)" }}
            >
              <code className="flex-1 text-[12px] font-mono truncate" style={{ color: "var(--text-2)" }}>
                {typeof window !== "undefined" ? `${window.location.origin}/share/${note.shareToken}` : ""}
              </code>
              <button
                onClick={() => void copyShareUrl(note.shareToken!)}
                className="flex-none flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
                style={{
                  background: copied ? "rgba(31,203,122,.15)" : "var(--surface)",
                  color: copied ? "var(--success)" : "var(--text)",
                  border: "1px solid var(--line)"
                }}
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => void revokeShare()}
                disabled={revoking}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors disabled:opacity-60"
                style={{ background: "var(--error-soft)", color: "var(--error)" }}
              >
                {revoking ? "중지 중…" : "공유 중지"}
              </button>
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-1.5 rounded-full text-[12px] font-semibold text-white"
                style={{ background: "var(--aurora)" }}
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
