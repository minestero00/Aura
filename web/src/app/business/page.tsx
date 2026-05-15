import Link from "next/link";
import AuraLogo from "@/components/AuraLogo";

/* ── Responsive styles ──────────────────────────────────────────────── */
const responsive = `
  .lp-nav-cta  { display: inline-block; }
  .lp-hero-wrap { padding: 0 32px; }
  .lp-hero-text { }
  .lp-hero    { grid-template-columns: 1fr 1fr; padding-top: 72px; padding-bottom: 72px; }
  .lp-mock    { display: flex; }
  .lp-hi      { grid-template-columns: 1fr 1fr; }
  .lp-steps   { grid-template-columns: repeat(3, 1fr); }
  .lp-price   { grid-template-columns: 1fr 1fr; }
  .lp-pf      { grid-template-columns: repeat(3, 1fr); }
  .lp-strip   { display: flex; }
  .lp-sec     { padding: 96px 32px; }
  .lp-hsec    { padding: 96px 32px; }
  .lp-h1      { text-align: left; }
  @media (max-width: 768px) {
    .lp-nav-cta   { display: none; }
    .lp-hero-wrap { padding: 0 20px; }
    .lp-hero-text { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .lp-hero     { grid-template-columns: 1fr; padding-top: 48px; padding-bottom: 48px; }
    .lp-mock     { display: none; }
    .lp-hi       { grid-template-columns: 1fr; gap: 40px; }
    .lp-steps    { grid-template-columns: 1fr; border-radius: 16px; }
    .lp-steps > div { border-bottom: 1px solid #EFEFF4; }
    .lp-steps > div:last-child { border-bottom: none; }
    .lp-price    { grid-template-columns: 1fr; }
    .lp-price > div:first-child { border-right: none; border-bottom: 1px solid #EFEFF4; }
    .lp-pf       { grid-template-columns: 1fr 1fr; }
    .lp-strip    { display: none; }
    .lp-sec      { padding: 60px 20px; }
    .lp-hsec     { padding: 60px 20px; }
    .lp-stats    { justify-content: center; }
    .lp-cta-row  { justify-content: center; }
  }
  @media (max-width: 480px) {
    .lp-pf      { grid-template-columns: 1fr; }
    .lp-sec     { padding: 48px 16px; }
    .lp-hsec    { padding: 48px 16px; }
  }
`;

/* ── tiny SVG icons ─────────────────────────────────────────────────── */
const Chk = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#ECE9FF" />
    <path
      d="M5 8l2 2 4-4"
      stroke="#6B5BFF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Product UI mock — inlined HTML/CSS representation of the app ───── */
