import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import Stagger from "@/components/Stagger";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "가격 — AURA",
  description: "개인부터 팀까지, AURA의 간단한 가격 정책",
};

const PLANS = [
  {
    name: "Free",
    price: "₩0",
    period: "",
    desc: "개인 사용자를 위한 AI 브리핑",
    highlight: false,
    badge: null,
    features: [
      { label: "AI 일일 브리핑", included: true },
      { label: "날씨·일정·뉴스 요약", included: true },
      { label: "Gmail 요약 (10건/일)", included: true },
      { label: "AURA Chat", included: true },
      { label: "스마트 알림", included: true },
      { label: "회의록 작성", included: false },
      { label: "AI 회의 요약", included: false },
      { label: "팀 공유 링크", included: false },
      { label: "Slack 알림 (Business)", included: false },
    ],
    cta: "앱 다운로드",
    ctaHref: "#",
    ctaStyle: "secondary",
  },
  {
    name: "Business",
    price: "₩19,900",
    period: "/ 월",
    yearPrice: "₩199,000",
    yearPeriod: "/ 년 (17% 절약)",
    desc: "팀 회의를 자동화하는 올인원 플랜",
    highlight: true,
    badge: "인기",
    features: [
      { label: "Free 모든 기능", included: true },
      { label: "Gmail 요약 무제한", included: true },
      { label: "실시간 회의록 작성 (5가지 템플릿)", included: true },
      { label: "Claude AI 자동 요약 & 액션아이템", included: true },
      { label: "팀 공유 링크 (로그인 불필요)", included: true },
      { label: "회의록 내보내기 (MD · Word)", included: true },
      { label: "Slack 알림 (회의 전 자동)", included: true },
      { label: "우선 고객지원", included: true },
    ],
    cta: "14일 무료 시작",
    ctaHref: "/login",
    ctaStyle: "primary",
  },
  {
    name: "Slack Bot",
    price: "무료",
    period: "베타",
    desc: "개발팀 GitHub 일일 다이제스트",
    highlight: false,
    badge: "베타",
    badgeColor: "#34D2FF",
    features: [
      { label: "GitHub Organization 레포 연동", included: true },
      { label: "커밋·PR AI 요약 (Claude 기반)", included: true },
      { label: "Slack @멘션 자동 매핑", included: true },
      { label: "릴리즈 노트 자동 알림", included: true },
      { label: "/aura brief 슬래시 커맨드", included: true },
      { label: "원하는 시각·요일 스케줄 설정", included: true },
      { label: "멀티 레포 지원", included: true },
    ],
    cta: "Slack에 연결하기",
    ctaHref: "/slack",
    ctaStyle: "secondary",
  },
];

const FAQS = [
  {
    q: "신용카드 없이 시작할 수 있나요?",
    a: "Business 플랜 14일 무료 체험은 신용카드 없이 시작할 수 있습니다. 체험 기간 종료 후 결제 정보를 입력하지 않으면 자동으로 Free 플랜으로 전환됩니다.",
  },
  {
    q: "Slack Bot은 언제까지 무료인가요?",
    a: "현재 베타 기간 동안은 완전 무료로 운영됩니다. 베타 종료 후 유료 전환 시 기존 사용자에게 사전 공지 및 할인 혜택을 제공할 예정입니다.",
  },
  {
    q: "Business 플랜은 1명당 요금인가요?",
    a: "현재는 계정당 요금입니다. 팀 전체 플랜은 추후 출시 예정입니다.",
  },
  {
    q: "구독 취소는 언제든 가능한가요?",
    a: "언제든 앱 설정에서 구독을 취소할 수 있습니다. 취소 후에도 결제 기간 만료일까지 Business 기능을 계속 사용할 수 있습니다.",
  },
];

