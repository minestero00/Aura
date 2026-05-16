import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import Stagger from "@/components/Stagger";
import BrandIcon from "@/components/BrandIcon";
import AuraLogo from "@/components/AuraLogo";
import LineIcon, { type LineIconName } from "@/components/LineIcon";
import { Metadata } from "next";

type BrandName =
  | "google-calendar"
  | "local-calendar"
  | "gmail"
  | "slack"
  | "github"
  | "anthropic"
  | "openweather";

export const metadata: Metadata = {
  title: "기능 — AURA",
  description: "AURA의 모든 기능을 자세히 알아보세요.",
};

const FEATURES = [
  {
    icon: "newspaper" as LineIconName,
    title: "AI 뉴스 브리핑",
    tag: "매일 아침",
    color: "#6B5BFF",
    bg: "#F4F2FF",
    desc: "관심 분야 키워드를 설정하면 AI가 최신 뉴스를 선별해 3줄 요약으로 제공합니다. 매일 아침 맞춤 뉴스레터처럼, 중요한 것만 빠르게.",
    details: [
      "키워드 기반 뉴스 필터링",
      "AI 3줄 요약 (Claude 기반)",
      "기술·경제·스포츠 등 카테고리 선택",
      "읽은 뉴스 자동 기억",
    ],
  },
  {
    icon: "calendar" as LineIconName,
    title: "일정 브리핑",
    tag: "Google Calendar 연동",
    color: "#0F1226",
    bg: "#F0F0F3",
    desc: "오늘 하루의 회의와 일정을 한눈에 파악하세요. Google 캘린더와 자동 연동되어 별도 입력 없이 일정을 가져옵니다.",
    details: [
      "Google Calendar 자동 연동",
      "당일·익일 일정 요약",
      "회의 30분 전 자동 알림",
      "참석자·장소·회의 링크 표시",
    ],
  },
  {
    icon: "cloud-sun" as LineIconName,
    title: "날씨 & 교통",
    tag: "위치 기반",
    color: "#34D2FF",
    bg: "#E8FBFF",
    desc: "출근 전 날씨를 미리 확인하고, 우산 필요 여부, 최고·최저 기온까지 한 번에 파악하세요.",
    details: [
      "현재 위치 기반 날씨",
      "시간별 날씨 변화",
      "우산 필요 여부 AI 판단",
      "최고·최저 기온 및 체감 온도",
    ],
  },
  {
    icon: "mail" as LineIconName,
    iconKind: "gmail" as const,
    title: "Gmail 요약",
    tag: "Gmail 연동",
    color: "#EA4335",
    bg: "#FFF0EF",
    desc: "읽지 않은 메일 중 중요한 것을 AI가 선별해 핵심 내용만 요약합니다. 받은편지함을 일일이 열지 않아도 됩니다.",
    details: [
      "Gmail OAuth 안전 연동",
      "중요 메일 AI 선별",
      "발신자·제목·핵심내용 요약",
      "최대 10건/일 (Free), 무제한 (Business)",
    ],
  },
  {
    icon: "message-circle" as LineIconName,
    iconKind: "aura" as const,
    title: "AURA Chat",
    tag: "Claude AI",
    color: "#6B5BFF",
    bg: "#F4F2FF",
    desc: "Claude AI 기반 챗봇으로 궁금한 것을 물어보세요. 브리핑 내용에 대해 추가 질문하거나, 일정 조율 도움을 받을 수 있습니다.",
    details: [
      "Claude Haiku 기반 빠른 응답",
      "브리핑 컨텍스트 활용 대화",
      "일정·날씨·뉴스 추가 질문",
      "대화 기록 유지",
    ],
  },
  {
    icon: "bell" as LineIconName,
    title: "스마트 알림",
    tag: "맞춤 스케줄",
    color: "#FF9500",
    bg: "#FFF4E0",
    desc: "원하는 시각에 맞춤 브리핑 알림을 받으세요. 아침 7시 브리핑, 회의 전 알림 등 내 일정에 맞게 설정할 수 있습니다.",
    details: [
      "원하는 시각 브리핑 알림 (iOS · Android)",
      "회의 전 자동 알림",
      "조용한 시간 설정",
      "알림 내용 커스터마이징",
    ],
  },
];

const INTEGRATIONS: { name: string; brands: BrandName[]; desc: string }[] = [
  {
    name: "캘린더",
    brands: ["google-calendar", "local-calendar"],
    desc: "Google · iOS · Android 일정 통합",
  },
  { name: "Gmail", brands: ["gmail"], desc: "메일 요약" },
  { name: "Slack", brands: ["slack"], desc: "팀 알림·GitHub 다이제스트" },
  { name: "GitHub", brands: ["github"], desc: "개발팀 커밋·PR 요약" },
  { name: "Anthropic Claude", brands: ["anthropic"], desc: "AI 요약 엔진" },
  { name: "OpenWeatherMap", brands: ["openweather"], desc: "날씨 데이터" },
];

