import Link from "next/link";
import AuraLogo from "@/components/AuraLogo";

/* ── Responsive styles ──────────────────────────────────────────────── */
const responsive = `
  .a-hero     { grid-template-columns: 1fr 1fr; padding: 88px 32px; gap: 64px; }
  .a-phone    { display: flex; }
  .a-feats    { grid-template-columns: repeat(3, 1fr); }
  .a-biz      { grid-template-columns: 1fr 1fr; gap: 80px; }
  .a-dl-row   { flex-direction: row; }
  .a-hero-sub { text-align: left; }
  .a-sec      { padding: 96px 32px; }
  .a-biz-sec  { padding: 96px 32px; }
  @media (max-width: 768px) {
    .a-hero     { grid-template-columns: 1fr; padding: 56px 20px 48px; gap: 40px; }
    .a-phone    { display: none; }
    .a-feats    { grid-template-columns: 1fr 1fr; }
    .a-biz      { grid-template-columns: 1fr; gap: 40px; }
    .a-dl-row   { flex-direction: column; align-items: stretch; }
    .a-hero-sub { text-align: center; align-items: center; }
    .a-sec      { padding: 64px 20px; }
    .a-biz-sec  { padding: 64px 20px; }
    .a-nav-links { display: none; }
  }
  @media (max-width: 480px) {
    .a-feats    { grid-template-columns: 1fr; }
    .a-sec      { padding: 48px 16px; }
    .a-biz-sec  { padding: 48px 16px; }
  }
`;

