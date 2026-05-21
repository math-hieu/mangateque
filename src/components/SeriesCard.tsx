import Link from "next/link";
import { Cover } from "./Cover";
import { StatusTag } from "./StatusTag";
import type { SeriesCardData } from "@/lib/types";

export function SeriesCard({ s }: { s: SeriesCardData }) {
  const pct = s.owned_count ? Math.round((s.read_count / s.owned_count) * 100) : 0;
  return (
    <Link
      href={`/series/${s.id}`}
      className="flex flex-col overflow-hidden rounded-[10px] border border-[var(--border)] bg-surface transition-colors hover:bg-surface-2"
    >
      <div className="border-b border-[var(--border)]" style={{ aspectRatio: "0.71" }}>
        <Cover url={s.cover_url} seedKey={s.id} title={s.title} publisher={s.publisher} />
      </div>
      <div className="flex flex-col gap-2.5 px-3 pb-3.5 pt-3">
        <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
          <span className="truncate w-full sm:w-auto sm:flex-1 text-sm font-medium leading-tight tracking-tight">{s.title}</span>
          <StatusTag status={s.status} compact />
        </div>
        <span className="mt-mono text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
          {s.publisher.toUpperCase()}
          {s.edition_variant ? ` · ${s.edition_variant.toUpperCase()}` : ""}
        </span>
        <div
          className="mt-mono grid border-t border-[var(--border)] pt-2"
          style={{ gridTemplateColumns: "1fr 1fr", rowGap: 4, columnGap: 8 }}
        >
          <span className="mt-label">Tomes</span>
          <span className="text-right text-[11px] text-cream" style={{ fontVariantNumeric: "tabular-nums" }}>
            {s.owned_count}{s.total_volumes ? ` / ${s.total_volumes}` : " / ?"}
          </span>
          <span className="mt-label">Lus</span>
          <span className="text-right text-[11px] text-cream" style={{ fontVariantNumeric: "tabular-nums" }}>{s.read_count}</span>
          <span className="mt-label">Dépensé</span>
          <span className="text-right text-[11px] text-cream" style={{ fontVariantNumeric: "tabular-nums" }}>
            {s.total_spent.toFixed(2).replace(".", ",")} €
          </span>
        </div>
        <div className="mt-0.5 h-[3px] overflow-hidden rounded-sm bg-ink-2">
          <div className="h-full bg-amber" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}
