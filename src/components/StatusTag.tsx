import type { SeriesStatus } from "@/lib/types";

export function StatusTag({ status, compact = false }: { status: SeriesStatus; compact?: boolean }) {
  const label = status === "ongoing" ? "EN COURS" : "COMPLÈTE";
  const dotClass = status === "ongoing" ? "mt-tag-dot on" : "mt-tag-dot done";
  if (compact) {
    return (
      <span className="mt-tag" style={{ padding: "1px 6px", fontSize: 9, letterSpacing: "0.08em" }}>
        <span className={dotClass} />
        {label}
      </span>
    );
  }
  return (
    <span className="mt-tag">
      <span className={dotClass} />
      {status === "ongoing" ? "En cours" : "Terminée"}
    </span>
  );
}