/* ── Phone mock showing daily briefing ─────────────────────────────── */
function PhoneMock() {
  return (
    <div
      style={{
        width: 240,
        background: "#fff",
        borderRadius: 36,
        border: "8px solid #0F1226",
        boxShadow:
          "0 32px 72px -12px rgba(15,18,38,.35), 0 8px 24px rgba(107,91,255,.18)",
        overflow: "hidden",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* Status bar */}
      <div
        style={{
          background: "#F4F2FF",
          padding: "10px 16px 6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: "#0F1226" }}>
          9:41
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div
            style={{
              width: 14,
              height: 8,
              border: "1.5px solid #0F1226",
              borderRadius: 2,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "1.5px",
                background: "#0F1226",
                borderRadius: 1,
                width: "70%",
              }}
            />
          </div>
        </div>
      </div>

      {/* App content */}
      <div style={{ padding: "12px 14px 20px", background: "#F8F8FA" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
          }}
        >
          <AuraLogo size={16} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0F1226" }}>
            AURA
          </span>
          <span style={{ fontSize: 10, color: "#8B8FA4", marginLeft: "auto" }}>
            목요일
          </span>
        </div>

        {/* Briefing card */}
        <div
          style={{
            background: "linear-gradient(135deg, #6B5BFF 0%, #34D2FF 100%)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(255,255,255,.7)",
              marginBottom: 4,
            }}
          >
            오늘의 AI 브리핑
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.4,
              marginBottom: 8,
            }}
          >
            오늘 회의 2개·맑음 23°
            <br />
            중요 메일 3건
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,.8)",
              lineHeight: 1.5,
            }}
          >
            "오전 회의 전 확인할 피드백이 있습니다"
          </div>
        </div>

        {/* Schedule items */}
        {[
          {
            time: "10:00",
            title: "프로덕트 주간 회의",
            badge: "곧",
            badgeColor: "#FF3B5C",
          },
          {
            time: "14:00",
            title: "팀 스탠드업",
            badge: "오후",
            badgeColor: "#8B8FA4",
          },
        ].map((item) => (
          <div
            key={item.time}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ textAlign: "center", width: 30, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0F1226" }}>
                {item.time}
              </div>
            </div>
            <div
              style={{
                width: 1,
                height: 20,
                background: "#EFEFF4",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1,
                fontSize: 10,
                fontWeight: 600,
                color: "#0F1226",
              }}
            >
              {item.title}
            </div>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: item.badgeColor,
                flexShrink: 0,
              }}
            >
              {item.badge}
            </span>
          </div>
        ))}

        {/* Weather mini */}
        <div
          style={{
            background: "#ECE9FF",
            borderRadius: 8,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>☀️</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#0F1226" }}>
              서울 23° · 맑음
            </div>
            <div style={{ fontSize: 9, color: "#6B5BFF" }}>
              최고 26° · 최저 15°
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div style={{ background: "#fff", color: "#0F1226", minHeight: "100vh" }}>
      <style>{responsive}</style>

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #EFEFF4",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 58,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AuraLogo size={22} />
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#0F1226",
                letterSpacing: "-0.02em",
              }}
            >
              AURA
            </span>
          </div>
          <div
            className="a-nav-links"
            style={{ display: "flex", alignItems: "center", gap: 24 }}
          >
            <Link
              href="/business"
              style={{
                fontSize: 13,
                color: "#4A4E66",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Business →
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: "#0F1226",
                textDecoration: "none",
                padding: "7px 16px",
                borderRadius: 8,
              }}
            >
              로그인
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        style={{ background: "#F8F8FA", borderBottom: "1px solid #EFEFF4" }}
      >
        <div
          className="a-hero"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            alignItems: "center",
          }}
        >
          {/* Left text */}
          <div
            className="a-hero-sub"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#F4F2FF",
                border: "1px solid #DDD9FF",
                borderRadius: 9999,
                padding: "5px 12px",
                marginBottom: 28,
                width: "fit-content",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#6B5BFF",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6B5BFF" }}>
                AI 개인 비서 앱
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(36px, 4.5vw, 58px)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                color: "#0F1226",
                margin: "0 0 20px",
              }}
            >
              하루를 시작하는
              <br />
              가장 스마트한 방법
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #6B5BFF, #34D2FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AURA
              </span>
            </h1>

            <p
              style={{
                fontSize: 17,
                color: "#4A4E66",
                lineHeight: 1.7,
                maxWidth: 420,
                margin: "0 0 40px",
              }}
            >
              일정 브리핑, 날씨, 뉴스, 메일 요약까지 <br />
              아침을 여는 데 필요한 모든 정보를 AI가 한 번에 정리해드립니다.
            </p>

            {/* App download buttons */}
            <div
              className="a-dl-row"
              style={{ display: "flex", gap: 12, marginBottom: 48 }}
            >
              <a
                href="#"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#0F1226",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "11px 20px",
                  borderRadius: 12,
                  flex: 1,
                  maxWidth: 180,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <div style={{ fontSize: 9, opacity: 0.7 }}>
                    Download on the
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
                    App Store
                  </div>
                </div>
              </a>
              <a
                href="#"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#0F1226",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "11px 20px",
                  borderRadius: 12,
                  flex: 1,
                  maxWidth: 180,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-7.27-2.83-2.83zM.55 1.58C.21 1.9 0 2.4 0 3.06v17.88c0 .66.21 1.16.55 1.48l.08.07 10.01-10.01v-.23L.63 1.5zm20.27 8.46l-2.87-1.66-3.17 3.17 3.17 3.17 2.87-1.66c.82-.47.82-1.23 0-1.7zM4.17 1.05L16.77 8.32l-2.83 2.83z" />
                </svg>
                <div>
                  <div style={{ fontSize: 9, opacity: 0.7 }}>Get it on</div>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
                    Google Play
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="a-phone" style={{ justifyContent: "center" }}>
            <PhoneMock />
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="a-sec">
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
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
              하루를 더 가볍게 만드는 기능들
            </h2>
            <p style={{ fontSize: 16, color: "#4A4E66" }}>
              아침 루틴을 완전히 바꿔드립니다
            </p>
          </div>

          <div className="a-feats" style={{ display: "grid", gap: 16 }}>
            {[
              {
                icon: "📰",
                title: "AI 뉴스 브리핑",
                desc: "관심 분야 뉴스를 AI가 골라 3줄로 요약. 아침마다 맞춤 뉴스레터처럼.",
                accent: "#6B5BFF",
                bg: "#F4F2FF",
              },
              {
                icon: "📅",
                title: "일정 브리핑",
                desc: "오늘 하루 회의와 일정을 한눈에. Google 캘린더 자동 연동.",
                accent: "#0F1226",
                bg: "#F0F0F3",
              },
              {
                icon: "🌤",
                title: "날씨 & 교통",
                desc: "출근 전 날씨와 교통 상황을 미리 확인. 우산 필요 여부까지.",
                accent: "#6B5BFF",
                bg: "#F4F2FF",
              },
              {
                icon: "📧",
                title: "Gmail 요약",
                desc: "읽지 않은 중요 메일을 AI가 선별해 핵심만 정리.",
                accent: "#0F1226",
                bg: "#F0F0F3",
              },
              {
                icon: "💬",
                title: "AURA Chat",
                desc: "Claude AI 기반 챗봇으로 질문하고, 정보를 빠르게 얻어보세요.",
                accent: "#6B5BFF",
                bg: "#F4F2FF",
              },
              {
                icon: "🔔",
                title: "스마트 알림",
                desc: "정해진 시간에 맞춤 브리핑 알림. 하루 시작을 놓치지 않도록.",
                accent: "#0F1226",
                bg: "#F0F0F3",
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  background: "#fff",
                  border: "1px solid #E8E6F0",
                  borderRadius: 16,
                  padding: "24px",
                  boxShadow: "0 1px 4px rgba(15,18,38,.04)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: f.bg,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    marginBottom: 14,
                  }}
                >
                  {f.icon}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#0F1226",
                    marginBottom: 6,
                    lineHeight: 1.3,
                  }}
                >
                  {f.title}
                </div>
                <div
                  style={{ fontSize: 13, color: "#4A4E66", lineHeight: 1.65 }}
                >
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Business teaser ─────────────────────────────────────────── */}
      <section
        className="a-biz-sec"
        style={{ background: "#0F1226", borderTop: "none" }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div
            className="a-biz"
            style={{ display: "grid", alignItems: "center" }}
          >
            {/* Left */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(107,91,255,.2)",
                  border: "1px solid rgba(107,91,255,.4)",
                  borderRadius: 9999,
                  padding: "5px 12px",
                  marginBottom: 24,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#8E76FF" }}
                >
                  For Teams
                </span>
              </div>
              <h2
                style={{
                  fontSize: "clamp(28px, 3.5vw, 44px)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: "#fff",
                  margin: "0 0 16px",
                  lineHeight: 1.15,
                }}
              >
                팀과 함께라면
                <br />
                <span
                  style={{
                    background: "linear-gradient(90deg, #6B5BFF, #34D2FF)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  AURA Business
                </span>
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,.55)",
                  lineHeight: 1.7,
                  margin: "0 0 32px",
                  maxWidth: 420,
                }}
              >
                회의 준비·기록·AI 요약·팀 공유까지 — 팀 전체의 회의를 자동화하는
                비즈니스 플랜을 만나보세요.
              </p>
              <Link
                href="/business"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#6B5BFF",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "13px 28px",
                  borderRadius: 12,
                  boxShadow: "0 4px 16px rgba(107,91,255,.5)",
                }}
              >
                AURA Business 알아보기 →
              </Link>
            </div>

            {/* Right: feature list */}
            <div
              style={{
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 20,
                padding: "32px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.4)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 20,
                }}
              >
                Business 전용 기능
              </div>
              {[
                { icon: "📝", label: "실시간 회의록 작성 (5가지 템플릿)" },
                { icon: "✨", label: "Claude AI 자동 요약 & 액션아이템 추출" },
                { icon: "🔗", label: "로그인 없는 팀 공유 링크" },
                { icon: "🔔", label: "회의 30분 전 자동 브리핑 알림" },
                { icon: "📊", label: "회의록 내보내기 (Markdown · Word)" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,.75)",
                      lineHeight: 1.4,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: "1px solid rgba(255,255,255,.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                  14일 무료 체험 · 신용카드 불필요
                </span>
                <Link
                  href="/business"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#8E76FF",
                    textDecoration: "none",
                  }}
                >
                  자세히 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Download CTA ────────────────────────────────────────────── */}
      <section
        className="a-sec"
        style={{
          background: "#F8F8FA",
          borderTop: "1px solid #EFEFF4",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <AuraLogo size={32} />
          </div>
          <h2
            style={{
              fontSize: "clamp(26px, 3.5vw, 40px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: "#0F1226",
              margin: "0 0 14px",
              lineHeight: 1.2,
            }}
          >
            지금 무료로 시작하세요
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#4A4E66",
              lineHeight: 1.65,
              margin: "0 0 36px",
            }}
          >
            App Store와 Google Play에서 AURA를 다운로드하세요.
            <br />
            iOS · Android 모두 지원합니다.
          </p>
          <div
            className="a-dl-row"
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <a
              href="#"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#0F1226",
                color: "#fff",
                textDecoration: "none",
                padding: "13px 24px",
                borderRadius: 12,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>
                  Download on the
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                  App Store
                </div>
              </div>
            </a>
            <a
              href="#"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#0F1226",
                color: "#fff",
                textDecoration: "none",
                padding: "13px 24px",
                borderRadius: 12,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-7.27-2.83-2.83zM.55 1.58C.21 1.9 0 2.4 0 3.06v17.88c0 .66.21 1.16.55 1.48l.08.07 10.01-10.01v-.23L.63 1.5zm20.27 8.46l-2.87-1.66-3.17 3.17 3.17 3.17 2.87-1.66c.82-.47.82-1.23 0-1.7zM4.17 1.05L16.77 8.32l-2.83 2.83z" />
              </svg>
              <div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>Get it on</div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                  Google Play
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        style={{
          background: "#0F1226",
          padding: "24px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AuraLogo size={18} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,.7)",
              }}
            >
              AURA
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link
              href="/business"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.4)",
                textDecoration: "none",
              }}
            >
              Business
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.4)",
                textDecoration: "none",
              }}
            >
              로그인
            </Link>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>
            © 2026 AURA · AI 개인 비서
          </span>
        </div>
      </footer>
    </div>
  );
}
