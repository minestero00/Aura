"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  accountType: "personal" | "business";
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {}
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchMe(accessToken: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      user: {
        id: string;
        email: string | null;
        name: string;
        avatarUrl: string | null;
        accountType?: "personal" | "business";
      };
    };
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      avatarUrl: data.user.avatarUrl,
      accountType: data.user.accountType ?? "personal"
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSession = useCallback(async (accessToken: string | null) => {
    if (!accessToken) {
      setUser(null);
      return;
    }
    const me = await fetchMe(accessToken);
    if (me) {
      setUser(me);
      return;
    }
    // 백엔드 미응답 시 Supabase 세션의 user 정보로 fallback
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email ?? null,
        name: data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? "User",
        avatarUrl: data.user.user_metadata?.avatar_url ?? null,
        accountType: "personal"
      });
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session?.access_token ?? null).finally(() => setLoading(false));
    });

    // 세션 변경 감지 (로그인/로그아웃/토큰 갱신)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, [syncSession]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" }
      }
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext>
  );
}

// 현재 세션의 access token 반환 (API 호출용)
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
