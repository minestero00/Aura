"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuraLogo from "@/components/AuraLogo";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const TIMEZONES = [
  { value: "Asia/Seoul", label: "서울 (KST)" },
  { value: "Asia/Tokyo", label: "도쿄 (JST)" },
  { value: "America/New_York", label: "뉴욕 (EST)" },
  { value: "America/Los_Angeles", label: "LA (PST)" },
  { value: "Europe/London", label: "런던 (GMT)" },
  { value: "UTC", label: "UTC" }
];

const DAYS = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" }
];

interface DigestLog {
  digest_date: string;
  status: "success" | "failed" | "skipped";
  commit_count: number | null;
  pr_count: number | null;
}

interface GithubMember { login: string; avatar_url: string }
interface SlackUser { id: string; name: string; display_name: string }
interface MappingEntry { slack_user_id: string; slack_display_name: string }

interface Settings {
  github_org: string;
  slack_team_name: string;
  slack_channel_id: string;
  repos: { name: string; full_name: string }[];
  digest_time: string;
  timezone: string;
  digest_days: string[];
  include_diffs: boolean;
  custom_prompt: string | null;
  last_digest_at: string | null;
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const justInstalled = searchParams.get("installed") === "true";

  const [settings, setSettings] = useState<Settings | null>(null);
  const [logs, setLogs] = useState<DigestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [githubMembers, setGithubMembers] = useState<GithubMember[]>([]);
  const [slackUsers, setSlackUsers] = useState<SlackUser[]>([]);
  const [mappings, setMappings] = useState<Record<string, MappingEntry>>({});
  const [savingMappings, setSavingMappings] = useState(false);
  const [savedMappings, setSavedMappings] = useState(false);

