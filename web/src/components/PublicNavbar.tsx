"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import AuraLogo from "./AuraLogo";
import { supabase } from "@/lib/supabase";

const NAV_LINKS = [
  { label: "소개", href: "/about" },
  { label: "기능", href: "/features" },
  { label: "Slack Bot", href: "/slack" },
  { label: "Business", href: "/business" },
  { label: "가격", href: "/pricing" },
];

type SessionUser = { name: string; email: string | null; avatarUrl: string | null } | null;

function pickUser(session: { user?: { email?: string | null; user_metadata?: Record<string, unknown> } } | null): SessionUser {
  const u = session?.user;
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
  const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  return {
    name: fullName ?? u.email?.split("@")[0] ?? "User",
    email: u.email ?? null,
    avatarUrl,
  };
}

export default function PublicNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<SessionUser>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(pickUser(data.session));
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(pickUser(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // First name only — feels more natural in Korean greeting
  const firstName = user?.name?.split(" ")[0] ?? "";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header
      className="aura-public-nav"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: scrolled
          ? "rgba(255,255,255,0.96)"
          : "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${scrolled ? "#EFEFF4" : "transparent"}`,
        transition:
          "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        boxShadow: scrolled ? "0 1px 20px rgba(15,18,38,.06)" : "none",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 32px",
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            textDecoration: "none",
            transition: "opacity 0.15s",
          }}
          className="pub-btn"
        >
          <AuraLogo size={36} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#0F1226",
              letterSpacing: "-0.025em",
            }}
          >
            AURA
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="pub-nav-links" style={{ alignItems: "center", gap: 4 }}>
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`pub-nav-link${active ? " active" : ""}`}
                style={{
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#6B5BFF" : "#4A4E66",
                  textDecoration: "none",
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: active ? "#F4F2FF" : "transparent",
                  transition: "color 0.15s, background 0.15s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA + mobile toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!authReady ? (
            // reserve space — avoids layout shift while session resolves
            <div style={{ width: 92, height: 32 }} aria-hidden />
          ) : user ? (
            <Link
              href="/dashboard"
              className="pub-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#6B5BFF",
                background: "#F4F2FF",
                border: "1px solid #DDD9FF",
                textDecoration: "none",
                padding: "6px 14px 6px 6px",
                borderRadius: 9999,
                transition: "transform 0.15s, filter 0.15s, box-shadow 0.15s",
              }}
            >
              {user.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.avatarUrl}
                  alt=""
                  width={22}
                  height={22}
                  style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {firstName.charAt(0).toUpperCase() || "U"}
                </span>
              )}
              <span style={{ lineHeight: 1 }}>{firstName}님 환영합니다</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="pub-btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: "#0F1226",
                textDecoration: "none",
                padding: "8px 20px",
                borderRadius: 9,
                transition: "transform 0.15s, filter 0.15s, box-shadow 0.15s",
              }}
            >
              로그인
            </Link>
          )}

          {/* Hamburger */}
          <button
            className="pub-nav-mobile-btn"
            onClick={() => setMobileOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              padding: "6px",
              cursor: "pointer",
              display: "none",
              flexDirection: "column",
              gap: 4,
              transition: "opacity 0.15s",
            }}
            aria-label="메뉴"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 20,
                  height: 2,
                  background: "#0F1226",
                  borderRadius: 2,
                  display: "block",
                  transition: "transform 0.2s, opacity 0.2s",
                  transform:
                    mobileOpen && i === 0
                      ? "rotate(45deg) translate(4px, 4px)"
                      : mobileOpen && i === 2
                      ? "rotate(-45deg) translate(4px, -4px)"
                      : "none",
                  opacity: mobileOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <nav
        className={`pub-nav-mobile-menu${mobileOpen ? " open" : ""}`}
        style={{
          flexDirection: "column",
          padding: "8px 20px 20px",
          borderTop: "1px solid var(--line)",
          background: "#fff",
          gap: 2,
        }}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            style={{
              fontSize: 15,
              fontWeight: isActive(link.href) ? 600 : 500,
              color: isActive(link.href) ? "#6B5BFF" : "#0F1226",
              textDecoration: "none",
              padding: "11px 12px",
              borderRadius: 10,
              background: isActive(link.href) ? "#F4F2FF" : "transparent",
              display: "block",
            }}
          >
            {link.label}
          </Link>
        ))}
        <div
          style={{
            borderTop: "1px solid var(--line)",
            marginTop: 10,
            paddingTop: 12,
          }}
        >
          {authReady && user ? (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                color: "#6B5BFF",
                background: "#F4F2FF",
                border: "1px solid #DDD9FF",
                textDecoration: "none",
                padding: "11px",
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6B5BFF, #34D2FF)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {firstName.charAt(0).toUpperCase() || "U"}
              </span>
              {firstName}님 환영합니다
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: "#0F1226",
                textDecoration: "none",
                padding: "11px",
                borderRadius: 10,
              }}
            >
              로그인
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
