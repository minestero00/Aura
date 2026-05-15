import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiRequestError extends Error {
  status: number;
  code: string;
  constructor(status: number, body: { error: string; message?: string }) {
    super(body.message ?? body.error);
    this.status = status;
    this.code = body.error;
  }
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (res.status === 401) {
    // 토큰 만료 — Supabase가 자동 갱신하므로 한 번 재시도
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
          ...options.headers
        }
      });
      if (retryRes.ok) return retryRes.json() as Promise<T>;
    }
    // 갱신 실패 → 로그아웃
    await supabase.auth.signOut();
    window.location.href = "/login";
    throw new ApiRequestError(401, { error: "unauthorized" });
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: "unknown" }))) as { error: string; message?: string };
    throw new ApiRequestError(res.status, body);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body?: unknown)  => request<T>(path, { method: "POST",  body: body ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body?: unknown)  => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)                  => request<T>(path, { method: "DELETE" })
};
