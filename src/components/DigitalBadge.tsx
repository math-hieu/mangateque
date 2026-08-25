/** Marque une lecture faite sur support numérique, dans les vues qui mêlent les deux. */
export function DigitalBadge() {
  return (
    <span
      className="mt-mono shrink-0 rounded-[3px] border border-[var(--border-3)] px-1.5 py-0.5 text-[9px] text-cream-mute"
      style={{ letterSpacing: "0.06em" }}
    >
      NUMÉRIQUE
    </span>
  );
}