export default function PricingPage() {
  return (
    <div style={{ color: "#0F1226", minHeight: "100vh" }}>

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(180deg, #F4F2FF 0%, #fff 100%)",
          borderBottom: "1px solid #EFEFF4",
          padding: "80px 32px 56px",
          textAlign: "center",
        }}
      >
        <Stagger baseDelay={0.1} step={0.2} direction="up">
        <h1
          style={{
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#0F1226",
            margin: "0 0 14px",
            lineHeight: 1.15,
          }}
        >
          간단한 가격,
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #6B5BFF, #34D2FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            숨겨진 비용 없음
          </span>
        </h1>
        <p style={{ fontSize: 17, color: "#4A4E66", margin: 0 }}>
          14일 무료 체험 · 신용카드 불필요 · 언제든 취소 가능
        </p>
        </Stagger>
      </section>

      {/* Plans */}
      <section style={{ padding: "64px 32px", background: "#F8F8FA" }}>
        <div
          style={{
            maxWidth: 1060,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 0.08} direction="up">
            <div
              style={{
                background: plan.highlight ? "#0F1226" : "#fff",
                border: `1.5px solid ${plan.highlight ? "#6B5BFF" : "#E8E6F0"}`,
                borderRadius: 22,
                padding: "36px 32px",
                position: "relative",
                boxShadow: plan.highlight
                  ? "0 12px 40px rgba(107,91,255,.3)"
                  : "0 1px 4px rgba(15,18,38,.04)",
              }}
            >
              {plan.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: -13,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: plan.badgeColor ?? "#6B5BFF",
                    color: plan.badgeColor === "#34D2FF" ? "#0F1226" : "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 14px",
                    borderRadius: 9999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {plan.badge}
                </span>
              )}

              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: plan.highlight ? "rgba(255,255,255,.4)" : "#8B8FA4",
                  margin: "0 0 10px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {plan.name}
              </p>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: "clamp(30px, 3vw, 40px)",
                    fontWeight: 900,
                    color: plan.highlight ? "#fff" : "#0F1226",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span
                    style={{
                      fontSize: 14,
                      color: plan.highlight ? "rgba(255,255,255,.4)" : "#8B8FA4",
                    }}
                  >
                    {plan.period}
                  </span>
                )}
              </div>

              {plan.yearPrice && (
                <p
                  style={{
                    fontSize: 12,
                    color: plan.highlight ? "rgba(255,255,255,.35)" : "#8B8FA4",
                    margin: "0 0 8px",
                  }}
                >
                  연간: {plan.yearPrice} {plan.yearPeriod}
                </p>
              )}

              <p
                style={{
                  fontSize: 13,
                  color: plan.highlight ? "rgba(255,255,255,.5)" : "#4A4E66",
                  margin: "0 0 28px",
                  lineHeight: 1.5,
                }}
              >
                {plan.desc}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                {plan.features.map((f) => (
                  <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: f.included
                          ? plan.highlight
                            ? "rgba(107,91,255,.25)"
                            : "#F4F2FF"
                          : plan.highlight
                          ? "rgba(255,255,255,.06)"
                          : "#F0F0F3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        flexShrink: 0,
                        color: f.included
                          ? plan.highlight
                            ? "#8E76FF"
                            : "#6B5BFF"
                          : plan.highlight
                          ? "rgba(255,255,255,.2)"
                          : "#C0C0C8",
                      }}
                    >
                      {f.included ? "✓" : "—"}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: f.included
                          ? plan.highlight
                            ? "rgba(255,255,255,.8)"
                            : "#4A4E66"
                          : plan.highlight
                          ? "rgba(255,255,255,.25)"
                          : "#B0B3C4",
                        textDecoration: f.included ? "none" : "none",
                      }}
                    >
                      {f.label}
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
                  textDecoration: "none",
                  padding: "13px",
                  borderRadius: 12,
                  ...(plan.ctaStyle === "primary"
                    ? {
                        background: "#6B5BFF",
                        color: "#fff",
                        boxShadow: "0 4px 16px rgba(107,91,255,.4)",
                      }
                    : plan.highlight
                    ? {
                        background: "rgba(255,255,255,.1)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,.2)",
                      }
                    : {
                        background: "#F0EFF8",
                        color: "#0F1226",
                      }),
                }}
              >
                {plan.cta}
              </Link>
            </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "80px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <FadeIn direction="up">
          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 34px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: "#0F1226",
              margin: "0 0 40px",
              textAlign: "center",
            }}
          >
            자주 묻는 질문
          </h2>
          </FadeIn>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {FAQS.map((faq, i) => (
              <FadeIn key={faq.q} delay={i * 0.06} direction="up">
              <div
                style={{
                  background: "#F8F8FA",
                  border: "1px solid #E8E6F0",
                  borderRadius: 16,
                  padding: "24px",
                }}
              >
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#0F1226",
                    margin: "0 0 10px",
                  }}
                >
                  {faq.q}
                </p>
                <p style={{ fontSize: 14, color: "#4A4E66", lineHeight: 1.7, margin: 0 }}>
                  {faq.a}
                </p>
              </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
