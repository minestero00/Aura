"use client";

import useSWR from "swr";
import Link from "next/link";
import { api } from "@/lib/api";

interface MeetingNote {
  id: string;
  title: string;
  createdAt: string;
  status: "draft" | "done";
  templateId: string | null;
  shareToken: string | null;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

const TEMPLATE_LABELS: Record<string, string> = {
  general: "일반 회의",
  standup: "스탠드업",
  one_on_one: "1:1 미팅",
  customer: "고객 미팅",
  project: "프로젝트"
};

export default function MeetingsPage() {
  const { data: notes, isLoading } = useSWR<MeetingNote[]>(
    "/business/meetings?limit=50",
    (p: string) => api.get<MeetingNote[]>(p)
  );

  const grouped = notes?.reduce<Record<string, MeetingNote[]>>((acc, note) => {
    const key = new Date(note.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    (acc[key] ??= []).push(note);
    return acc;
  }, {}) ?? {};

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[17px] font-bold" style={{ color: "var(--text)" }}>회의록</h1>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {notes ? `${notes.length}개의 회의록` : "불러오는 중…"}
            </p>
          </div>
          <Link
            href="/meetings/new"
            className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-full text-white"
            style={{ background: "var(--aurora)" }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="white" strokeWidth="1.7" strokeLinecap="round"/></svg>
            새 회의록
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 skeleton rounded-[12px]" />
            ))}
          </div>
        ) : !notes || notes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed"
            style={{ borderColor: "var(--line-strong)" }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3 opacity-30">
              <path d="M8 6a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6Z" stroke="var(--text-muted)" strokeWidth="1.5"/>
              <path d="M14 13h12M14 19h9M14 25h7" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-[14px] font-medium" style={{ color: "var(--text-2)" }}>아직 회의록이 없습니다</p>
            <p className="text-[12px] mt-1 mb-4" style={{ color: "var(--text-muted)" }}>회의를 시작하면 자동으로 기록됩니다</p>
            <Link
              href="/meetings/new"
              className="text-[13px] font-semibold px-4 py-2 rounded-full text-white"
              style={{ background: "var(--aurora)" }}
            >
              첫 회의 시작하기
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <p className="text-[11px] font-semibold mb-2 px-1" style={{ color: "var(--text-muted)" }}>
                  {date}
                </p>
                <div className="space-y-1.5">
                  {items.map(note => (
                    <Link
                      key={note.id}
                      href={`/meetings/${note.id}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-[12px] border transition-all hover:border-[var(--aurora)] group"
                      style={{ background: "var(--surface)", borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-none"
                        style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 2.5A1 1 0 0 1 4 1.5h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11Z" fill="currentColor" opacity=".2"/>
                          <path d="M5 5h6M5 7.5h5M5 10h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>
                          {note.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {fmtTime(note.createdAt)}
                          </span>
                          {note.templateId && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: "var(--surface-muted)", color: "var(--text-muted)" }}
                            >
                              {TEMPLATE_LABELS[note.templateId] ?? note.templateId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        {note.shareToken && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(31,203,122,.1)", color: "var(--success)" }}
                          >
                            공유됨
                          </span>
                        )}
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: note.status === "done" ? "rgba(31,203,122,.1)" : "var(--warning-soft)",
                            color: note.status === "done" ? "var(--success)" : "#B45309"
                          }}
                        >
                          {note.status === "done" ? "완료" : "작성 중"}
                        </span>
                        <svg
                          width="14" height="14" viewBox="0 0 14 14" fill="none"
                          className="opacity-30 group-hover:opacity-70 transition-opacity"
                        >
                          <path d="M5 3l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
