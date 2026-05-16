import { Children, type ReactNode } from "react";
import FadeIn from "./FadeIn";

interface StaggerProps {
  children: ReactNode;
  /** Seconds before the first child starts revealing */
  baseDelay?: number;
  /** Seconds between consecutive children */
  step?: number;
  /** Slide direction for all children */
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Per-child duration override (seconds) */
  duration?: number;
  /** Per-child distance override (px) */
  distance?: number;
}

/**
 * Wraps each direct child in a FadeIn with incrementally larger delay.
 * Use it on hero content (badge → h1 → p → CTA) so the page "builds itself"
 * instead of appearing all at once.
 *
 * Filters out falsy children (e.g. `cond && <Thing/>`) so conditional
 * rendering stays clean.
 */
export default function Stagger({
  children,
  baseDelay = 0,
  step = 0.12,
  direction = "up",
  duration,
  distance,
}: StaggerProps) {
  // Children.toArray already drops null/undefined/false/true children.
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <FadeIn
          key={i}
          delay={baseDelay + i * step}
          direction={direction}
          duration={duration}
          distance={distance}
        >
          {child}
        </FadeIn>
      ))}
    </>
  );
}
