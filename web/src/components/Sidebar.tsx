"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AuraLogo from "./AuraLogo";

const navItems = [
  {
    href: "/dashboard",
    label: "대시보드",
    desc: "오늘 회의 · 최근 기록",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
      </svg>
    )
  },
  {
    href: "/meetings",
    label: "회의록",
    desc: "기록 · 요약 · 공유",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-3 2v-2H3a1 1 0 0 1-1-1V3Z" fill="currentColor" opacity=".9"/>
        <path d="M5 5.5h6M5 8h4" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    href: "/settings",
    label: "설정",
    desc: "계정 · 구독 · 알림",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
      </svg>
    )
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initial = (user?.name?.[0] ?? "A").toUpperCase();

  return (
    <aside
      className="w-[200px] flex-none flex flex-col"
      style={{ background: "var(--surface)", borderRight: "1px solid var(--line)" }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-5">
        <div className="flex items-center gap-2">
          <AuraLogo size={28} />
          <div>
            <p className="text-sm font-bold leading-none" style={{ color: "var(--text)" }}>AURA</p>
            <p className="text-[10px] font-medium leading-none mt-0.5" style={{ color: "var(--aurora)" }}>Business</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.desc}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] transition-all group"
              style={{
                background: active ? "var(--aurora-soft)" : "transparent",
                color: active ? "var(--aurora)" : "var(--text-muted)"
              }}
            >
              <span className="flex-none" style={{ color: active ? "var(--aurora)" : "var(--text-muted)" }}>
                {item.icon}
              </span>
              <span className="text-[13px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* New Meeting CTA */}
      <div className="px-3 pb-3">
        <Link
          href="/meetings/new"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--aurora)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          새 회의 시작
        </Link>
      </div>

      {/* User profile */}
      {user && (
        <div
          className="px-3 py-3"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <div className="flex items-center gap-2">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-none" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex-none flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "var(--aurora)" }}
              >
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate leading-tight" style={{ color: "var(--text)" }}>{user.name}</p>
              {user.accountType === "business" && (
                <p className="text-[10px] leading-tight" style={{ color: "var(--aurora)" }}>Business</p>
              )}
            </div>
            <button
              onClick={() => void logout()}
              title="로그아웃"
              className="flex-none p-1 rounded-md transition-colors hover:bg-[var(--surface-muted)]"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 10l3-3-3-3M12 7H5M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
