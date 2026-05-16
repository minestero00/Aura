import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import Stagger from "@/components/Stagger";
import LineIcon, { type LineIconName } from "@/components/LineIcon";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "소개 — AURA",
  description: "AURA가 만들어진 이유와 우리가 믿는 것들.",
};

const VALUES = [
  {
    num: "01",
    title: "명확함",
    en: "Clarity",
    desc: "우리는 정보를 늘리지 않습니다. 줄입니다. 아침에 필요한 건 더 많은 알림이 아니라, 지금 이 순간 가장 중요한 것 하나입니다. AURA는 복잡한 세상을 단 하나의 명확한 브리핑으로 정제합니다.",
    accent: "#6B5BFF",
    bg: "#F4F2FF",
  },
  {
    num: "02",
    title: "맥락",
    en: "Context",
    desc: "일정, 날씨, 뉴스, 메일은 각각 다른 앱에서 따로 확인하는 것들이었습니다. AURA는 이것들을 하나의 맥락으로 묶습니다. AI는 '오늘 비가 오고 중요한 회의가 있으며 읽지 않은 중요 메일이 있다'는 사실을 동시에 이해합니다.",
    accent: "#34D2FF",
    bg: "#E8FBFF",
  },
  {
    num: "03",
    title: "시간",
    en: "Time",
    desc: "당신의 시간은 소중합니다. AI가 할 수 있는 일은 AI가 합니다. 여러 앱을 번갈아 열고, 정보를 취합하고, 중요도를 판단하는 것 — 그건 이제 AURA의 몫입니다. 당신은 실제로 중요한 일에 집중하세요.",
    accent: "#1FCB7A",
    bg: "#E8FBF2",
  },
  {
    num: "04",
    title: "신뢰",
    en: "Trust",
    desc: "AI는 당신을 대신하는 것이 아닙니다. 당신이 더 좋은 판단을 내릴 수 있도록 돕는 것입니다. AURA는 투명하게 동작하고, 수집하는 데이터를 명확히 설명하며, 당신의 정보를 절대 광고에 활용하지 않습니다.",
    accent: "#FF9500",
    bg: "#FFF4E0",
  },
];

const PRINCIPLES: { icon: LineIconName; title: string; desc: string }[] = [
  {
    icon: "zap",
    title: "기능보다 경험",
    desc: "기능 목록을 채우는 것이 목표가 아닙니다. 매일 아침, 앱을 열었을 때 '아, 이게 있어서 다행이다'는 느낌을 드리는 것이 목표입니다.",
  },
  {
    icon: "search",
    title: "단순함은 어렵다",
    desc: "하나의 화면에 모든 것을 담는 건 쉽습니다. 하나의 화면에 꼭 필요한 것만 담는 건 어렵습니다. 우리는 덜어내는 데 더 많은 시간을 씁니다.",
  },
  {
    icon: "sparkles",
    title: "AI는 도구다",
    desc: "Claude AI는 AURA의 뇌가 아닙니다. 도구입니다. 판단은 여전히 당신 몫입니다. AI는 가능성을 보여주고, 선택은 사람이 합니다.",
  },
  {
    icon: "lock",
    title: "프라이버시 우선",
    desc: "Gmail, 캘린더에 접근하지만, 그 내용을 저장하거나 학습에 사용하지 않습니다. 당신의 데이터는 당신의 것입니다.",
  },
];

