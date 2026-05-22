import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiRequestError extends Error {
  status: number;
  code: string;
  /** 백엔드가 응답 body에 추가로 보낸 데이터 (예: 412의 `current` 회의록). */
  data: Record<string, unknown>;
  constructor(status: number, body: { error: string; message?: string } & Record<string, unknown>) {
    super(body.message ?? body.error);
    this.status = status;
    this.code = body.error;
    this.data = body;
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

// 일부 endpoint에서는 If-Match 같은 커스텀 헤더가 필요 → 명시적으로 받는 오버로드.
export const api = {
  get:    <T>(path: string, headers?: Record<string, string>)                 => request<T>(path, { headers }),
  post:   <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>(path, { method: "POST",  body: body ? JSON.stringify(body) : undefined, headers }),
  patch:  <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined, headers }),
  delete: <T>(path: string, headers?: Record<string, string>)                 => request<T>(path, { method: "DELETE", headers })
};

/**
 * FormData(multipart/upload) 전용. JSON 헬퍼와 별개 — Content-Type을 browser가
 * boundary와 함께 자동 설정해야 하므로 우리는 절대 지정 X.
 */
export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = await (await import("./supabase")).supabase.auth.getSession().then(r => r.data.session?.access_token ?? null);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: "unknown" }))) as { error: string; message?: string } & Record<string, unknown>;
    throw new ApiRequestError(res.status, body);
  }
  return res.json() as Promise<T>;
}
