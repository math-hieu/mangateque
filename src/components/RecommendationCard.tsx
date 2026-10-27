import { Cover } from "@/components/Cover";
import type { Recommendation, RecoStatus } from "@/lib/types";

const STATUS_LABEL: Record<RecoStatus, string> = { ongoing: "en cours", completed: "terminé" };

function volumesLabel(volumes: number | null, status: RecoStatus): string {
  const count = volumes == null ? "?" : volumes;
  return `${count} ${volumes === 1 ? "tome" : "tomes"} (${STATUS_LABEL[status]})`;
}

function ReviewList({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-ink-2 px-3.5 py-3">
      <h3 className="mt-label m-0 mb-1.5" style={{ color }}>
        {title}
      </h3>
      <ul className="m-0 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-cream-mute">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function RecommendationCard({ reco, owned }: { reco: Recommendation; owned: boolean }) {
  const { fr, anilist } = reco;

  return (
    <article className="grid gap-4 rounded-[10px] border border-[var(--border)] bg-surface p-4 sm:grid-cols-[200px_1fr] sm:gap-6 sm:p-5 lg:grid-cols-[240px_1fr]">
      <div className="w-[180px] self-start overflow-hidden rounded-md sm:w-full">
        <Cover url={anilist.cover_url} seedKey={String(anilist.id)} title={reco.title} />
      </div>

      <div className="min-w-0">
        <div className="mt-label">#{reco.rank}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-cream">{reco.title}</h2>
          {owned && (
            <span
              className="mt-mono shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                borderColor: "rgba(232, 161, 74, 0.4)",
                background: "var(--amber-soft)",
                color: "var(--amber)",
                letterSpacing: "0.06em",
              }}
            >
              DANS MA BIBLIOTHÈQUE
            </span>
          )}
        </div>
        {reco.related_to && (
          <p className="m-0 mt-1 text-xs text-muted">Suite / spin-off de {reco.related_to}</p>
        )}

        <p className="mt-mono m-0 mt-2 text-[11px] leading-relaxed text-muted">
          {fr.publisher} · VF {volumesLabel(fr.volumes, fr.status)} · VO{" "}
          {volumesLabel(anilist.volumes, anilist.status)} · {anilist.authors.join(", ")} ·{" "}
          {anilist.start_year} ·{" "}
          <a href={anilist.url} target="_blank" rel="noopener noreferrer" className="text-amber hover:underline">
            AniList {anilist.average_score ?? "–"}
          </a>
        </p>

        {anilist.genres.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {anilist.genres.map((g) => (
              <span key={g} className="mt-tag">
                {g}
              </span>
            ))}
          </div>
        )}

        <p className="m-0 mt-3 text-sm leading-relaxed text-cream">{reco.why}</p>

        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          <ReviewList title="Points forts" items={reco.pros} color="var(--amber)" />
          <ReviewList title="Points faibles" items={reco.cons} color="var(--crimson)" />
        </div>

        <p className="m-0 mt-3 text-[11px] text-muted-2">
          Sources :{" "}
          {reco.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && " · "}
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:underline">
                {s.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </article>
  );
}
