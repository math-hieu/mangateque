import { Cover } from "./Cover";
import { StatusTag } from "./StatusTag";
import type { Series } from "@/lib/types";

type Props = {
  series: Series;
  ownedCount: number;
  totalSpent: number;
  readCount: number;
  actions: React.ReactNode;
};

export function SeriesHero({ series, ownedCount, totalSpent, readCount, actions }: Props) {
  const total = series.total_volumes;
  const readPct = ownedCount === 0 ? 0 : Math.round((readCount / ownedCount) * 100);
  const avg = ownedCount === 0 ? 0 : totalSpent / ownedCount;

  return (
    <div
      className="mb-6 grid gap-8 rounded-xl border border-[var(--border)] bg-surface p-7"
      style={{ gridTemplateColumns: "220px 1fr 320px" }}
    >
      <div className="overflow-hidden rounded shadow-[0_12px_32px_-10px_rgba(0,0,0,0.6)]" style={{ aspectRatio: "0.71" }}>
        <Cover url={series.cover_url} seedKey={series.id} title={series.title} publisher={series.publisher} />
      </div>

      <div className="flex flex-col gap-3.5">
        <h1 className="m-0 text-[32px] font-medium leading-[1.1] tracking-tight">{series.title}</h1>
        <div className="grid gap-y-2 gap-x-4 text-[13px]" style={{ gridTemplateColumns: "110px 1fr" }}>
          <span className="mt-label self-center">Éditeur</span>
          <span className="text-cream">{series.publisher}</span>
          <span className="mt-label self-center">Variante</span>
          <span className="text-cream">{series.edition_variant ?? "—"}</span>
          <span className="mt-label self-center">Statut</span>
          <span><StatusTag status={series.status} /></span>
          {series.anilist_id != null && (
            <>
              <span className="mt-label self-center">AniList</span>
              <span className="mt-mono text-cream">#{series.anilist_id}</span>
            </>
          )}
          <span className="mt-label self-center">Ajoutée</span>
          <span className="mt-mono text-cream">
            {new Date(series.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="mt-auto flex gap-2">{actions}</div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-ink-2 px-4 py-3.5">
          <div className="mt-label">Total dépensé</div>
          <div className="mt-tabular mt-1 text-[28px] font-medium tracking-tight">
            {totalSpent.toFixed(2).replace(".", ",")} €
          </div>
          <div className="mt-1 text-[11px] text-muted">
            moyenne {avg.toFixed(2).replace(".", ",")} € · {ownedCount} {ownedCount > 1 ? "tomes" : "tome"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] bg-ink-2 px-4 py-3.5">
          <div>
            <div className="mt-label">Tomes</div>
            <div className="mt-tabular mt-1 text-[22px] font-medium tracking-tight">
              {ownedCount}
              {total != null && <span className="text-muted">/{total}</span>}
            </div>
          </div>
          <div>
            <div className="mt-label">Lus</div>
            <div className="mt-tabular mt-1 text-[22px] font-medium tracking-tight text-amber">{readCount}</div>
          </div>
          <div className="col-span-2 h-1 overflow-hidden rounded bg-ink">
            <div className="h-full bg-amber" style={{ width: `${readPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
