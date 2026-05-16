"use client";

import { useRef, useEffect, CSSProperties, ReactNode, ElementType } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

interface FadeInProps {
  children: ReactNode;
  /** 애니메이션 시작 딜레이 (초) */
  delay?: number;
  /** 이동 거리 (px) */
  distance?: number;
  /** 방향 */
  direction?: Direction;
  /** 지속 시간 (초) */
  duration?: number;
  /** IntersectionObserver threshold */
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  /** 렌더링할 태그 (기본 div) */
  as?: ElementType;
}

const TRANSLATE: Record<Direction, string> = {
  up:    "translateY(VAR)",
  down:  "translateY(-VAR)",
  left:  "translateX(VAR)",
  right: "translateX(-VAR)",
  none:  "none",
};

export default function FadeIn({
  children,
  delay = 0,
  distance = 24,
  direction = "up",
  duration = 0.7,
  threshold = 0.08,
  className,
  style,
  as: Tag = "div",
}: FadeInProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const initialTransform =
      direction === "none"
        ? "none"
        : TRANSLATE[direction].replace("VAR", `${distance}px`);

    el.style.opacity = "0";
    el.style.transform = initialTransform;
    // ease-out-quint: slow finish, feels "settled" rather than abrupt
    const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transition = `opacity ${duration}s ${easing} ${delay}s, transform ${duration}s ${easing} ${delay}s`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.style.opacity = "1";
            el.style.transform = "none";
            observer.disconnect();
          }
        }
      },
      {
        threshold,
        // pre-trigger 80px before element enters viewport — animation finishes as it scrolls in
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction, distance, duration, threshold]);

  return (
    <Tag ref={ref} className={`fi-wrap${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </Tag>
  );
}
