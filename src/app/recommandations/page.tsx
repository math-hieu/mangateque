import { RecommendationCard } from "@/components/RecommendationCard";
import { RecommendationDatePicker } from "@/components/RecommendationDatePicker";
import { listRecommendationDates, ownedMatcher, readRecommendations } from "@/lib/recommendations";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function RecommandationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const dates = await listRecommendationDates();

  // Une date inconnue ou invalide retombe sur la génération la plus récente.
  const current =date && dates.includes(date) ? date : dates[0];
  const file = current ? await readRecommendations(current) : null;

  if (!current || !file) {
    return (
      <section className="mb-8">
        <h1 className="m-0 mb-3 text-[15px] font-medium tracking-tight text-cream">Recommandations</h1>
        <p className="m-0 rounded-[10px] border border-[var(--border)] bg-surface p-5 text-sm text-cream-mute">
          Aucune recommandation pour l'instant. Lance <span className="mt-mono text-cream">/reco</span> dans
          Claude Code pour en générer.
        </p>
      </section>
    );
  }

  const { data: owned, error } = await supabase().from("series").select("anilist_id, title");
  if (error) throw error;
  const isOwned = ownedMatcher(owned ?? []);

  const generatedOn = new Date(file.generated_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <section aria-labelledby="reco-heading" className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-0.5">
        <h1
          id="reco-heading"
          className="m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[15px] font-medium tracking-tight text-cream"
        >
          <span>Recommandations</span>
          <span className="mt-mono text-[11px] text-muted" style={{ letterSpacing: "0.06em" }}>
            GÉNÉRÉES LE {generatedOn.toUpperCase()} · BASÉES SUR {file.based_on.rated_count} SÉRIES NOTÉES
          </span>
        </h1>
        <RecommendationDatePicker dates={dates} current={current} />
      </div>

      <div className="space-y-4">
        {file.recommendations.map((reco) => (
          <RecommendationCard key={reco.rank} reco={reco} owned={isOwned(reco)} />
        ))}
      </div>
    </section>
  );
}
