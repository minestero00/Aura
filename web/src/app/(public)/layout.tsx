import type { ReactNode } from "react";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import AmbientBackdrop from "@/components/AmbientBackdrop";
import MouseGlow from "@/components/MouseGlow";

/**
 * Shared layout for all marketing pages.
 * - PublicNavbar/Footer mount once → never unmount on route change (no shake).
 * - AmbientBackdrop: slow-drifting aurora mesh behind everything.
 * - MouseGlow: cursor-follow spotlight (plus-lighter blend) on top of everything.
 *   Together they sell the "alive / future-AI" feel without obscuring content.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="aura-public-shell">
      <AmbientBackdrop />
      <PublicNavbar />
      {children}
      <PublicFooter />
      <MouseGlow />
    </div>
  );
}
