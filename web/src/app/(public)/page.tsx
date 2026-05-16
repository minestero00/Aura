import Link from "next/link";
import AuraLogo from "@/components/AuraLogo";
import FadeIn from "@/components/FadeIn";
import Stagger from "@/components/Stagger";
import LineIcon, { type LineIconName } from "@/components/LineIcon";

/* ── Responsive styles ──────────────────────────────────────────────── */
const css = `
  .a-hero     { grid-template-columns: 1fr 1fr; padding: 96px 32px; gap: 64px; }
  .a-phone    { display: flex; }
  .a-feats    { grid-template-columns: repeat(3, 1fr); }
  .a-biz      { grid-template-columns: 1fr 1fr; gap: 80px; }
  .a-dl-row   { flex-direction: row; }
  .a-hero-sub { text-align: left; }
  .a-sec      { padding: 96px 32px; }
  .a-slack-steps { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 768px) {
    .a-hero     { grid-template-columns: 1fr; padding: 56px 20px 48px; gap: 40px; }
    .a-phone    { display: none; }
    .a-feats    { grid-template-columns: 1fr 1fr; }
    .a-biz      { grid-template-columns: 1fr; gap: 40px; }
    .a-dl-row   { flex-direction: column; align-items: stretch; }
    .a-hero-sub { text-align: center; align-items: center; }
    .a-sec      { padding: 64px 20px; }
    .a-slack-steps { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .a-feats { grid-template-columns: 1fr; }
    .a-sec   { padding: 48px 16px; }
  }
`;

