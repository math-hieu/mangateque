/** Marque une série ou une lecture numérique, partout où elle apparaît. */
export function DigitalBadge() {
  return (
    <span
      className="mt-mono shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        borderColor: "var(--digital-line)",
        background: "rgba(127, 179, 204, 0.12)",
        color: "var(--digital)",
        letterSpacing: "0.06em",
      }}
    >
      NUMÉRIQUE
    </span>
  );
}