  // 편집 상태
  const [digestTime, setDigestTime] = useState("09:00");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [digestDays, setDigestDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [includeDiffs, setIncludeDiffs] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/slack-bot/settings").then(r => r.json()),
      fetch("/api/slack-bot/logs").then(r => r.json()),
      fetch("/api/slack-bot/mappings").then(r => r.json()),
      fetch("/api/slack-bot/slack-users").then(r => r.json())
    ]).then(([s, l, m, u]: [
      Settings,
      DigestLog[],
      { github_members: GithubMember[]; mappings: { github_login: string; slack_user_id: string; slack_display_name: string }[] },
      SlackUser[]
    ]) => {
      setSettings(s);
      setLogs(l);
      setDigestTime(s.digest_time);
      setTimezone(s.timezone);
      setDigestDays(s.digest_days);
      setIncludeDiffs(s.include_diffs);
      setCustomPrompt(s.custom_prompt ?? "");
      setGithubMembers(m.github_members ?? []);
      setSlackUsers(u ?? []);
      const map: Record<string, MappingEntry> = {};
      (m.mappings ?? []).forEach(mp => {
        map[mp.github_login] = { slack_user_id: mp.slack_user_id, slack_display_name: mp.slack_display_name };
      });
      setMappings(map);
    }).catch(() => setError("설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = useCallback((day: string) => {
    setDigestDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/slack-bot/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest_time: digestTime, timezone, digest_days: digestDays, include_diffs: includeDiffs, custom_prompt: customPrompt || null })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [digestTime, timezone, digestDays, includeDiffs, customPrompt]);

  const triggerNow = useCallback(async () => {
    setTriggering(true);
    await fetch("/api/slack-bot/trigger", { method: "POST" });
    setTriggering(false);
  }, []);

  const saveMappings = useCallback(async () => {
    setSavingMappings(true);
    await fetch("/api/slack-bot/mappings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mappings: Object.entries(mappings).map(([github_login, { slack_user_id, slack_display_name }]) => ({
          github_login,
          slack_user_id,
          slack_display_name
        }))
      })
    });
    setSavedMappings(true);
    setTimeout(() => setSavedMappings(false), 3000);
    setSavingMappings(false);
  }, [mappings]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

  const statusColor = (s: DigestLog["status"]) =>
    s === "success" ? "var(--success)" : s === "failed" ? "var(--error)" : "var(--text-muted)";
  const statusLabel = (s: DigestLog["status"]) =>
    s === "success" ? "성공" : s === "failed" ? "실패" : "건너뜀";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>{error || "설정을 찾을 수 없습니다"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <header
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5">
          <AuraLogo size={24} />
          <span className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>AURA Bot</span>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
          >
            {settings.github_org}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-[12px] font-medium" style={{ color: "var(--success)" }}>저장됨 ✓</span>
          )}
          <button
            onClick={() => void save()}
            disabled={saving}
            className="px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--aurora)" }}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 설치 완료 배너 */}
        {justInstalled && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-[12px]"
            style={{ background: "rgba(31,203,122,.1)", border: "1px solid var(--success)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="var(--success)" opacity=".2"/>
              <path d="M5 8l2.5 2.5 3.5-4" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[13px] font-medium" style={{ color: "var(--success)" }}>
              AURA Bot이 성공적으로 설치됐습니다! 설정한 시간에 첫 요약이 전송됩니다.
            </p>
          </div>
        )}

        {/* 상태 카드 */}
        <div
          className="rounded-[16px] p-4 flex items-center justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="space-y-0.5">
            <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              #{settings.slack_channel_id} · {settings.slack_team_name}
            </p>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {settings.last_digest_at
                ? `마지막 요약: ${fmtDate(settings.last_digest_at)}`
                : "아직 요약이 실행되지 않았습니다"}
            </p>
          </div>
          <button
            onClick={() => void triggerNow()}
            disabled={triggering}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold transition-all disabled:opacity-50"
            style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
          >
            {triggering ? (
              <span className="spinner" style={{ width: 12, height: 12 }} />
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            지금 요약 실행
          </button>
        </div>

        {/* 레포 목록 */}
        <div
          className="rounded-[16px] p-4 space-y-3"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>모니터링 레포</p>
            <a href="/slack/setup?step=2" className="text-[12px] font-medium" style={{ color: "var(--aurora)" }}>
              변경 →
            </a>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {settings.repos.map(r => (
              <span
                key={r.full_name}
                className="text-[12px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
              >
                {r.name}
              </span>
            ))}
          </div>
        </div>

        {/* 멤버 매핑 */}
        {githubMembers.length > 0 && (
          <div
            className="rounded-[16px] p-4 space-y-3"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>멤버 매핑</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  GitHub 멤버 ↔ Slack 사용자 연결 · 요약 메시지에 @멘션으로 반영
                </p>
              </div>
              <button
                onClick={() => void saveMappings()}
                disabled={savingMappings}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-opacity disabled:opacity-50"
                style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
              >
                {savingMappings ? "저장 중..." : savedMappings ? "저장됨 ✓" : "저장"}
              </button>
            </div>

            <div className="space-y-2">
              {githubMembers.map(member => {
                const current = mappings[member.login];
                return (
                  <div key={member.login} className="flex items-center gap-3 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.avatar_url}
                      width={24}
                      height={24}
                      alt={member.login}
                      className="rounded-full flex-none"
                    />
                    <span
                      className="text-[13px] font-medium flex-1 truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {member.login}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                      <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <select
                      value={current?.slack_user_id ?? ""}
                      onChange={e => {
                        const selectedId = e.target.value;
                        const slackUser = slackUsers.find(u => u.id === selectedId);
                        setMappings(prev => ({
                          ...prev,
                          [member.login]: {
                            slack_user_id: selectedId,
                            slack_display_name: slackUser?.display_name ?? slackUser?.name ?? ""
                          }
                        }));
                      }}
                      className="px-2 py-1.5 rounded-[8px] text-[12px] outline-none"
                      style={{
                        background: "var(--surface-muted)",
                        border: "1px solid var(--line)",
                        color: "var(--text)",
                        maxWidth: 160,
                        minWidth: 120
                      }}
                    >
                      <option value="">매핑 없음</option>
                      {slackUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.display_name || u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {slackUsers.length === 0 && (
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                Slack이 연결되지 않았거나 멤버 목록을 불러올 수 없습니다.
              </p>
            )}
          </div>
        )}

        {/* 스케줄 설정 */}
        <div
          className="rounded-[16px] p-4 space-y-4"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>알림 스케줄</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>알림 시간</label>
              <select
                value={digestTime}
                onChange={e => setDigestTime(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                style={{ background: "var(--surface-muted)", border: "1px solid var(--line)", color: "var(--text)" }}
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                style={{ background: "var(--surface-muted)", border: "1px solid var(--line)", color: "var(--text)" }}
              >
                {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>알림 요일</label>
            <div className="flex gap-1.5">
              {DAYS.map(d => {
                const active = digestDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    className="flex-1 py-2 rounded-[8px] text-[12px] font-semibold transition-all"
                    style={{
                      background: active ? "var(--aurora)" : "var(--surface-muted)",
                      color: active ? "white" : "var(--text-muted)",
                      border: active ? "none" : "1px solid var(--line)"
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 고급 설정 */}
        <div
          className="rounded-[16px] p-4 space-y-4"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>고급 설정</p>

          <button
            onClick={() => setIncludeDiffs(!includeDiffs)}
            className="flex items-center gap-3 w-full text-left"
          >
            <div
              className="w-9 h-5 rounded-full flex-none relative transition-colors"
              style={{ background: includeDiffs ? "var(--aurora)" : "var(--line-strong)" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm"
                style={{ transform: includeDiffs ? "translateX(18px)" : "translateX(2px)" }}
              />
            </div>
            <div>
              <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>Diff 분석 사용</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>커밋 메시지가 부족할 때 코드 변경 내용도 분석 (토큰 사용 증가)</p>
            </div>
          </button>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>팀 맞춤 프롬프트 (선택)</label>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="예: 배포 관련 커밋은 반드시 강조해주세요."
              rows={3}
              className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none resize-none"
              style={{
                background: "var(--surface-muted)",
                border: "1px solid var(--line)",
                color: "var(--text)"
              }}
            />
          </div>
        </div>

        {/* 실행 기록 */}
        {logs.length > 0 && (
          <div
            className="rounded-[16px] p-4 space-y-3"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
          >
            <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>최근 실행 기록</p>
            <div className="space-y-1.5">
              {logs.map(log => (
                <div
                  key={log.digest_date}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-none"
                      style={{ background: statusColor(log.status) }}
                    />
                    <span className="text-[13px]" style={{ color: "var(--text)" }}>{fmtDate(log.digest_date)}</span>
                    <span className="text-[11px]" style={{ color: statusColor(log.status) }}>
                      {statusLabel(log.status)}
                    </span>
                  </div>
                  {log.status === "success" && (
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      커밋 {log.commit_count ?? 0}개 · PR {log.pr_count ?? 0}개
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 봇 제거 */}
        <div className="flex justify-end pb-8">
          <button
            className="text-[13px] font-medium px-4 py-2 rounded-[10px] transition-colors"
            style={{ color: "var(--error)", background: "var(--error-soft)" }}
            onClick={() => {
              if (confirm("AURA Bot을 제거하시겠습니까? 설정과 기록이 모두 삭제됩니다.")) {
                void fetch("/api/slack-bot/uninstall", { method: "DELETE" })
                  .then(() => { window.location.href = "/slack"; });
              }
            }}
          >
            봇 제거
          </button>
        </div>
      </div>
    </div>
  );
}