function ProductMock() {
  return (
    <div
      style={{
        background: "#FCFBFF",
        border: "1px solid #E8E6F4",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow:
          "0 24px 64px -12px rgba(107,91,255,.22), 0 4px 16px rgba(15,18,38,.08)",
        width: "100%",
        maxWidth: 420,
        userSelect: "none",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #EFEFF4",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AuraLogo size={18} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0F1226" }}>
            AURA
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#6B5BFF" }}>
            Business
          </span>
        </div>
        <div
          style={{
            background: "#6B5BFF",
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          새 회의 시작
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {/* Date */}
        <div
          style={{
            fontSize: 11,
            color: "#8B8FA4",
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          오늘 · 2025년 5월 15일 목요일
        </div>

        {/* Meeting cards */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#4A4E66",
              marginBottom: 6,
            }}
          >
            오늘 회의
          </div>

          {/* Active meeting */}
          <div
            style={{
              background: "#ECE9FF",
              border: "1px solid #6B5BFF",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ flexShrink: 0, textAlign: "center", width: 42 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6B5BFF" }}>
                10:00
              </div>
              <div style={{ fontSize: 10, color: "#8E76FF" }}>11:00</div>
            </div>
            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "#6B5BFF",
                opacity: 0.35,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0F1226",
                  marginBottom: 1,
                }}
              >
                프로덕트 주간 회의
              </div>
              <div style={{ fontSize: 10, color: "#6B5BFF" }}>참석자 4명</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#FF3B5C",
                  display: "inline-block",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#FF3B5C" }}>
                진행 중
              </span>
            </div>
          </div>

          {/* Upcoming */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #EFEFF4",
              borderRadius: 10,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ flexShrink: 0, textAlign: "center", width: 42 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1226" }}>
                14:00
              </div>
              <div style={{ fontSize: 10, color: "#8B8FA4" }}>14:30</div>
            </div>
            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "#EFEFF4",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0F1226",
                  marginBottom: 1,
                }}
              >
                팀 스탠드업
              </div>
              <div style={{ fontSize: 10, color: "#8B8FA4" }}>참석자 6명</div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#B45309",
                background: "#FFF4DC",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              1시간 후
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #EFEFF4", margin: "12px 0" }} />

        {/* AI Summary preview */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#4A4E66",
              marginBottom: 8,
            }}
          >
            AI 요약 — 프로덕트 주간 회의
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #EFEFF4",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#4A4E66",
                lineHeight: 1.6,
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600, color: "#0F1226" }}>
                결정사항
              </span>
              <br />
              • 디자인 시스템 v2 다음 주 스프린트 반영
              <br />• API 응답시간 목표 200ms 이하 재확인
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 10, color: "#8B8FA4" }}>
                Claude AI로 자동 요약됨
              </span>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#6B5BFF",
                  cursor: "pointer",
                }}
              >
                공유 →
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div
      style={{ background: "#F8F8FA", color: "#0F1226", minHeight: "100vh" }}
    >
      <style>{responsive}</style>

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.88)",
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
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0F1226" }}>
              AURA
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#6B5BFF",
                background: "#F4F2FF",
                border: "1px solid #ECE9FF",
                padding: "1px 6px",
                borderRadius: 4,
                letterSpacing: "0.04em",
              }}
            >
              BUSINESS
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/"
              style={{
                fontSize: 13,
                color: "#8B8FA4",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              ← AURA 앱
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                color: "#4A4E66",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="lp-nav-cta"
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
              무료 체험 →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        className="lp-hero-wrap"
        style={{ background: "#fff", padding: "0 32px" }}
      >
        <div
          className="lp-hero"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gap: 64,
            alignItems: "center",
            minHeight: 620,
          }}
        >
          {/* Left text */}
          <div className="lp-hero-text">
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
                AI 회의 자동화 플랫폼
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(38px, 4.5vw, 60px)",
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: "-0.03em",
                color: "#0F1226",
                margin: "0 0 20px",
              }}
            >
              회의 준비부터
              <br />
              정리까지,
              <br />
              <span style={{ color: "#6B5BFF" }}>자동으로.</span>
            </h1>

            <p
              style={{
                fontSize: 17,
                color: "#4A4E66",
                lineHeight: 1.7,
                maxWidth: 420,
                margin: "0 0 36px",
              }}
            >
              캘린더 브리핑, 실시간 기록, Claude AI 요약, 팀 공유까지 — 회의의
              모든 흐름을 하나로 연결합니다.
            </p>

            <div
              className="lp-cta-row"
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 48,
              }}
            >
              <Link
                href="/login"
                style={{
                  display: "inline-block",
                  background: "#6B5BFF",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "13px 28px",
                  borderRadius: 12,
                  letterSpacing: "0.01em",
                  boxShadow: "0 4px 16px rgba(107,91,255,.4)",
                }}
              >
                14일 무료 체험 시작
              </Link>
              <Link
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#4A4E66",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                로그인 <span style={{ color: "#8B8FA4" }}>→</span>
              </Link>
            </div>

            {/* Social proof mini */}
            <div
              className="lp-stats"
              style={{ display: "flex", alignItems: "center", gap: 16 }}
            >
              {[
                { val: "14일", label: "무료 체험" },
                { val: "5분", label: "초기 설정" },
                { val: "100%", label: "자동화" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div
                    style={{ fontSize: 18, fontWeight: 800, color: "#0F1226" }}
                  >
                    {s.val}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#8B8FA4", fontWeight: 500 }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: product mockup */}
          <div className="lp-mock" style={{ justifyContent: "center" }}>
            <ProductMock />
          </div>
        </div>
      </section>

      {/* ── Divider strip ──────────────────────────────────────────── */}
      <div
        className="lp-strip"
        style={{
          borderTop: "1px solid #EFEFF4",
          borderBottom: "1px solid #EFEFF4",
          background: "#fff",
          padding: "24px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          {[
            "Google 캘린더 연동",
            "Claude AI 자동 요약",
            "실시간 음성 자막",
            "팀 공유 링크",
            "Gmail 브리핑",
          ].map((item, i) => (
            <div
              key={item}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              {i > 0 && (
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "#D1D0DC",
                  }}
                />
              )}
              <span style={{ fontSize: 13, color: "#4A4E66", fontWeight: 500 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="lp-sec" style={{ padding: undefined }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontSize: "clamp(28px, 3vw, 40px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#0F1226",
                margin: "0 0 12px",
              }}
            >
              회의의 모든 단계를 커버합니다
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#4A4E66",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              준비, 진행, 정리, 공유 — 어느 단계도 놓치지 않습니다
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                emoji: "🔔",
                tag: "사전 준비",
                title: "30분 전 자동 브리핑",
                desc: "회의 시작 30분 전, 참석자 정보·안건·관련 메일을 자동으로 정리해 푸시 알림으로 전달합니다.",
                accent: "#6B5BFF",
                bg: "#F4F2FF",
              },
              {
                emoji: "📝",
                tag: "회의 진행",
                title: "실시간 회의록 작성",
                desc: "5가지 템플릿(일반·스탠드업·1:1·고객·프로젝트) 중 선택하고, 음성 자막과 함께 노트를 기록합니다.",
                accent: "#0F1226",
                bg: "#F0F0F3",
              },
              {
                emoji: "✨",
                tag: "AI 정리",
                title: "Claude AI 자동 요약",
                desc: "회의 종료 즉시 결정사항·액션아이템·다음 단계를 Claude AI가 구조화합니다.",
                accent: "#6B5BFF",
                bg: "#F4F2FF",
              },
              {
                emoji: "🔗",
                tag: "팀 공유",
                title: "로그인 없는 링크 공유",
                desc: "생성된 링크로 누구나 회의록을 열람할 수 있습니다. 별도 계정 없이도 공유 가능합니다.",
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
                  padding: "28px",
                  boxShadow: "0 1px 4px rgba(15,18,38,.05)",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: f.bg,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    marginBottom: 16,
                  }}
                >
                  {f.emoji}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: f.accent,
                    marginBottom: 6,
                    textTransform: "uppercase" as const,
                  }}
                >
                  {f.tag}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0F1226",
                    marginBottom: 8,
                    lineHeight: 1.3,
                  }}
                >
                  {f.title}
                </div>
                <div
                  style={{ fontSize: 13, color: "#4A4E66", lineHeight: 1.7 }}
                >
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature highlight — big section ─────────────────────────── */}
      <section
        className="lp-hsec"
        style={{ background: "#fff", borderTop: "1px solid #EFEFF4" }}
      >
        <div
          className="lp-hi"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gap: 80,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#6B5BFF",
                textTransform: "uppercase" as const,
                marginBottom: 12,
              }}
            >
              AI 자동 요약
            </div>
            <h2
              style={{
                fontSize: "clamp(26px, 3vw, 38px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#0F1226",
                margin: "0 0 16px",
                lineHeight: 1.2,
              }}
            >
              회의가 끝나는 순간
              <br />
              요약이 완성됩니다
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "#4A4E66",
                lineHeight: 1.75,
                margin: "0 0 32px",
              }}
            >
              회의록과 음성 자막을 분석해 결정사항, 액션아이템, 다음 단계를
              자동으로 구조화합니다. 직접 정리하는 시간을 없애드립니다.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "결정사항·액션아이템 자동 분류",
                "담당자·마감일 자동 인식",
                "다음 회의 안건 자동 제안",
              ].map((item) => (
                <div
                  key={item}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <Chk />
                  <span style={{ fontSize: 14, color: "#0F1226" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary card mock */}
          <div
            style={{
              background: "#FCFBFF",
              border: "1px solid #E8E6F4",
              borderRadius: 16,
              padding: "24px",
              boxShadow: "0 8px 32px -8px rgba(107,91,255,.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 14 }}>✨</span>
              </div>
              <div>
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: "#0F1226" }}
                >
                  AI 요약
                </div>
                <div style={{ fontSize: 10, color: "#8B8FA4" }}>
                  프로덕트 주간 회의 · 47분
                </div>
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#1FCB7A",
                  background: "rgba(31,203,122,.12)",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                완료
              </div>
            </div>

            {[
              {
                label: "결정사항",
                items: [
                  "디자인 시스템 v2 다음 스프린트 반영",
                  "API 응답시간 목표 200ms 재설정",
                ],
                color: "#6B5BFF",
              },
              {
                label: "액션아이템",
                items: [
                  "@김민준 — 컴포넌트 명세 초안 작성 (5/20)",
                  "@이수진 — 성능 테스트 환경 구축 (5/22)",
                ],
                color: "#0F1226",
              },
              {
                label: "다음 회의 안건",
                items: ["디자인 시스템 v2 데모", "API 벤치마크 결과 공유"],
                color: "#4A4E66",
              },
            ].map((section) => (
              <div key={section.label} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: section.color,
                    marginBottom: 6,
                  }}
                >
                  {section.label}
                </div>
                {section.items.map((item) => (
                  <div
                    key={item}
                    style={{
                      fontSize: 12,
                      color: "#4A4E66",
                      lineHeight: 1.6,
                      paddingLeft: 12,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 2,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "#D1D0DC",
                      }}
                    />
                    {item}
                  </div>
                ))}
              </div>
            ))}

            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid #EFEFF4",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, color: "#8B8FA4" }}>
                Claude AI · 방금 생성
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6B5BFF",
                  background: "#F4F2FF",
                  padding: "3px 10px",
                  borderRadius: 6,
                }}
              >
                팀에 공유 →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="lp-sec" style={{ padding: undefined }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              style={{
                fontSize: "clamp(26px, 3vw, 38px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#0F1226",
                margin: "0 0 12px",
              }}
            >
              3단계로 시작합니다
            </h2>
            <p style={{ fontSize: 15, color: "#4A4E66" }}>
              설정부터 첫 회의록까지 5분이면 충분합니다
            </p>
          </div>

          <div
            className="lp-steps"
            style={{
              display: "grid",
              gap: 2,
              background: "#EFEFF4",
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            {[
              {
                n: "01",
                title: "Google 계정으로 시작",
                desc: "별도 회원가입 없이 Google 계정으로 로그인하면 캘린더가 자동으로 연동됩니다.",
                detail: "5분 이내 설정 완료",
              },
              {
                n: "02",
                title: "회의를 선택하고 기록",
                desc: "오늘의 회의 목록에서 선택하거나 새로 만들어 템플릿 기반 노트를 작성합니다.",
                detail: "5가지 템플릿 제공",
              },
              {
                n: "03",
                title: "AI 요약 후 팀 공유",
                desc: "회의 종료 버튼 하나로 AI 요약이 완성됩니다. 링크를 팀에 공유하세요.",
                detail: "Claude AI 즉시 분석",
              },
            ].map((s) => (
              <div
                key={s.n}
                style={{
                  background: "#fff",
                  padding: "36px 28px",
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: "#EFEFF4",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    marginBottom: 20,
                    fontVariantNumeric: "tabular-nums" as const,
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0F1226",
                    marginBottom: 10,
                    lineHeight: 1.3,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#4A4E66",
                    lineHeight: 1.7,
                    marginBottom: 16,
                  }}
                >
                  {s.desc}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6B5BFF",
                    background: "#F4F2FF",
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 6,
                  }}
                >
                  {s.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section
        className="lp-sec"
        style={{ background: "#fff", borderTop: "1px solid #EFEFF4" }}
      >
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
              명확한 하나의 요금제
            </h2>
            <p style={{ fontSize: 15, color: "#4A4E66" }}>
              모든 기능을 제한 없이. 14일 무료로 직접 확인하세요.
            </p>
          </div>

          <div
            className="lp-price"
            style={{
              maxWidth: 840,
              margin: "0 auto",
              display: "grid",
              border: "1px solid #E8E6F0",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(15,18,38,.07)",
            }}
          >
            {/* Monthly */}
            <div style={{ padding: "40px", borderRight: "1px solid #EFEFF4" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#4A4E66",
                  marginBottom: 16,
                }}
              >
                월간 플랜
              </div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  color: "#0F1226",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                ₩19,900
                <span
                  style={{ fontSize: 15, fontWeight: 500, color: "#8B8FA4" }}
                >
                  /월
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#8B8FA4",
                  marginTop: 6,
                  marginBottom: 28,
                }}
              >
                언제든 해지 가능
              </div>
              <Link
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  border: "1.5px solid #0F1226",
                  color: "#0F1226",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "11px 0",
                  borderRadius: 10,
                }}
              >
                14일 무료 체험
              </Link>
            </div>

            {/* Yearly */}
            <div style={{ padding: "40px", background: "#0F1226" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  연간 플랜
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#6B5BFF",
                    background: "#ECE9FF",
                    padding: "2px 7px",
                    borderRadius: 4,
                  }}
                >
                  17% 절약
                </span>
              </div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                ₩199,000
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: "rgba(255,255,255,.5)",
                  }}
                >
                  /년
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,.45)",
                  marginTop: 6,
                  marginBottom: 28,
                }}
              >
                월 ₩16,583 · 2개월 무료
              </div>
              <Link
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "#6B5BFF",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "11px 0",
                  borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(107,91,255,.5)",
                }}
              >
                14일 무료 체험
              </Link>
            </div>
          </div>

          {/* Feature list */}
          <div
            className="lp-pf"
            style={{
              maxWidth: 840,
              margin: "24px auto 0",
              display: "grid",
              gap: 8,
            }}
          >
            {[
              "회의록 무제한 생성",
              "AI 요약 무제한",
              "30분 전 미팅 브리핑",
              "팀 공유 링크",
              "Gmail · 캘린더 연동",
              "신용카드 없이 체험 가능",
            ].map((item) => (
              <div
                key={item}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Chk />
                <span style={{ fontSize: 13, color: "#4A4E66" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dark CTA ────────────────────────────────────────────────── */}
      <section style={{ background: "#0F1226", padding: "96px 32px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 28px",
              boxShadow: "0 8px 32px rgba(107,91,255,.5)",
            }}
          >
            <AuraLogo size={32} />
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: "#fff",
              margin: "0 0 16px",
              lineHeight: 1.15,
            }}
          >
            다음 회의부터
            <br />
            바꿔보세요
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,.55)",
              lineHeight: 1.65,
              margin: "0 0 36px",
            }}
          >
            14일 무료 체험. 신용카드 불필요. 언제든 해지 가능합니다.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              background: "#6B5BFF",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 16,
              padding: "14px 36px",
              borderRadius: 14,
              boxShadow: "0 4px 20px rgba(107,91,255,.5)",
            }}
          >
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        style={{
          background: "#0F1226",
          borderTop: "1px solid rgba(255,255,255,.07)",
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
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AuraLogo size={18} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,.7)",
              }}
            >
              AURA Business
            </span>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
            © 2026 AURA · 회의 자동화 플랫폼
          </span>
        </div>
      </footer>
    </div>
  );
}
