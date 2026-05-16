/**
 * Page-fixed ambient mesh — slow-drifting aurora blobs.
 * Sits behind all content (z-index: 0) and never scrolls away,
 * giving every page a quiet "alive / future-AI" feel.
 *
 * CSS-only, no JS, no layout cost.
 */
export default function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div className="amb-orb amb-orb-1" />
      <div className="amb-orb amb-orb-2" />
      <div className="amb-orb amb-orb-3" />
      <div className="amb-grain" />
    </div>
  );
}
