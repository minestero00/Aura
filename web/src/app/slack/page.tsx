import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import AuraLogo from "@/components/AuraLogo";

export const metadata: Metadata = {
  title: "AURA Bot — GitHub × Slack",
  description: "매일 아침 GitHub 변경사항을 AI가 요약해 Slack으로 전송합니다"
};

const GITHUB_APP_INSTALL_URL =
  `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`;

const FEATURES = [
  { icon: "📋", label: "매일 AI 요약", desc: "어제 커밋과 PR을 자연어로 요약" },
  { icon: "⏰", label: "시간 맞춤", desc: "원하는 시각, 원하는 요일에만" },
  { icon: "⚡️", label: "즉시 실행", desc: "/aura brief 로 언제든 요약 요청" }
];

const PREVIEW_BLOCKS = [
  { repo: "web", summary: "로그인 세션 버그 수정, 다크모드 컴포넌트 추가 (PR #42 머지)" },
  { repo: "api", summary: "결제 webhook 연동 완료, 구독 상태 머신 리팩터링" },
  { repo: "infra", summary: "Railway 배포 스크립트 업데이트, 헬스체크 엔드포인트 추가" }
];

export default async function SlackLandingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams;
  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get("bot_session")?.value;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", fontFamily: "var(--font-geist-sans, system-ui)" }}
    >
      {/* Nav */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5">
          <AuraLogo size={28} />
          <div>
            <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>AURA</span>
            <span
              className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
            >
              Bot
            </span>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-[13px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          대시보드로 →
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-12">
        <div className="text-center max-w-lg space-y-4">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold mb-2"
            style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--aurora)" }} />
            GitHub × Slack
          </div>
          <h1 className="text-[32px] font-bold leading-tight" style={{ color: "var(--text)" }}>
            매일 아침 GitHub를<br />
            팀이 직접 보지 않아도 됩니다
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            선택한 레포의 어제 커밋과 PR을 AI가 요약해<br />
            설정한 시각에 Slack 채널로 자동 전송합니다
          </p>

          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-[10px] text-[13px]"
              style={{ background: "var(--error-soft)", color: "var(--error)", border: "1px solid var(--error)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M7 4v4M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              연결에 실패했습니다. 다시 시도해주세요.
            </div>
          )}

          {hasSession ? (
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/slack/setup?step=2"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-[12px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--aurora)" }}
              >
                설정 계속하기 →
              </Link>
              <Link
                href="/slack/settings"
                className="text-[13px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                설정 완료 → Slack 연결 보기
              </Link>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                GitHub App이 이미 설치되어 있습니다
              </p>
            </div>
          ) : (
            <>
              <Link
                href={GITHUB_APP_INSTALL_URL}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-[12px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--text)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/>
                </svg>
                GitHub App 설치하기
              </Link>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                별도 회원가입 없음 · GitHub 계정으로 바로 시작
              </p>
            </>
          )}
        </div>

        {/* Features */}
        <div className="flex gap-4 flex-wrap justify-center">
          {FEATURES.map(f => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-2 px-5 py-4 rounded-[14px] w-44 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
            >
              <span className="text-2xl">{f.icon}</span>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{f.label}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="w-full max-w-md space-y-2">
          <p className="text-[12px] font-semibold text-center mb-3" style={{ color: "var(--text-muted)" }}>
            이런 메시지가 매일 전송됩니다
          </p>
          <div
            className="rounded-[16px] p-4 space-y-3"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-float)" }}
          >
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid var(--line)" }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-none"
                style={{ background: "var(--aurora)" }}
              >
                A
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>AURA</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 개발 현황
                </p>
              </div>
            </div>
            {PREVIEW_BLOCKS.map(b => (
              <div key={b.repo} className="space-y-0.5">
                <p className="text-[12px] font-semibold" style={{ color: "var(--aurora)" }}>{b.repo}</p>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>{b.summary}</p>
              </div>
            ))}
            <div
              className="pt-2 text-[11px]"
              style={{ borderTop: "1px solid var(--line)", color: "var(--text-muted)" }}
            >
              커밋 18개 · PR 3개 · 3개 레포
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          AURA Bot · GitHub Organization 일일 요약
        </p>
      </footer>
    </div>
  );
}