/* ── Phone mock ─────────────────────────────────────────────────────── */
function PhoneMock() {
  return (
    <div
      style={{
        width: 248,
        background: "#fff",
        borderRadius: 36,
        border: "8px solid #0F1226",
        boxShadow:
          "0 32px 80px -12px rgba(15,18,38,.38), 0 8px 24px rgba(107,91,255,.22)",
        overflow: "hidden",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
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

      <div style={{ padding: "12px 14px 20px", background: "#F8F8FA" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
          }}
        >
          <AuraLogo size={40} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0F1226" }}>
            AURA
          </span>
          <span style={{ fontSize: 10, color: "#8B8FA4", marginLeft: "auto" }}>
            목요일
          </span>
        </div>

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

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div style={{ color: "#0F1226", minHeight: "100vh" }}>
      <style>{css}</style>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        style={{ background: "transparent", borderBottom: "1px solid #EFEFF4" }}
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
          <div
            className="a-hero-sub"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Stagger baseDelay={0.1} step={0.16} direction="up">
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
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#6B5BFF" }}
                >
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
                일정 브리핑, 날씨, 뉴스, 메일 요약까지
                <br />
                아침을 여는 데 필요한 모든 정보를 AI가 한 번에 정리해드립니다.
              </p>

              <div
                className="a-dl-row"
                style={{ display: "flex", gap: 12, marginBottom: 24 }}
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
                    maxWidth: 178,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 9, opacity: 0.7 }}>
                      Download on the
                    </div>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}
                    >
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
                    maxWidth: 178,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-7.27-2.83-2.83zM.55 1.58C.21 1.9 0 2.4 0 3.06v17.88c0 .66.21 1.16.55 1.48l.08.07 10.01-10.01v-.23L.63 1.5zm20.27 8.46l-2.87-1.66-3.17 3.17 3.17 3.17 2.87-1.66c.82-.47.82-1.23 0-1.7zM4.17 1.05L16.77 8.32l-2.83 2.83z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 9, opacity: 0.7 }}>Get it on</div>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}
                    >
                      Google Play
                    </div>
                  </div>
                </a>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["무료 사용 가능", "iOS · Android", "Google 계정 연동"].map(
                  (t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#4A4E66",
                        background: "#fff",
                        border: "1px solid #E8E6F0",
                        borderRadius: 9999,
                        padding: "4px 10px",
                      }}
                    >
                      ✓ {t}
                    </span>
                  ),
                )}
              </div>
            </Stagger>
          </div>

          <FadeIn delay={0.55} direction="up">
            <div className="a-phone" style={{ justifyContent: "center" }}>
              <div className="pub-float">
                <PhoneMock />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="a-sec" id="features">
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
                하루를 더 가볍게 만드는 기능들
              </h2>
              <p style={{ fontSize: 16, color: "#4A4E66", margin: "0 0 20px" }}>
                아침 루틴을 완전히 바꿔드립니다
              </p>
              <Link
                href="/features"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6B5BFF",
                  textDecoration: "none",
                }}
              >
                모든 기능 자세히 보기 →
              </Link>
            </div>
          </FadeIn>

          <div className="a-feats" style={{ display: "grid", gap: 16 }}>
            {([
              {
                icon: "newspaper",
                title: "AI 뉴스 브리핑",
                desc: "관심 분야 뉴스를 AI가 골라 3줄로 요약. 아침마다 맞춤 뉴스레터처럼.",
              },
              {
                icon: "calendar",
                title: "일정 브리핑",
                desc: "오늘 하루 회의와 일정을 한눈에. Google 캘린더 자동 연동.",
              },
              {
                icon: "cloud-sun",
                title: "날씨 & 교통",
                desc: "출근 전 날씨와 교통 상황을 미리 확인. 우산 필요 여부까지.",
              },
              {
                icon: "mail",
                title: "Gmail 요약",
                desc: "읽지 않은 중요 메일을 AI가 선별해 핵심만 정리.",
              },
              {
                icon: "message-circle",
                title: "AURA Chat",
                desc: "Claude AI 기반 챗봇으로 질문하고, 정보를 빠르게 얻어보세요.",
              },
              {
                icon: "bell",
                title: "스마트 알림",
                desc: "정해진 시간에 맞춤 브리핑 알림. 하루 시작을 놓치지 않도록.",
              },
            ] satisfies { icon: LineIconName; title: string; desc: string }[]).map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.06}>
                <div
                  className="pub-card"
                  style={{
                    background: "#fff",
                    border: "1px solid #E8E6F0",
                    borderRadius: 16,
                    padding: "24px",
                    boxShadow: "0 1px 4px rgba(15,18,38,.04)",
                    cursor: "default",
                  }}
                >
                  <div
                    className="pub-icon-wrap"
                    style={{
                      width: 42,
                      height: 42,
                      background: "#F4F2FF",
                      borderRadius: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                      color: "#6B5BFF",
                    }}
                  >
                    <LineIcon name={f.icon} size={22} strokeWidth={1.8} />
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
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Slack Bot teaser ──────────────────────────────────────────── */}
      <section
        className="a-sec"
        style={{
          background: "#F4F2FF",
          borderTop: "1px solid #E8E4FF",
          borderBottom: "1px solid #E8E4FF",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div
            className="a-biz"
            style={{
              display: "grid",
              alignItems: "center",
            }}
          >
            <FadeIn delay={0} direction="right">
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#fff",
                    border: "1px solid #DDD9FF",
                    borderRadius: 9999,
                    padding: "5px 12px",
                    marginBottom: 24,
                  }}
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 600, color: "#6B5BFF" }}
                  >
                    For Dev Teams
                  </span>
                </div>
                <h2
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 44px)",
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                    color: "#0F1226",
                    margin: "0 0 16px",
                    lineHeight: 1.15,
                  }}
                >
                  GitHub 변경사항을
                  <br />
                  <span
                    style={{
                      background: "linear-gradient(90deg, #6B5BFF, #34D2FF)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    매일 Slack으로
                  </span>
                </h2>
                <p
                  style={{
                    fontSize: 16,
                    color: "#4A4E66",
                    lineHeight: 1.7,
                    margin: "0 0 32px",
                    maxWidth: 400,
                  }}
                >
                  선택한 레포의 어제 커밋·PR을 AI가 요약해 지정한 시각에 Slack
                  채널로 자동 전송. 팀원 GitHub 계정과 Slack 멘션을 직접 매핑해
                  누가 무엇을 했는지 한눈에.
                </p>
                <Link
                  href="/slack"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#6B5BFF",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "12px 24px",
                    borderRadius: 12,
                    boxShadow: "0 4px 16px rgba(107,91,255,.4)",
                  }}
                >
                  Slack Bot 시작하기 →
                </Link>
              </div>
            </FadeIn>

            {/* Slack preview mock */}
            <FadeIn delay={0.15} direction="left">
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E8E6F0",
                  borderRadius: 16,
                  padding: "24px",
                  boxShadow: "0 4px 16px rgba(107,91,255,.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    A
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0F1226",
                        margin: 0,
                      }}
                    >
                      AURA Bot
                    </p>
                    <p style={{ fontSize: 11, color: "#8B8FA4", margin: 0 }}>
                      오늘 09:00
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0F1226",
                    margin: "0 0 12px",
                  }}
                >
                  📋 5월 16일 개발 현황
                </p>
                {[
                  {
                    repo: "aura",
                    author: "@Minestero",
                    msg: "GitHub↔Slack 유저 매핑 + Front design Update",
                  },
                  {
                    repo: "back",
                    author: "@David Kim",
                    msg: "결제 webhook 연동 완료, 구독 상태 머신 리팩터링",
                  },
                ].map((item) => (
                  <div
                    key={item.repo}
                    style={{
                      background: "#F8F8FA",
                      borderRadius: 10,
                      padding: "10px 12px",
                      marginBottom: 8,
                      borderLeft: "3px solid #6B5BFF",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#6B5BFF",
                        margin: "0 0 3px",
                      }}
                    >
                      📁 {item.repo}
                    </p>
                    <p style={{ fontSize: 12, color: "#0F1226", margin: 0 }}>
                      <span style={{ fontWeight: 600 }}>{item.author}</span> —{" "}
                      {item.msg}
                    </p>
                  </div>
                ))}
                <p
                  style={{
                    fontSize: 11,
                    color: "#8B8FA4",
                    margin: "12px 0 0",
                    textAlign: "right",
                  }}
                >
                  커밋 12개 · PR 2개 · 2개 레포 · AURA Bot
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Business teaser ───────────────────────────────────────────── */}
      <section
        className="a-sec"
        style={{
          background: "#0F1226",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            left: "10%",
            width: 600,
            height: 500,
            background:
              "radial-gradient(ellipse, rgba(107,91,255,.18) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative" }}>
          <div
            className="a-biz"
            style={{ display: "grid", alignItems: "center" }}
          >
            <FadeIn direction="right">
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
                  회의 준비·기록·AI 요약·팀 공유까지 — 팀 전체의 회의를
                  자동화하는 비즈니스 플랜을 만나보세요.
                </p>
                <Link
                  href="/business"
                  className="pub-btn pub-shine"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#6B5BFF",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "12px 24px",
                    borderRadius: 12,
                    boxShadow: "0 4px 16px rgba(107,91,255,.5)",
                  }}
                >
                  AURA Business 알아보기 →
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.15} direction="left">
              <div
                style={{
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 20,
                  padding: "32px",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.35)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 20,
                  }}
                >
                  Business 전용 기능
                </div>
                {([
                  { icon: "file-text", label: "실시간 회의록 작성 (5가지 템플릿)" },
                  {
                    icon: "sparkles",
                    label: "Claude AI 자동 요약 & 액션아이템 추출",
                  },
                  { icon: "link", label: "로그인 없는 팀 공유 링크" },
                  { icon: "bell", label: "회의 30분 전 자동 브리핑 알림" },
                  { icon: "bar-chart", label: "회의록 내보내기 (Markdown · Word)" },
                ] satisfies { icon: LineIconName; label: string }[]).map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <span style={{ flexShrink: 0, color: "#8E76FF", display: "inline-flex" }}>
                      <LineIcon name={item.icon} size={22} strokeWidth={1.8} />
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
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
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
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section
        className="a-sec"
        id="pricing"
        style={{ background: "#F8F8FA", borderTop: "1px solid #EFEFF4" }}
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
                간단한 가격 정책
              </h2>
              <p style={{ fontSize: 16, color: "#4A4E66" }}>
                개인부터 팀까지, 딱 맞는 플랜으로
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {[
              {
                name: "Free",
                price: "무료",
                desc: "개인 사용자를 위한 기본 브리핑",
                features: [
                  "AI 일일 브리핑",
                  "날씨·일정·뉴스",
                  "Gmail 요약 (10건/일)",
                  "AURA Chat",
                ],
                cta: "앱 다운로드",
                ctaHref: "#",
                highlight: false,
              },
              {
                name: "Business",
                price: "₩19,900",
                priceSub: "/ 월",
                desc: "팀을 위한 회의록 자동화",
                features: [
                  "Free 모든 기능",
                  "실시간 회의록 작성",
                  "AI 요약 & 액션아이템",
                  "팀 공유 링크",
                  "회의록 내보내기",
                  "Slack 알림",
                ],
                cta: "14일 무료 시작",
                ctaHref: "/login",
                highlight: true,
                badge: "인기",
              },
              {
                name: "Slack Bot",
                price: "무료",
                priceSub: "베타",
                desc: "개발팀 GitHub 일일 요약",
                features: [
                  "GitHub 레포 자동 요약",
                  "AI 커밋·PR 분석",
                  "Slack @멘션 매핑",
                  "릴리즈 알림",
                  "/aura brief 슬래시 커맨드",
                ],
                cta: "Slack에 연결하기",
                ctaHref: "/slack",
                highlight: false,
              },
            ].map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.08}>
                <div
                  className="pub-lift"
                  style={{
                    background: plan.highlight ? "#0F1226" : "#fff",
                    border: `1.5px solid ${
                      plan.highlight ? "#6B5BFF" : "#E8E6F0"
                    }`,
                    borderRadius: 20,
                    padding: "32px",
                    position: "relative",
                    cursor: "default",
                    boxShadow: plan.highlight
                      ? "0 8px 32px rgba(107,91,255,.3)"
                      : "0 1px 4px rgba(15,18,38,.04)",
                  }}
                >
                  {plan.badge && (
                    <span
                      style={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#6B5BFF",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 12px",
                        borderRadius: 9999,
                      }}
                    >
                      {plan.badge}
                    </span>
                  )}
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: plan.highlight
                        ? "rgba(255,255,255,.5)"
                        : "#8B8FA4",
                      margin: "0 0 8px",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {plan.name}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "clamp(28px, 3vw, 36px)",
                        fontWeight: 900,
                        color: plan.highlight ? "#fff" : "#0F1226",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {plan.price}
                    </span>
                    {plan.priceSub && (
                      <span
                        style={{
                          fontSize: 14,
                          color: plan.highlight
                            ? "rgba(255,255,255,.4)"
                            : "#8B8FA4",
                        }}
                      >
                        {plan.priceSub}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: plan.highlight
                        ? "rgba(255,255,255,.5)"
                        : "#4A4E66",
                      margin: "0 0 24px",
                    }}
                  >
                    {plan.desc}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                      marginBottom: 28,
                    }}
                  >
                    {plan.features.map((f) => (
                      <div
                        key={f}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: plan.highlight
                              ? "rgba(107,91,255,.3)"
                              : "#F4F2FF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            flexShrink: 0,
                            color: plan.highlight ? "#8E76FF" : "#6B5BFF",
                          }}
                        >
                          ✓
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: plan.highlight
                              ? "rgba(255,255,255,.75)"
                              : "#4A4E66",
                          }}
                        >
                          {f}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={plan.ctaHref}
                    style={{
                      display: "block",
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: plan.highlight ? "#fff" : "#0F1226",
                      background: plan.highlight ? "#6B5BFF" : "#F0EFF8",
                      textDecoration: "none",
                      padding: "12px",
                      borderRadius: 12,
                      boxShadow: plan.highlight
                        ? "0 4px 16px rgba(107,91,255,.4)"
                        : "none",
                    }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download CTA ──────────────────────────────────────────────── */}
      <section
        className="a-sec"
        id="download"
        style={{
          background: "#fff",
          borderTop: "1px solid #EFEFF4",
          textAlign: "center",
        }}
      >
        <FadeIn direction="up">
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 22,
                background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 28px",
                boxShadow: "0 12px 32px rgba(107,91,255,.35)",
              }}
            >
              <AuraLogo size={56} />
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
              style={{ display: "flex", gap: 12, justifyContent: "center" }}
            >
              {[
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  ),
                  sub: "Download on the",
                  label: "App Store",
                },
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-7.27-2.83-2.83zM.55 1.58C.21 1.9 0 2.4 0 3.06v17.88c0 .66.21 1.16.55 1.48l.08.07 10.01-10.01v-.23L.63 1.5zm20.27 8.46l-2.87-1.66-3.17 3.17 3.17 3.17 2.87-1.66c.82-.47.82-1.23 0-1.7zM4.17 1.05L16.77 8.32l-2.83 2.83z" />
                    </svg>
                  ),
                  sub: "Get it on",
                  label: "Google Play",
                },
              ].map((btn) => (
                <a
                  key={btn.label}
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
                  {btn.icon}
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>{btn.sub}</div>
                    <div
                      style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}
                    >
                      {btn.label}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
