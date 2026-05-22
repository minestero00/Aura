"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastLevel = "info" | "success" | "error";

interface Toast {
  id: number;
  level: ToastLevel;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setToasts(t => [...t, { ...toast, id }]);
    // 액션 없는 toast는 4초 후 자동 소멸. 액션 있는 건 사용자가 닫을 때까지 유지 (단, 12초 후엔 강제 dismiss).
    const ttl = toast.onAction ? 12_000 : 4_000;
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map(t => (
          <ToastCard
            key={t.id}
            toast={t}
            onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const palette = {
    info:    { bg: "var(--surface)",      bd: "var(--line-strong)",  fg: "var(--text)",    accent: "var(--text-muted)" },
    success: { bg: "var(--surface)",      bd: "rgba(31,203,122,.4)", fg: "var(--text)",    accent: "var(--success)" },
    error:   { bg: "var(--surface)",      bd: "rgba(220,38,38,.4)",  fg: "var(--text)",    accent: "var(--error)" },
  }[toast.level];

  return (
    <div
      className="pointer-events-auto rounded-[12px] px-4 py-3 shadow-lg flex items-start gap-3 transition-all"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.bd}`,
        boxShadow: "0 8px 24px rgba(0,0,0,.12)",
        transform: visible ? "translateY(0)" : "translateY(8px)",
        opacity: visible ? 1 : 0,
      }}
    >
      <span
        className="flex-none w-1 self-stretch rounded-full"
        style={{ background: palette.accent }}
      />
      <p className="flex-1 text-[13px] leading-relaxed" style={{ color: palette.fg }}>
        {toast.text}
      </p>
      {toast.actionLabel && toast.onAction && (
        <button
          onClick={() => { toast.onAction?.(); onDismiss(); }}
          className="flex-none text-[12px] font-semibold px-2 py-1 rounded-md"
          style={{ color: palette.accent }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="flex-none p-1 rounded-md hover:bg-[var(--surface-muted)] transition-colors"
        style={{ color: "var(--text-muted)" }}
        aria-label="닫기"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
