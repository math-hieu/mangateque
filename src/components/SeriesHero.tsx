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
    <div className="mb-6 grid gap-5 rounded-xl border border-[var(--border)] bg-surface p-4 sm:gap-8 sm:p-7 lg:grid-cols-[220px_1fr_320px]">
      {/* Mobile + tablet: cover and info live in a 2-col flex; on lg the wrapper becomes display:contents so they participate in the 3-col parent grid. */}
      <div className="flex gap-4 sm:gap-5 lg:contents">
        <div className="shrink-0 overflow-hidden rounded shadow-[0_12px_32px_-10px_rgba(0,0,0,0.6)] w-24 sm:w-40 lg:w-full" style={{ aspectRatio: "0.71" }}>
          <Cover url={series.cover_url} seedKey={series.id} title={series.title} publisher={series.publisher} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3.5 lg:flex-none">
          <h1 className="m-0 text-xl font-medium leading-tight tracking-tight sm:text-2xl lg:text-[32px] lg:leading-[1.1]">{series.title}</h1>
          <div className="grid gap-y-1.5 gap-x-3 text-[12px] sm:gap-y-2 sm:gap-x-4 sm:text-[13px] grid-cols-[88px_1fr] sm:grid-cols-[110px_1fr]">
            <span className="mt-label self-center">Éditeur</span>
            <span className="text-cream truncate">{series.publisher}</span>
            <span className="mt-label self-center">Variante</span>
            <span className="text-cream truncate">{series.edition_variant ?? "—"}</span>
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
          <div className="mt-auto flex flex-wrap gap-2">{actions}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-ink-2 px-4 py-3 sm:py-3.5">
          <div className="mt-label">Total dépensé</div>
          <div className="mt-tabular mt-1 text-2xl font-medium tracking-tight sm:text-[28px]">
            {totalSpent.toFixed(2).replace(".", ",")} €
          </div>
          <div className="mt-1 text-[11px] text-muted">
            moyenne {avg.toFixed(2).replace(".", ",")} € · {ownedCount} {ownedCount > 1 ? "tomes" : "tome"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] bg-ink-2 px-4 py-3 sm:py-3.5">
          <div>
            <div className="mt-label">Tomes</div>
            <div className="mt-tabular mt-1 text-xl font-medium tracking-tight sm:text-[22px]">
              {ownedCount}
              {total != null && <span className="text-muted">/{total}</span>}
            </div>
          </div>
          <div>
            <div className="mt-label">Lus</div>
            <div className="mt-tabular mt-1 text-xl font-medium tracking-tight text-amber sm:text-[22px]">{readCount}</div>
          </div>
          <div className="col-span-2 h-1 overflow-hidden rounded bg-ink">
            <div className="h-full bg-amber" style={{ width: `${readPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