export default function AboutPage() {
  return (
    <div style={{ color: "#0F1226", minHeight: "100vh" }}>

      {/* ── Manifesto Hero ─────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 32px 80px",
          borderBottom: "1px solid #EFEFF4",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Background gradient orb */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 500,
            background:
              "radial-gradient(ellipse at center, rgba(107,91,255,.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

          <div
            style={{
              maxWidth: 800,
              margin: "0 auto",
              position: "relative",
            }}
          >
            <Stagger baseDelay={0.1} step={0.18} direction="up">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#F4F2FF",
                border: "1px solid #DDD9FF",
                borderRadius: 9999,
                padding: "6px 16px",
                marginBottom: 36,
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
                AURA 소개
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(38px, 5.5vw, 68px)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "#0F1226",
                margin: "0 0 28px",
                lineHeight: 1.08,
              }}
            >
              우리는 아침을
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #6B5BFF 20%, #34D2FF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                다시 디자인했습니다
              </span>
            </h1>

            <p
              style={{
                fontSize: "clamp(17px, 2vw, 22px)",
                color: "#4A4E66",
                lineHeight: 1.75,
                maxWidth: 620,
                margin: "0 0 48px",
                fontWeight: 400,
              }}
            >
              평균적인 직장인은 아침마다 6개의 앱을 열고, 37개의 알림을
              확인하며, 22분을 정보 취합에 씁니다. 그 22분이 아깝습니다.
              <br />
              <br />
              AURA는 그 22분을 돌려드리기 위해 만들어졌습니다.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "2026년 출시", value: "" },
                { label: "iOS · Android", value: "" },
                { label: "Claude AI 탑재", value: "" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="pub-chip"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#F8F8FA",
                    border: "1px solid #E8E6F0",
                    borderRadius: 9999,
                    padding: "8px 18px",
                    cursor: "default",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#1FCB7A",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{ fontSize: 13, fontWeight: 500, color: "#4A4E66" }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            </Stagger>
          </div>
      </section>

      {/* ── The Problem ─────────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px 32px",
          background: "#0F1226",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -200,
            width: 600,
            height: 600,
            background:
              "radial-gradient(ellipse at center, rgba(107,91,255,.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative" }}>
          <FadeIn direction="up">
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(255,255,255,.3)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 32,
              }}
            >
              문제 인식
            </p>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 52px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#fff",
                lineHeight: 1.15,
                margin: "0 0 40px",
              }}
            >
              정보는 많아졌지만
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #6B5BFF, #34D2FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                명확해지지 않았습니다
              </span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.1} direction="up">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 24,
                marginBottom: 48,
              }}
            >
              {[
                { stat: "6개", desc: "매일 아침 확인하는 앱 수" },
                { stat: "37개", desc: "기상 직후 평균 알림 수" },
                { stat: "22분", desc: "정보 취합에 쓰는 시간" },
              ].map((item) => (
                <div
                  key={item.stat}
                  className="pub-card"
                  style={{
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 16,
                    padding: "28px 24px",
                    cursor: "default",
                  }}
                >
                  <p
                    style={{
                      fontSize: "clamp(36px, 4vw, 48px)",
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      color: "#fff",
                      margin: "0 0 8px",
                      background: "linear-gradient(90deg, #6B5BFF, #34D2FF)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {item.stat}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,.5)",
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={0.2} direction="up">
            <p
              style={{
                fontSize: "clamp(16px, 2vw, 20px)",
                color: "rgba(255,255,255,.6)",
                lineHeight: 1.8,
                maxWidth: 680,
              }}
            >
              스마트폰이 생겨났고, 앱이 늘어났으며, 알림은 폭발적으로
              증가했습니다. 하지만 정작 "오늘 내가 알아야 할 가장 중요한 것"을
              한 눈에 보여주는 앱은 없었습니다. 우리는 그 빈자리를 채우기로
              했습니다.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Values ──────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <FadeIn direction="up">
            <div style={{ marginBottom: 72 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#8B8FA4",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                우리가 믿는 것
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px, 3.5vw, 46px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#0F1226",
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                네 가지 핵심 가치
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {VALUES.map((v, i) => (
              <FadeIn key={v.num} delay={i * 0.08}>
                <div
                  className="pub-value-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr",
                    gap: 48,
                    padding: "48px 0",
                    borderTop: "1px solid #EFEFF4",
                    alignItems: "start",
                    borderBottom:
                      i === VALUES.length - 1 ? "1px solid #EFEFF4" : "none",
                    cursor: "default",
                    transition: "background 0.2s, padding 0.2s",
                    borderRadius: 4,
                  }}
                >
                  {/* Left: number + label */}
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#8B8FA4",
                        margin: "0 0 12px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {v.num}
                    </p>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: v.bg,
                        borderRadius: 10,
                        padding: "8px 14px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: v.accent,
                        }}
                      >
                        {v.title}
                      </span>
                      <span
                        style={{ fontSize: 11, color: v.accent, opacity: 0.6 }}
                      >
                        {v.en}
                      </span>
                    </div>
                  </div>
                  {/* Right: description */}
                  <div>
                    <p
                      style={{
                        fontSize: "clamp(16px, 1.8vw, 20px)",
                        color: "#4A4E66",
                        lineHeight: 1.8,
                        margin: 0,
                        maxWidth: 680,
                      }}
                    >
                      {v.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How we build ────────────────────────────────────────────── */}
      <section
        style={{
          background: "#F8F8FA",
          borderTop: "1px solid #EFEFF4",
          borderBottom: "1px solid #EFEFF4",
          padding: "100px 32px",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 96,
              alignItems: "start",
            }}
          >
            {/* Left */}
            <div>
              <FadeIn direction="right">
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#8B8FA4",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  우리의 방식
                </p>
                <h2
                  style={{
                    fontSize: "clamp(26px, 3vw, 42px)",
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    color: "#0F1226",
                    margin: "0 0 24px",
                    lineHeight: 1.2,
                  }}
                >
                  제품을 만드는
                  <br />
                  원칙들
                </h2>
                <p
                  style={{
                    fontSize: 16,
                    color: "#4A4E66",
                    lineHeight: 1.8,
                    margin: 0,
                  }}
                >
                  우리는 기능을 추가하는 것보다 덜어내는 것에 더 신중합니다.
                  좋은 제품은 많은 것을 하는 게 아니라, 필요한 것을 완벽하게
                  합니다.
                </p>
              </FadeIn>
            </div>

            {/* Right: principles */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {PRINCIPLES.map((p, index) => (
                <FadeIn key={p.title} delay={index * 0.07} direction="up">
                  <div
                    className="pub-card"
                    style={{
                      background: "#fff",
                      border: "1px solid #E8E6F0",
                      borderRadius: 16,
                      padding: "24px",
                      display: "flex",
                      gap: 18,
                      alignItems: "flex-start",
                      cursor: "default",
                    }}
                  >
                    <div
                      className="pub-icon-wrap"
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
                      <LineIcon name={p.icon} size={26} strokeWidth={1.8} />
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
                        {p.title}
                      </p>
                      <p
                        style={{
                          fontSize: 13.5,
                          color: "#4A4E66",
                          lineHeight: 1.65,
                          margin: 0,
                        }}
                      >
                        {p.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote / Mission statement ────────────────────────────────── */}
      <section
        style={{
          padding: "100px 32px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            height: 400,
            background:
              "radial-gradient(ellipse at center, rgba(107,91,255,.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <FadeIn direction="up">
          <div
            style={{ maxWidth: 740, margin: "0 auto", position: "relative" }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#8B8FA4",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 28,
              }}
            >
              우리의 미션
            </p>
            <blockquote
              style={{
                fontSize: "clamp(24px, 3.5vw, 40px)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#0F1226",
                lineHeight: 1.4,
                margin: "0 0 40px",
                fontStyle: "normal",
              }}
            >
              "모든 사람이 하루를 시작할 때<br />
              무엇이 중요한지 즉시 알 수 있도록."
            </blockquote>
            <p
              style={{
                fontSize: 16,
                color: "#4A4E66",
                lineHeight: 1.75,
                margin: "0 0 48px",
              }}
            >
              AURA는 AI 비서가 모든 사람의 아침을 더 명확하고 효율적으로 만드는
              미래를 믿습니다. 그 미래는 지금, 당신의 스마트폰에서 시작됩니다.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/"
                className="pub-btn pub-btn-aurora"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#6B5BFF",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "13px 28px",
                  borderRadius: 12,
                  boxShadow: "0 4px 20px rgba(107,91,255,.35)",
                }}
              >
                AURA 시작하기
              </Link>
              <Link
                href="/features"
                className="pub-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F0EFF8",
                  color: "#0F1226",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "13px 28px",
                  borderRadius: 12,
                }}
              >
                기능 살펴보기
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Tech stack ──────────────────────────────────────────────── */}
      {/* <section
        style={{
          padding: "64px 32px",
          background: "#F8F8FA",
          borderTop: "1px solid #EFEFF4",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <FadeIn direction="up">
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#8B8FA4",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            Built with
          </p>
          </FadeIn>
          <FadeIn delay={0.1}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              "Claude AI (Anthropic)",
              "React Native",
              "Next.js",
              "Express",
              "Supabase",
              "Railway",
              "Vercel",
              "Slack API",
              "GitHub API",
            ].map((tech) => (
              <div
                key={tech}
                className="pub-chip"
                style={{
                  background: "#fff",
                  border: "1px solid #E8E6F0",
                  borderRadius: 9999,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#4A4E66",
                  cursor: "default",
                }}
              >
                {tech}
              </div>
            ))}
          </div>
          </FadeIn>
        </div>
      </section> */}

    </div>
  );
}
