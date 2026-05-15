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
  { value: "Asia/Seoul", label: "서울 (KST, UTC+9)" },
  { value: "Asia/Tokyo", label: "도쿄 (JST, UTC+9)" },
  { value: "America/New_York", label: "뉴욕 (EST, UTC-5)" },
  { value: "America/Los_Angeles", label: "LA (PST, UTC-8)" },
  { value: "Europe/London", label: "런던 (GMT, UTC+0)" },
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

interface Repo { name: string; full_name: string; private: boolean; description: string | null; pushedAt: string | null }

type Step = 1 | 2 | 3;

const GITHUB_APP_INSTALL_URL =
  `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`;

export default function SetupPage() {
  return (
    <Suspense>
      <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const searchParams = useSearchParams();
  const initialStep = parseInt(searchParams.get("step") ?? "1") as Step;

  const [step, setStep] = useState<Step>(initialStep);
  const [installationOrg, setInstallationOrg] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [digestTime, setDigestTime] = useState("09:00");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [digestDays, setDigestDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 2: repos + org 정보 로드
  useEffect(() => {
    if (step !== 2) return;
    setLoading(true);

    Promise.all([
      fetch("/api/slack-bot/repos").then(r => r.json()),
      fetch("/api/slack-bot/orgs").then(r => r.json())
    ])
      .then(([repoData, orgData]: [Repo[], { login: string }[]]) => {
        setRepos(repoData);
        setInstallationOrg(orgData[0]?.login ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [step]);

  const toggleRepo = useCallback((fullName: string) => {
    setSelectedRepos(prev =>
      prev.includes(fullName)
        ? prev.filter(r => r !== fullName)
        : prev.length < 20 ? [...prev, fullName] : prev
    );
  }, []);

  const toggleDay = useCallback((day: string) => {
    setDigestDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }, []);

  const saveStep2 = useCallback(async () => {
    if (selectedRepos.length === 0) return;
    setSaving(true);
    const selected = repos.filter(r => selectedRepos.includes(r.full_name));
    await fetch("/api/slack-bot/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        github_org: installationOrg,
        repos: selected.map(r => ({ name: r.name, full_name: r.full_name, private: r.private })),
        digest_time: digestTime,
        timezone,
        digest_days: digestDays
      })
    });
    setSaving(false);
    setStep(3);
  }, [selectedRepos, repos, installationOrg, digestTime, timezone, digestDays]);

  const slackOauthUrl =
    `https://slack.com/oauth/v2/authorize` +
    `?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}` +
    `&scope=chat%3Awrite%2Ccommands%2Cincoming-webhook` +
    `&redirect_uri=${encodeURIComponent((process.env.NEXT_PUBLIC_APP_URL ?? "") + "/api/slack/oauth")}`;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <AuraLogo size={28} />
          <p className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>AURA Bot 설정</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: step >= s ? "var(--aurora)" : "var(--line-strong)",
                  color: step >= s ? "white" : "var(--text-muted)"
                }}
              >
                {step > s ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : s}
              </div>
              <span
                className="text-[12px] font-medium"
                style={{ color: step === s ? "var(--text)" : "var(--text-muted)" }}
              >
                {s === 1 ? "GitHub 연동" : s === 2 ? "레포 선택" : "Slack 연동"}
              </span>
              {i < 2 && <div className="flex-1 h-px mx-1" style={{ background: "var(--line-strong)", minWidth: 24 }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-[20px] p-6 space-y-5"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-float)" }}
        >
          {/* Step 1 — GitHub App 설치 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: "var(--text)" }}>GitHub 연동</h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Organization 레포에 접근하기 위해 GitHub App을 설치합니다
                </p>
              </div>
              <div className="space-y-2">
                {[
                  "레포지토리 커밋/PR 읽기 (Read-only)",
                  "Organization 멤버 읽기",
                  "쓰기/삭제 권한 없음",
                  "선택한 레포에만 접근"
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" fill="var(--success)" opacity=".15"/>
                      <path d="M4.5 7l2 2 3-3" stroke="var(--success)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
              <a
                href={GITHUB_APP_INSTALL_URL}
                className="flex items-center justify-center gap-2.5 w-full py-3 rounded-[12px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--text)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/>
                </svg>
                GitHub App 설치하기
              </a>
              <p className="text-[12px] text-center" style={{ color: "var(--text-muted)" }}>
                GitHub App을 설치하면 선택한 레포의 읽기 권한만 부여됩니다
              </p>
            </div>
          )}

          {/* Step 2 — 레포 선택 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: "var(--text)" }}>레포 선택</h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
                  {installationOrg ? (
                    <><strong>{installationOrg}</strong>의 모니터링할 레포와 알림 시간을 설정하세요</>
                  ) : "모니터링할 레포와 알림 시간을 설정하세요"}
                </p>
              </div>

              {/* Repo 목록 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
                    레포지토리 (최대 20개)
                  </label>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {selectedRepos.length}개 선택
                  </span>
                </div>
                <div
                  className="max-h-52 overflow-y-auto rounded-[10px] border space-y-px"
                  style={{ borderColor: "var(--line)" }}
                >
                  {loading ? (
                    <div className="p-4 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
                      레포 불러오는 중...
                    </div>
                  ) : repos.length === 0 ? (
                    <div className="p-4 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
                      접근 가능한 레포가 없습니다. GitHub App에서 레포를 선택해주세요.
                    </div>
                  ) : repos.map(repo => {
                    const checked = selectedRepos.includes(repo.full_name);
                    return (
                      <button
                        key={repo.full_name}
                        onClick={() => toggleRepo(repo.full_name)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                        style={{
                          background: checked ? "var(--aurora-soft)" : "var(--surface)",
                          borderBottom: "1px solid var(--line)"
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded flex-none flex items-center justify-center"
                          style={{
                            background: checked ? "var(--aurora)" : "transparent",
                            border: checked ? "none" : "1.5px solid var(--line-strong)"
                          }}
                        >
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>
                            {repo.name}
                            {repo.private && (
                              <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "var(--surface-muted)", color: "var(--text-muted)" }}>
                                private
                              </span>
                            )}
                          </p>
                          {repo.description && (
                            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{repo.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 시간/요일 설정 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>알림 시간 (30분 단위)</label>
                  <select
                    value={digestTime}
                    onChange={e => setDigestTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                    style={{ background: "var(--surface-muted)", border: "1px solid var(--line)", color: "var(--text)" }}
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
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
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
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

              <button
                onClick={() => void saveStep2()}
                disabled={selectedRepos.length === 0 || digestDays.length === 0 || saving}
                className="w-full py-3 rounded-[12px] text-[14px] font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: "var(--aurora)" }}
              >
                {saving ? "저장 중..." : "다음 →"}
              </button>
            </div>
          )}

          {/* Step 3 — Slack 연동 */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: "var(--text)" }}>Slack 연동</h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
                  마지막 단계입니다. 요약을 받을 Slack 채널을 선택하세요
                </p>
              </div>

              <div
                className="p-4 rounded-[12px] space-y-1.5"
                style={{ background: "var(--surface-muted)", border: "1px solid var(--line)" }}
              >
                <p className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>설정 요약</p>
                {installationOrg && (
                  <p className="text-[13px]" style={{ color: "var(--text)" }}>
                    Organization: <strong>{installationOrg}</strong>
                  </p>
                )}
                <p className="text-[13px]" style={{ color: "var(--text)" }}>
                  레포: <strong>{selectedRepos.length}개</strong>
                </p>
                <p className="text-[13px]" style={{ color: "var(--text)" }}>
                  알림: <strong>{digestTime}</strong> · {timezone.split("/").pop()?.replace("_", " ")}
                </p>
              </div>

              <a
                href={slackOauthUrl}
                className="flex items-center justify-center gap-3 w-full py-3 rounded-[12px] text-[14px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#4A154B", color: "white" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                Add to Slack
              </a>
              <p className="text-[12px] text-center" style={{ color: "var(--text-muted)" }}>
                Slack workspace에 AURA Bot을 추가하고 채널을 선택합니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
