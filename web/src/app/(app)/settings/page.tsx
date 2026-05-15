"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Subscription {
  id: string;
  status: "trial" | "active" | "past_due" | "cancelled" | "expired";
  plan: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  paymentProvider: string | null;
  hasBillingMethod: boolean;
}

function statusLabel(s: Subscription["status"]) {
  return {
    trial: "트라이얼",
    active: "구독 중",
    past_due: "결제 필요",
    cancelled: "취소됨",
    expired: "만료됨"
  }[s] ?? s;
}

function statusColor(s: Subscription["status"]): { bg: string; color: string } {
  return {
    trial: { bg: "var(--aurora-soft)", color: "var(--aurora)" },
    active: { bg: "rgba(31,203,122,.12)", color: "var(--success)" },
    past_due: { bg: "var(--error-soft)", color: "var(--error)" },
    cancelled: { bg: "var(--surface-muted)", color: "var(--text-muted)" },
    expired: { bg: "var(--surface-muted)", color: "var(--text-muted)" }
  }[s] ?? { bg: "var(--surface-muted)", color: "var(--text-muted)" };
}

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);

  const { data: sub, mutate } = useSWR<Subscription | null>(
    "/business/subscription",
    async (p: string) => {
      try { return await api.get<Subscription>(p); }
      catch { return null; }
    }
  );

  const handleStartTrial = async () => {
    setStartingTrial(true);
    try {
      await api.post("/business/trial-start", { plan: "business_monthly", provider: "toss" });
      await mutate();
      setTrialStarted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setStartingTrial(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("구독을 취소하시겠습니까? 현재 기간 종료 후 Business 기능이 비활성화됩니다.")) return;
    await api.post("/business/cancel");
    await mutate();
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-xl mx-auto px-6 py-6 space-y-6">
        <div>
          <h1 className="text-[17px] font-bold" style={{ color: "var(--text)" }}>설정</h1>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>계정 및 구독 관리</p>
        </div>

        {/* Profile */}
        <section
          className="rounded-[14px] p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-muted)" }}>계정</p>
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full flex-none" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex-none flex items-center justify-center font-bold text-white"
                style={{ background: "var(--aurora)" }}
              >
                {(user?.name?.[0] ?? "A").toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>{user?.name}</p>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section
          className="rounded-[14px] p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-muted)" }}>구독</p>

          {sub === undefined ? (
            <div className="h-16 skeleton rounded-[10px]" />
          ) : !sub ? (
            /* No subscription */
            <div className="space-y-3">
              <div
                className="rounded-[10px] p-4"
                style={{ background: "var(--aurora-soft)", border: "1px solid var(--aurora)" }}
              >
                <p className="text-[14px] font-bold" style={{ color: "var(--aurora)" }}>AURA Business 무료 체험</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-2)" }}>14일 무료 · 카드 없이 시작 · 언제든 취소</p>
                <ul className="mt-2.5 space-y-1">
                  {["회의 30분 전 자동 브리핑", "실시간 STT 자막", "AI 회의록 요약", "팀 공유 링크"].map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-2)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--aurora)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => void handleStartTrial()}
                disabled={startingTrial || trialStarted}
                className="w-full py-2.5 rounded-[10px] text-[14px] font-bold text-white transition-opacity disabled:opacity-60"
                style={{ background: "var(--aurora)" }}
              >
                {trialStarted ? "✓ 트라이얼 시작됨" : startingTrial ? "처리 중…" : "14일 무료 체험 시작"}
              </button>
            </div>
          ) : (
            /* Has subscription */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                    {sub.plan === "business_yearly" ? "Business 연간" : "Business 월간"}
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                    {sub.status === "trial" && sub.trialEndsAt
                      ? `트라이얼 종료: ${fmtDate(sub.trialEndsAt)}`
                      : sub.currentPeriodEnd
                        ? `다음 결제: ${fmtDate(sub.currentPeriodEnd)}`
                        : ""}
                  </p>
                </div>
                <span
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                  style={statusColor(sub.status)}
                >
                  {statusLabel(sub.status)}
                </span>
              </div>

              {sub.status === "trial" && !sub.hasBillingMethod && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5 rounded-[10px]"
                  style={{ background: "var(--warning-soft)", border: "1px solid var(--warning)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-none" style={{ color: "var(--warning)" }}>
                    <path d="M7 1L13.5 12H.5L7 1Z" fill="currentColor" opacity=".2"/>
                    <path d="M7 5.5v3M7 10h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <p className="text-[12px]" style={{ color: "#92400E" }}>
                    트라이얼 종료 전 결제 수단을 등록하세요. 등록하지 않으면 자동으로 Personal 플랜으로 전환됩니다.
                  </p>
                </div>
              )}

              {sub.status === "past_due" && (
                <div
                  className="px-3 py-2.5 rounded-[10px] text-[12px]"
                  style={{ background: "var(--error-soft)", color: "var(--error)" }}
                >
                  결제에 실패했습니다. 결제 수단을 업데이트해주세요.
                </div>
              )}

              {(sub.status === "active" || sub.status === "trial") && (
                <button
                  onClick={() => void handleCancel()}
                  className="text-[12px] font-medium transition-colors hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  구독 취소
                </button>
              )}
            </div>
          )}
        </section>

        {/* Pricing info */}
        {!sub && (
          <section
            className="rounded-[14px] p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-muted)" }}>요금제</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "월간", price: "₩19,900", sub: "/월" },
                { label: "연간", price: "₩199,000", sub: "/년 (17% 할인)" }
              ].map(p => (
                <div
                  key={p.label}
                  className="px-4 py-3 rounded-[10px]"
                  style={{ background: "var(--surface-muted)", border: "1px solid var(--line)" }}
                >
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{p.label}</p>
                  <p className="text-[16px] font-bold mt-0.5" style={{ color: "var(--text)" }}>{p.price}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
