"use client";

import useSWR from "swr";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface MeetingNote {
  id: string;
  title: string;
  createdAt: string;
  status: "draft" | "done";
}

interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  attendees?: { email: string; displayName?: string }[];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function fmtRelDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function isMeetingActive(ev: CalendarEvent) {
  const now = Date.now();
  const s = new Date(ev.startsAt).getTime();
  const e = new Date(ev.endsAt).getTime();
  return now >= s && now <= e;
}

function isMeetingSoon(ev: CalendarEvent) {
  const now = Date.now();
  const s = new Date(ev.startsAt).getTime();
  return s > now && s - now < 40 * 60 * 1000;
}

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { from, to } = todayRange();

  const { data: events, isLoading: eventsLoading } = useSWR<CalendarEvent[]>(
    `/calendar/events?from=${from}&to=${to}&limit=8`,
    (p: string) => api.get<CalendarEvent[]>(p)
  );

  const { data: notes, isLoading: notesLoading } = useSWR<MeetingNote[]>(
    "/business/meetings?limit=6",
    (p: string) => api.get<MeetingNote[]>(p)
  );

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-[17px] font-bold" style={{ color: "var(--text)" }}>
            {user?.name?.split(" ")[0]}님, 오늘은 어떤 회의가 있나요?
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>

        {/* Today's meetings */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>오늘 회의</h2>
            <Link
              href="/meetings/new"
              className="flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full text-white"
              style={{ background: "var(--aurora)" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>
              새 회의록
            </Link>
          </div>

          <div className="space-y-2">
            {eventsLoading ? (
              <>
                <div className="h-[62px] skeleton rounded-[10px]" />
                <div className="h-[62px] skeleton rounded-[10px]" />
              </>
            ) : !events || events.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-8 rounded-[14px] border border-dashed"
                style={{ borderColor: "var(--line-strong)", color: "var(--text-muted)" }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mb-2 opacity-40">
                  <rect x="3" y="5" width="22" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 3v4M19 3v4M3 11h22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p className="text-[13px]">오늘 예정된 회의 없음</p>
              </div>
            ) : (
              events.map(ev => {
                const active = isMeetingActive(ev);
                const soon = !active && isMeetingSoon(ev);
                return (
                  <Link
                    key={ev.id}
                    href={`/meetings/new?eventId=${ev.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-[12px] border transition-all hover:border-[var(--aurora)]"
                    style={{
                      background: active ? "var(--aurora-soft)" : "var(--surface)",
                      borderColor: active ? "var(--aurora)" : "var(--line)",
                      boxShadow: "var(--shadow-card)"
                    }}
                  >
                    {/* Time badge */}
                    <div className="flex-none text-center w-12">
                      <p className="text-[12px] font-semibold leading-tight" style={{ color: active ? "var(--aurora)" : "var(--text)" }}>
                        {fmtTime(ev.startsAt)}
                      </p>
                      <p className="text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>
                        {fmtTime(ev.endsAt)}
                      </p>
                    </div>

                    <div
                      className="w-px self-stretch"
                      style={{ background: active ? "var(--aurora)" : "var(--line)", opacity: 0.5 }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>{ev.title}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {ev.attendees && ev.attendees.length > 0
                          ? `참석자 ${ev.attendees.length}명`
                          : "참석자 정보 없음"}
                      </p>
                    </div>

                    <div className="flex-none flex items-center gap-1.5">
                      {active && <span className="rec-dot" />}
                      <span
                        className="text-[11px] font-medium px-2 py-1 rounded-full"
                        style={{
                          background: active ? "var(--aurora)" : soon ? "var(--warning-soft)" : "var(--surface-muted)",
                          color: active ? "white" : soon ? "var(--warning)" : "var(--text-muted)"
                        }}
                      >
                        {active ? "진행 중" : soon ? "곧 시작" : "기록 시작"}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Recent notes */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>최근 회의록</h2>
            <Link href="/meetings" className="text-[12px] font-medium" style={{ color: "var(--aurora)" }}>
              전체 보기 →
            </Link>
          </div>

          <div className="space-y-2">
            {notesLoading ? (
              <>
                <div className="h-[52px] skeleton rounded-[10px]" />
                <div className="h-[52px] skeleton rounded-[10px]" />
                <div className="h-[52px] skeleton rounded-[10px]" />
              </>
            ) : !notes || notes.length === 0 ? (
              <div
                className="flex flex-col items-center py-8 rounded-[14px] border border-dashed"
                style={{ borderColor: "var(--line-strong)", color: "var(--text-muted)" }}
              >
                <p className="text-[13px]">아직 회의록이 없습니다</p>
                <p className="text-[12px] mt-1">회의를 시작하면 자동으로 기록됩니다</p>
              </div>
            ) : (
              notes.map(note => (
                <Link
                  key={note.id}
                  href={`/meetings/${note.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-[12px] border transition-all hover:border-[var(--aurora)]"
                  style={{ background: "var(--surface)", borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}
                >
                  <div
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-none"
                    style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2.5A1 1 0 0 1 3 1.5h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9Z" fill="currentColor" opacity=".25"/>
                      <path d="M4 4.5h6M4 7h5M4 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>{note.title}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtRelDate(note.createdAt)}</p>
                  </div>
                  <span
                    className="flex-none text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: note.status === "done" ? "rgba(31,203,122,.12)" : "var(--warning-soft)",
                      color: note.status === "done" ? "var(--success)" : "#B45309"
                    }}
                  >
                    {note.status === "done" ? "완료" : "작성 중"}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
