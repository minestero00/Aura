import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import FadeIn from "@/components/FadeIn";
import LineIcon, { type LineIconName } from "@/components/LineIcon";
import BrandIcon from "@/components/BrandIcon";
import { getBotDb } from "@/lib/slack-bot/db";
import { getInstallationAccount } from "@/lib/slack-bot/github";

export const metadata: Metadata = {
  title: "Slack Bot — AURA",
  description:
    "GitHub 변경사항을 AI가 요약해 매일 Slack으로. 개발팀을 위한 자동 다이제스트.",
};

const GITHUB_APP_INSTALL_URL = `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`;

function errorMessage(code: string): string {
  switch (code) {
    case "no_session":
      return "로그인 정보가 없습니다. GitHub로 로그인하거나 App을 설치해주세요.";
    case "installation_gone":
      return "GitHub App이 제거되었습니다. 다시 설치해주세요.";
    case "installation_not_registered":
      return "이 GitHub App 설치는 AURA에 아직 등록되지 않았습니다. 먼저 설치를 완료해주세요.";
    case "no_installation_for_user":
      return "GitHub 계정에 AURA App 설치가 없습니다. 설치 후 다시 시도해주세요.";
    case "signin_failed":
      return "로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
    case "invalid_installation_id":
    case "db_error":
      return "내부 오류로 연결에 실패했습니다. 잠시 후 다시 시도해주세요.";
    default:
      return "연결에 실패했습니다. 다시 시도해주세요.";
  }
}

type StepIconSpec = { brand: "github" | "slack" } | { line: LineIconName };

const STEPS: { num: string; title: string; desc: string; icon: StepIconSpec }[] = [
  {
    num: "01",
    title: "GitHub App 설치",
    desc: "Organization에 AURA GitHub App을 설치하고 모니터링할 레포를 선택하세요.",
    icon: { brand: "github" },
  },
  {
    num: "02",
    title: "Slack 채널 연결",
    desc: "요약을 받을 Slack 워크스페이스와 채널을 선택합니다. 별도 봇 초대 없이 자동으로 설정됩니다.",
    icon: { brand: "slack" },
  },
  {
    num: "03",
    title: "멤버 매핑 & 자동 전송",
    desc: "GitHub 팀원과 Slack 유저를 매핑하면 커밋마다 @멘션이 자동으로 붙습니다. 이후 매일 자동 전송.",
    icon: { line: "sparkles" },
  },
];

const FEATURES: { icon: LineIconName; title: string; desc: string }[] = [
  {
    icon: "clipboard-list",
    title: "AI 커밋 & PR 요약",
    desc: "어제의 커밋과 머지된 PR을 Claude가 분석해 핵심만 자연어로 요약합니다.",
  },
  {
    icon: "user",
    title: "GitHub ↔ Slack 멘션 매핑",
    desc: "GitHub login과 Slack 유저를 직접 매핑해 누가 무엇을 했는지 @멘션으로 표시합니다.",
  },
  {
    icon: "clock",
    title: "시간 맞춤 스케줄",
    desc: "원하는 시각·요일에만 발송. 월~금 09:00, 혹은 주 2회 저녁 등 자유롭게 설정.",
  },
  {
    icon: "zap",
    title: "/aura brief 즉시 요청",
    desc: "Slack에서 /aura brief 커맨드로 원할 때마다 즉시 요약을 받을 수 있습니다.",
  },
  {
    icon: "rocket",
    title: "릴리즈 노트 자동 알림",
    desc: "GitHub Release가 발행되면 릴리즈 노트 링크와 함께 Slack에 자동으로 알립니다.",
  },
  {
    icon: "building",
    title: "멀티 레포 지원",
    desc: "Organization 내 여러 레포를 선택해 한 채널에 통합 요약으로 받을 수 있습니다.",
  },
];

const PREVIEW_MSGS = [
  {
    repo: "aura-web",
    author: "@Minje Cho",
    sha: "5c78f8f",
    msg: "GitHub↔Slack User mapping + Front Update",
    pr: true,
    prTitle: "feat: 유저 매핑 시스템 구현",
  },
  {
    repo: "aura-back",
    author: "@David Kim",
    sha: "a4d34c9",
    msg: "Block | KnownBlock 타입 명시로 TS 빌드 에러 수정",
    pr: false,
    prTitle: "",
  },
];

