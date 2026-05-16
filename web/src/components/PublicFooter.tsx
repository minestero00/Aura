import Link from "next/link";
import AuraLogo from "./AuraLogo";

const footerCss = `
  .pub-footer-grid { grid-template-columns: 1.5fr 1fr 1fr 1fr; }
  .pub-footer-link { transition: color 0.15s; }
  .pub-footer-link:hover { color: rgba(255,255,255,.85) !important; }
  @media (max-width: 768px) {
    .pub-footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
  }
  @media (max-width: 480px) {
    .pub-footer-grid { grid-template-columns: 1fr; }
  }
`;

const FOOTER_COLS = [
  {
    heading: "제품",
    links: [
      { label: "앱 기능", href: "/features" },
      { label: "Slack Bot", href: "/slack" },
      { label: "Business", href: "/business" },
      { label: "가격", href: "/pricing" },
    ],
  },
  {
    heading: "사용 방법",
    links: [
      { label: "앱 다운로드", href: "/#download" },
      { label: "Slack 연결하기", href: "/slack" },
      { label: "Business 시작하기", href: "/business" },
    ],
  },
  {
    heading: "계정",
    links: [
      { label: "로그인", href: "/login" },
      { label: "대시보드", href: "/dashboard" },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer style={{ background: "#0F1226", padding: "64px 32px 32px" }}>
      <style>{footerCss}</style>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        {/* Top: logo + cols */}
        <div
          className="pub-footer-grid"
          style={{
            display: "grid",
            gap: 48,
            marginBottom: 48,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <AuraLogo size={36} />
              <span
                style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}
              >
                AURA
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,.45)",
                lineHeight: 1.7,
                maxWidth: 220,
              }}
            >
              하루를 시작하는 가장 스마트한 방법.
              <br />
              AI가 정리하는 나만의 아침 브리핑.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.3)",
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {col.heading}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="pub-footer-link"
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,.5)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,.08)",
            paddingTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.2)" }}>
            © 2026 AURA · AI 개인 비서
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {["개인정보처리방침", "이용약관"].map((label) => (
              <Link
                key={label}
                href="#"
                style={{ fontSize: 12, color: "rgba(255,255,255,.25)", textDecoration: "none" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
