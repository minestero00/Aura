"use client";

import { useState } from "react";
import { use } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface MeetingNote {
  id: string;
  title: string;
  body: string;
  rawTranscript: string | null;
  status: "draft" | "done";
  templateId: string | null;
  shareToken: string | null;
  createdAt: string;
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
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: note, mutate } = useSWR<MeetingNote>(
    `/business/meetings/${id}`,
    (p: string) => api.get<MeetingNote>(p),
    {
      onSuccess: n => { if (!editing) setBody(n.body); }
    }
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/business/meetings/${id}`, { body });
      await mutate();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const result = await api.post<{ shareToken: string }>(`/business/meetings/${id}/share`);
      await mutate();
      const url = `${window.location.origin}/share/${result.shareToken}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } finally {
      setSharing(false);
    }
  };

  const handleExport = async (fmt: "md" | "docx") => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/business/meetings/${id}/export?format=${fmt}`, "_blank");
  };

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="spinner" />
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
                onClick={() => void handleShare()}
                disabled={sharing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                style={{
                  background: copied ? "rgba(31,203,122,.12)" : "var(--surface-muted)",
                  color: copied ? "var(--success)" : "var(--text-2)"
                }}
              >
                {copied ? (
                  <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>링크 복사됨</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 1H3a1 1 0 0 0-1 1v7M5 3h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>공유</>
                )}
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
    </div>
  );
}