export default async function SlackLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("bot_session")?.value;

  // Cookie alone isn't enough: the GitHub App could have been uninstalled
  // since the cookie was set. Verify the installation is still live on
  // GitHub's side — if not, treat the session as gone so the user sees the
  // install button again instead of a stale "설치 완료" badge.
  let hasSession = false;
  if (sessionId) {
    const { data } = await getBotDb()
      .from("bot_installations")
      .select("github_installation_id")
      .eq("id", sessionId)
      .maybeSingle();
    const installId = data?.github_installation_id;
    if (installId && /^\d+$/.test(installId)) {
      try {
        await getInstallationAccount(Number(installId));
        hasSession = true;
      } catch {
        // 404 / 401 from GitHub = installation gone or unauthorized → no session
        hasSession = false;
      }
    }
  }

  return (
    <div style={{ color: "#0F1226", minHeight: "100vh" }}>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(180deg, #F4F2FF 0%, #fff 100%)",
          borderBottom: "1px solid #EFEFF4",
          padding: "80px 32px 72px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          {/* Left — each child cascades in sequence */}
          <div>
            <FadeIn delay={0.1} direction="up">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#fff",
                  border: "1px solid #DDD9FF",
                  borderRadius: 9999,
                  padding: "5px 14px",
                  marginBottom: 24,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#6B5BFF" }}
                >
                  GitHub × Slack · 무료 베타
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.24} direction="up">
              <h1
                style={{
                  fontSize: "clamp(32px, 4vw, 52px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#0F1226",
                  margin: "0 0 18px",
                  lineHeight: 1.12,
                }}
              >
                GitHub를 직접
                <br />
                확인하지 않아도
                <br />
                <span
                  style={{
                    background: "linear-gradient(90deg, #6B5BFF, #34D2FF)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  팀이 다 알 수 있어요
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.42} direction="up">
              <p
                style={{
                  fontSize: 17,
                  color: "#4A4E66",
                  lineHeight: 1.7,
                  maxWidth: 440,
                  margin: "0 0 36px",
                }}
              >
                선택한 레포의 어제 커밋·PR을 AI가 요약해 지정한 시각에 Slack
                채널로 자동 전송. 누가 무엇을 했는지 @멘션으로 한눈에.
              </p>
            </FadeIn>

            {error && (
              <FadeIn delay={0.54} direction="up">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "#FFEAEE",
                    border: "1px solid #FF3B5C",
                    color: "#FF3B5C",
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  <span>{errorMessage(error)}</span>
                  <span style={{ fontSize: 11, opacity: 0.85, fontFamily: "monospace" }}>
                    [{error}{detail ? ` · ${detail}` : ""}]
                  </span>
                </div>
              </FadeIn>
            )}

            {/* CTA */}
            <FadeIn delay={0.58} direction="up">
              {hasSession ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#F4F2FF",
                      border: "1px solid #DDD9FF",
                      borderRadius: 10,
                      padding: "8px 14px",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>✅</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#6B5BFF",
                      }}
                    >
                      GitHub App 설치 완료
                    </span>
                  </div>
                  <Link
                    href="/slack/setup?step=2"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      background: "#611F69",
                      color: "#fff",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "14px 28px",
                      borderRadius: 13,
                      boxShadow: "0 4px 16px rgba(97,31,105,.4)",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 54 54"
                      fill="white"
                    >
                      <path d="M19.712.133a19.712 19.712 0 0 0-19.71 19.712 19.712 19.712 0 0 0 19.71 19.711h19.712V19.845A19.712 19.712 0 0 0 19.712.133zm0 32.11a12.398 12.398 0 0 1-12.397-12.397A12.398 12.398 0 0 1 19.71 7.447a12.398 12.398 0 0 1 12.398 12.399v12.397z" />
                      <path d="M34.285.133a19.712 19.712 0 0 0-19.712 19.712v19.711h19.712A19.712 19.712 0 0 0 54 20.289V.133zm0 32.11a12.398 12.398 0 0 1-12.397-12.397V7.447h12.397a12.398 12.398 0 0 1 12.398 12.399 12.398 12.398 0 0 1-12.398 12.397z" />
                    </svg>
                    Slack 채널 연결하기
                  </Link>
                  <Link
                    href="/slack/settings"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#6B5BFF",
                      textDecoration: "none",
                    }}
                  >
                    설정 보기 →
                  </Link>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <Link
                    href={GITHUB_APP_INSTALL_URL}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      background: "#0F1226",
                      color: "#fff",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "14px 28px",
                      borderRadius: 13,
                      boxShadow: "0 4px 16px rgba(15,18,38,.3)",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
                    </svg>
                    GitHub App 설치로 시작하기
                  </Link>
                  <p style={{ fontSize: 13, color: "#8B8FA4" }}>
                    별도 회원가입 없음 · GitHub 계정으로 바로 시작 · 완전 무료
                  </p>

                  {/* 이미 설치한 사용자용 sign-in (다른 브라우저/시크릿/쿠키 만료 복구) */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1px solid #EFEFF4",
                      width: "100%",
                    }}
                  >
                    <p style={{ fontSize: 12, color: "#8B8FA4", margin: 0 }}>
                      이미 설치하셨나요?
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a
                        href="/aura/api/github/login"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0F1226",
                          background: "#fff",
                          border: "1px solid #DDD9FF",
                          textDecoration: "none",
                          padding: "8px 14px",
                          borderRadius: 10,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/>
                        </svg>
                        GitHub로 로그인
                      </a>
                      <a
                        href="/aura/api/slack/signin"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0F1226",
                          background: "#fff",
                          border: "1px solid #DDD9FF",
                          textDecoration: "none",
                          padding: "8px 14px",
                          borderRadius: 10,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 54 54" fill="#611F69">
                          <path d="M19.712.133a19.712 19.712 0 0 0-19.71 19.712 19.712 19.712 0 0 0 19.71 19.711h19.712V19.845A19.712 19.712 0 0 0 19.712.133zm0 32.11a12.398 12.398 0 0 1-12.397-12.397A12.398 12.398 0 0 1 19.71 7.447a12.398 12.398 0 0 1 12.398 12.399v12.397z" />
                          <path d="M34.285.133a19.712 19.712 0 0 0-19.712 19.712v19.711h19.712A19.712 19.712 0 0 0 54 20.289V.133zm0 32.11a12.398 12.398 0 0 1-12.397-12.397V7.447h12.397a12.398 12.398 0 0 1 12.398 12.399 12.398 12.398 0 0 1-12.398 12.397z"/>
                        </svg>
                        Slack으로 로그인
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </FadeIn>
          </div>

          {/* Right: Slack message preview */}
          <FadeIn delay={0.45} direction="up">
            <div className="pub-float">
              <div
                style={{
                  background: "#1A1D21",
                  borderRadius: 20,
                  padding: "20px",
                  boxShadow: "0 12px 48px rgba(15,18,38,.25)",
                }}
              >
                {/* Slack header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingBottom: 14,
                    marginBottom: 14,
                    borderBottom: "1px solid rgba(255,255,255,.08)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    A
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff",
                        margin: 0,
                      }}
                    >
                      AURA Bot
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,.4)",
                        margin: 0,
                      }}
                    >
                      오늘 09:00 AM
                    </p>
                  </div>
                </div>

                {/* Header block */}
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    margin: "0 0 4px",
                  }}
                >
                  📋 5월 16일 개발 현황
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,.5)",
                    margin: "0 0 16px",
                  }}
                >
                  ✨ *aura*: Slack Bot 매핑 시스템 완성. *back*: TS 타입 이슈
                  수정.
                </p>

                {/* Repo blocks */}
                {PREVIEW_MSGS.map((item) => (
                  <div
                    key={item.repo}
                    style={{
                      background: "rgba(255,255,255,.06)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      marginBottom: 10,
                      borderLeft: "3px solid #6B5BFF",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#8E76FF",
                        margin: "0 0 8px",
                      }}
                    >
                      📁 {item.repo} — 커밋 1개{item.pr ? " · PR 1개" : ""}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,.7)",
                        margin: "0 0 4px",
                      }}
                    >
                      👤{" "}
                      <span style={{ color: "#34D2FF", fontWeight: 600 }}>
                        {item.author}
                      </span>{" "}
                      — 1개
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,.5)",
                        margin: "0 0 6px",
                      }}
                    >
                      &nbsp;&nbsp;•{" "}
                      <code
                        style={{
                          color: "rgba(255,255,255,.6)",
                          fontFamily: "monospace",
                        }}
                      >
                        `{item.sha}`
                      </code>{" "}
                      {item.msg}
                    </p>
                    {item.pr && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,.5)",
                          margin: 0,
                        }}
                      >
                        🔗 <span style={{ color: "#34D2FF" }}>PR #42:</span>{" "}
                        {item.prTitle} — {item.author}
                      </p>
                    )}
                  </div>
                ))}

                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,.25)",
                    margin: "12px 0 0",
                    textAlign: "right",
                  }}
                >
                  커밋 2개 · PR 1개 · 2개 레포 · AURA Bot
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 32px",
          background: "#F8F8FA",
          borderBottom: "1px solid #EFEFF4",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <FadeIn direction="up">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <h2
                style={{
                  fontSize: "clamp(26px, 3vw, 38px)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: "#0F1226",
                  margin: "0 0 12px",
                }}
              >
                3단계로 시작
              </h2>
              <p style={{ fontSize: 16, color: "#4A4E66" }}>
                설치부터 자동 전송까지 5분이면 충분합니다
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.1} direction="up">
                <div style={{ position: "relative" }}>
                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 32,
                        right: -12,
                        fontSize: 16,
                        color: "#8B8FA4",
                        zIndex: 1,
                      }}
                    >
                      →
                    </div>
                  )}
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #E8E6F0",
                      borderRadius: 20,
                      padding: "32px 28px",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 14,
                          background: "#F4F2FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6B5BFF",
                        }}
                      >
                        {"brand" in step.icon ? (
                          <BrandIcon name={step.icon.brand} size={32} />
                        ) : (
                          <LineIcon name={step.icon.line} size={28} strokeWidth={1.8} />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#6B5BFF",
                          letterSpacing: "0.04em",
                        }}
                      >
                        STEP {step.num}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#0F1226",
                        margin: "0 0 10px",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        color: "#4A4E66",
                        lineHeight: 1.7,
                        margin: 0,
                      }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* CTA below steps */}
          <div style={{ textAlign: "center", marginTop: 48 }}>
            {hasSession ? (
              <Link
                href="/slack/setup?step=2"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#611F69",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 32px",
                  borderRadius: 13,
                  boxShadow: "0 4px 20px rgba(97,31,105,.35)",
                }}
              >
                Slack 채널 연결하기 →
              </Link>
            ) : (
              <Link
                href={GITHUB_APP_INSTALL_URL}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#0F1226",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 32px",
                  borderRadius: 13,
                }}
              >
                지금 시작하기 →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <FadeIn direction="up">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  fontSize: "clamp(24px, 3vw, 36px)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: "#0F1226",
                  margin: "0 0 12px",
                }}
              >
                포함된 기능
              </h2>
            </div>
          </FadeIn>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {FEATURES.map((feat, i) => (
              <FadeIn key={feat.title} delay={i * 0.06} direction="up">
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E8E6F0",
                    borderRadius: 16,
                    padding: "24px",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      background: "#F4F2FF",
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "#6B5BFF",
                    }}
                  >
                    <LineIcon name={feat.icon} size={26} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#0F1226",
                        margin: "0 0 6px",
                      }}
                    >
                      {feat.title}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#4A4E66",
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #6B5BFF 0%, #34D2FF 100%)",
          padding: "80px 32px",
          textAlign: "center",
        }}
      >
        <FadeIn direction="up">
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "clamp(26px, 3vw, 38px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#fff",
                margin: "0 0 14px",
                lineHeight: 1.2,
              }}
            >
              지금 바로 시작하세요
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,.8)",
                margin: "0 0 36px",
              }}
            >
              완전 무료 베타 · 별도 회원가입 없음 · 5분 설치
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {hasSession ? (
                <>
                  <Link
                    href="/slack/setup?step=2"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#611F69",
                      color: "#fff",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "12px 24px",
                      borderRadius: 12,
                    }}
                  >
                    Slack 채널 연결하기
                  </Link>
                  <Link
                    href="/slack/settings"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "rgba(255,255,255,.15)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,.3)",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "12px 24px",
                      borderRadius: 12,
                    }}
                  >
                    설정 보기
                  </Link>
                </>
              ) : (
                <Link
                  href={GITHUB_APP_INSTALL_URL}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#fff",
                    color: "#0F1226",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "12px 28px",
                    borderRadius: 12,
                  }}
                >
                  무료로 시작하기 →
                </Link>
              )}
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
