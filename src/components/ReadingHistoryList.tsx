import Link from "next/link";
import { Cover } from "./Cover";
import { DigitalBadge } from "./DigitalBadge";
import type { ReadingGroup } from "@/lib/reading";

const FULL_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric" });

/** « 20 août 2026 » pour une lecture d'un jour, « 14 → 20 août 2026 » pour un enchaînement. */
function formatReadRange(firstIso: string, lastIso: string): string {
  const first = new Date(firstIso);
  const last = new Date(lastIso);
  const sameYear = first.getFullYear() === last.getFullYear();
  const sameMonth = sameYear && first.getMonth() === last.getMonth();
  const sameDay = sameMonth && first.getDate() === last.getDate();

  if (sameDay) return FULL_DATE.format(last);
  if (sameMonth) return `${DAY.format(first)} → ${FULL_DATE.format(last)}`;
  if (sameYear) return `${DAY_MONTH.format(first)} → ${FULL_DATE.format(last)}`;
  return `${FULL_DATE.format(first)} → ${FULL_DATE.format(last)}`;
}

function formatVolumes(group: ReadingGroup): string {
  return group.count === 1
    ? `Tome ${group.from_volume}`
    : `Tomes ${group.from_volume} à ${group.to_volume}`;
}

export function ReadingHistoryList({ groups }: { groups: ReadingGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="rounded-[10px] border border-[var(--border)] bg-surface px-4 py-8 text-center text-sm text-muted">
        Aucune lecture enregistrée pour le moment.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {groups.map((group) => (
        <li key={`${group.series_id}-${group.from_volume}-${group.first_read_at}`}>
          <Link
            href={`/series/${group.series_id}`}
            className="grid min-h-[86px] overflow-hidden rounded-[10px] border transition-colors"
            style={{
              gridTemplateColumns: "62px 1fr",
              borderColor: group.format === "digital" ? "var(--digital-line)" : "var(--border-2)",
              background: group.format === "digital" ? "var(--surface-digital)" : "var(--surface)",
            }}
          >
            <div className="border-r border-[var(--border)]">
              <div className="h-full w-full">
                <Cover
                  url={group.cover_url}
                  seedKey={group.series_id}
                  title={group.series_title}
                  publisher={group.series_issuer}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1 px-3.5 py-3">
              <div className="flex items-baseline gap-2">
                <h3 className="truncate text-[14px] font-medium tracking-tight text-cream">
                  {group.series_title}
                </h3>
                {group.format === "digital" && <DigitalBadge />}
              </div>

              <span className="mt-mono truncate text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
                {group.series_issuer.toUpperCase()}
                {group.edition_variant ? ` · ${group.edition_variant.toUpperCase()}` : ""}
              </span>

              <div className="mt-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pt-1.5">
                <span className="mt-tabular text-[13px] text-amber">{formatVolumes(group)}</span>
                {group.count > 1 && (
                  <span className="mt-mono text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
                    {group.count} TOMES
                  </span>
                )}
                <span className="mt-tabular ml-auto text-[11px] text-cream-mute">
                  {formatReadRange(group.first_read_at, group.last_read_at)}
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
