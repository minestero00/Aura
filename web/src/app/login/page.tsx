"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AuraLogo from "@/components/AuraLogo";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const handleLogin = async () => {
    setPending(true);
    try {
      await signInWithGoogle();
      // signInWithOAuth는 리다이렉트 — 이 줄 이후 실행 안 됨
    } catch {
      setPending(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-10"
      style={{ background: "var(--bg)" }}
    >
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="flex justify-center" style={{ filter: "drop-shadow(0 4px 16px rgba(107,91,255,.3))" }}>
          <AuraLogo size={56} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>AURA Business</h1>
        <p className="text-sm max-w-xs text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
          회의 브리핑부터 기록, AI 요약, 팀 공유까지<br />회의의 모든 것을 자동화합니다
        </p>
      </div>

      {/* Feature chips */}
      <div className="flex gap-3 flex-wrap justify-center">
        {[
          { icon: "🔔", label: "30분 전 브리핑" },
          { icon: "📝", label: "실시간 회의록" },
          { icon: "✨", label: "AI 자동 요약" }
        ].map(f => (
          <div
            key={f.label}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
          >
            <span className="text-base">{f.icon}</span>
            <span className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>{f.label}</span>
          </div>
        ))}
      </div>

      {/* Login card */}
      <div
        className="w-80 rounded-2xl p-6 flex flex-col items-center gap-5"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-float)", border: "1px solid var(--line)" }}
      >
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Google로 시작하기</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>AURA 모바일 앱과 동일한 계정 사용</p>
        </div>

        <button
          onClick={() => void handleLogin()}
          disabled={pending || loading}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-[14px] font-semibold border transition-all disabled:opacity-50"
          style={{
            background: "var(--surface)",
            borderColor: "var(--line-strong)",
            color: "var(--text)"
          }}
        >
          {pending ? (
            <span className="spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
          )}
          {pending ? "Google로 이동 중…" : "Google로 로그인"}
        </button>
      </div>

      <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
        로그인 시 이용약관 및 개인정보처리방침에 동의합니다
      </p>
    </div>
  );
}