export default function FeaturesPage() {
  return (
    <div style={{ color: "#0F1226", minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(180deg, #F4F2FF 0%, #fff 100%)",
          borderBottom: "1px solid #EFEFF4",
          padding: "80px 32px 64px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Stagger baseDelay={0.1} step={0.18} direction="up">
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
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6B5BFF" }}>
                AURA 기능 전체
              </span>
            </div>
            <h1
              style={{
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#0F1226",
                margin: "0 0 16px",
                lineHeight: 1.15,
              }}
            >
              아침을 바꾸는
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #6B5BFF, #34D2FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                6가지 기능
              </span>
            </h1>
            <p
              style={{
                fontSize: 17,
                color: "#4A4E66",
                lineHeight: 1.7,
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              일정·날씨·뉴스·메일·AI 챗까지 — 하루를 시작할 때 필요한 모든 것을
              한 앱에서.
            </p>
          </Stagger>
        </div>
      </section>

      {/* Features list */}
      <section
        style={{ padding: "80px 32px", maxWidth: 1120, margin: "0 auto" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 80 }}>
          {FEATURES.map((feat, i) => (
            <div
              key={feat.title}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 64,
                alignItems: "center",
                direction: i % 2 === 1 ? "rtl" : "ltr",
              }}
            >
              {/* Text */}
              <FadeIn delay={0.1} direction={i % 2 === 0 ? "right" : "left"}>
                <div style={{ direction: "ltr" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: feat.bg,
                      borderRadius: 9999,
                      padding: "4px 12px",
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: feat.color,
                      }}
                    >
                      {feat.tag}
                    </span>
                  </div>
                  <h2
                    style={{
                      fontSize: "clamp(24px, 2.5vw, 34px)",
                      fontWeight: 900,
                      letterSpacing: "-0.02em",
                      color: "#0F1226",
                      margin: "0 0 12px",
                      lineHeight: 1.2,
                    }}
                  >
                    {feat.title}
                  </h2>
                  <p
                    style={{
                      fontSize: 15,
                      color: "#4A4E66",
                      lineHeight: 1.75,
                      margin: "0 0 28px",
                    }}
                  >
                    {feat.desc}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {feat.details.map((d) => (
                      <div
                        key={d}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: feat.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            color: feat.color,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </span>
                        <span style={{ fontSize: 14, color: "#4A4E66" }}>
                          {d}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* Visual card */}
              <FadeIn delay={0.1} direction={i % 2 === 0 ? "left" : "right"}>
                <div style={{ direction: "ltr" }}>
                  <div
                    style={{
                      background: feat.bg,
                      borderRadius: 24,
                      padding: "40px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 220,
                      border: `1px solid ${feat.color}22`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                        height: 80,
                        color: feat.color,
                      }}
                    >
                      {"iconKind" in feat && feat.iconKind === "gmail" ? (
                        <BrandIcon name="gmail" size={68} />
                      ) : "iconKind" in feat && feat.iconKind === "aura" ? (
                        <AuraLogo size={72} />
                      ) : (
                        <LineIcon name={feat.icon} size={64} strokeWidth={1.6} />
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: feat.color,
                        textAlign: "center",
                        margin: 0,
                      }}
                    >
                      {feat.title}
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section
        style={{
          background: "#F8F8FA",
          borderTop: "1px solid #EFEFF4",
          padding: "80px 32px",
        }}
      >
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
                연동 서비스
              </h2>
              <p style={{ fontSize: 15, color: "#4A4E66" }}>
                익숙한 도구들과 바로 연결됩니다. 계속 추가되고 있어요!
              </p>
            </div>
          </FadeIn>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            {INTEGRATIONS.map((intg, i) => (
              <FadeIn key={intg.name} delay={i * 0.05} direction="up">
                <div
                  className="pub-card"
                  style={{
                    background: "#fff",
                    border: "1px solid #E8E6F0",
                    borderRadius: 16,
                    padding: "24px 16px",
                    textAlign: "center",
                    boxShadow: "0 1px 4px rgba(15,18,38,.04)",
                    cursor: "default",
                  }}
                >
                  <div
                    className="pub-icon-wrap"
                    style={{
                      height: 48,
                      margin: "0 auto 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {intg.brands.map((b, idx) => (
                      <div
                        key={b}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "#fff",
                          boxShadow:
                            "0 1px 3px rgba(15,18,38,.08), 0 0 0 1px rgba(15,18,38,.04)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          // overlap subsequent icons by ~12px for stacked look
                          marginLeft: idx === 0 ? 0 : -12,
                          zIndex: intg.brands.length - idx,
                        }}
                      >
                        <BrandIcon name={b} size={28} />
                      </div>
                    ))}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0F1226",
                      margin: "0 0 4px",
                    }}
                  >
                    {intg.name}
                  </p>
                  <p style={{ fontSize: 12, color: "#8B8FA4", margin: 0 }}>
                    {intg.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
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
              지금 바로 시작해보세요
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,.8)",
                margin: "0 0 36px",
              }}
            >
              App Store · Google Play에서 무료로 다운로드
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href="#"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  color: "#0F1226",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "12px 24px",
                  borderRadius: 12,
                }}
              >
                앱 다운로드
              </a>
              <Link
                href="/slack"
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
                Slack Bot 연결하기
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
