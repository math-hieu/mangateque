import type { LibraryStats } from "@/lib/types";

function Stat({
  label,
  value,
  sub,
  last,
}: {
  label: string;
  value: string | number;
  sub?: string;
  last?: boolean;
}) {
  return (
    <div
      className="relative flex flex-col gap-2 px-[22px] py-[18px]"
      style={{ borderRight: last ? "none" : "1px solid var(--border)" }}
    >
      <span className="mt-label">{label}</span>
      <span className="mt-tabular relative inline-flex items-baseline gap-1.5 self-start text-[26px] font-medium tracking-tight">
        {value}
        <span className="absolute left-0 h-px w-[22px] bg-amber" style={{ bottom: -3 }} />
      </span>
      {sub && <span className="text-[11px] text-cream-mute">{sub}</span>}
    </div>
  );
}

export function StatsRow({ stats }: { stats: LibraryStats }) {
  return (
    <div className="mb-7 grid grid-cols-4 overflow-hidden rounded-[10px] border border-[var(--border)] bg-surface">
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
        last
      />
    </div>
  );
}
