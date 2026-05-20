import type { LibraryStats } from "@/lib/types";

const CELL = [
  "relative flex flex-col gap-1.5 px-4 py-3 sm:gap-2 sm:px-[22px] sm:py-[18px]",
  // mobile (2x2): right border on odd cells, bottom border on first row
  "[&:nth-child(odd)]:border-r [&:nth-child(odd)]:border-[var(--border)]",
  "[&:nth-last-child(n+3)]:border-b [&:nth-last-child(n+3)]:border-[var(--border)]",
  // desktop (1x4): right border on all except last
  "sm:border-r sm:border-[var(--border)] sm:[&:last-child]:border-r-0 sm:[&]:border-b-0",
].join(" ");

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className={CELL}>
      <span className="mt-label">{label}</span>
      <span className="mt-tabular relative inline-flex items-baseline gap-1.5 self-start text-[20px] font-medium tracking-tight sm:text-[26px]">
        {value}
        <span className="absolute left-0 h-px w-[22px] bg-amber" style={{ bottom: -3 }} />
      </span>
      {sub && <span className="text-[10px] text-cream-mute sm:text-[11px]">{sub}</span>}
    </div>
  );
}

export function StatsRow({ stats }: { stats: LibraryStats }) {
  return (
    <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-[10px] border border-[var(--border)] bg-surface sm:mb-7 sm:grid-cols-4">
      <Stat
        label="Total dépensé"
        value={`${stats.total_spent.toFixed(2).replace(".", ",")} €`}
      />
      <Stat
        label="Séries"
        value={stats.series_count}
        sub={`dont ${stats.completed_count} ${stats.completed_count > 1 ? "complètes" : "complète"}`}
      />
      <Stat
        label="Tomes possédés"
        value={stats.volumes_count}
        sub={`${stats.volumes_count - stats.read_count} non lus`}
      />
      <Stat
        label="Progrès lecture"
        value={`${stats.read_pct} %`}
        sub={`${stats.read_count} / ${stats.volumes_count} tomes lus`}
      />
    </div>
  );
}
