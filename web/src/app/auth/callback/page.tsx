"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase가 URL에서 code를 파싱하고 세션을 저장할 때까지 잠깐 대기
    const handle = async () => {
      // PKCE flow: code exchange
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Auth callback error:", error.message);
        router.replace("/login");
        return;
      }
      if (data.session) {
        router.replace("/dashboard");
      } else {
        // 세션이 없으면 URL hash에서 직접 파싱 시도 (implicit flow)
        // Supabase가 자동으로 처리하므로 잠깐 기다렸다가 재확인
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          router.replace(d2.session ? "/dashboard" : "/login");
        }, 500);
      }
    };
    void handle();
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ background: "var(--bg)" }}
    >
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>로그인 처리 중…</p>
    </div>
  );
}
