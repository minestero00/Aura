"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor-follow spotlight glow — the "AI is watching" signature.
 * Uses rAF + direct DOM mutation (no React state on every mousemove).
 * `mix-blend-mode: plus-lighter` lights up content underneath without
 * obscuring it; fades in/out as cursor enters/leaves the window.
 */
export default function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip on touch-primary devices and reduced-motion users
    const isTouch = matchMedia("(pointer: coarse)").matches;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reduce) return;

    const SIZE = 560;
    let raf = 0;
    let tx = -SIZE, ty = -SIZE;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX - SIZE / 2;
      ty = e.clientY - SIZE / 2;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
          el.style.opacity = "1";
          raf = 0;
        });
      }
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 560,
        height: 560,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(107,91,255,0.32) 0%, rgba(52,210,255,0.14) 38%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 5,
        mixBlendMode: "plus-lighter",
        opacity: 0,
        transition: "opacity 0.35s ease",
        willChange: "transform, opacity",
      }}
    />
  );
}
