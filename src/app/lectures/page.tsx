import { listReadingHistory } from "@/actions/reading";
import { ReadingHistoryList } from "@/components/ReadingHistoryList";

export const dynamic = "force-dynamic";

export default async function LecturesPage() {
  const groups = await listReadingHistory();
  const volumeCount = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <section aria-labelledby="lectures-heading" className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-0.5">
        <h1
          id="lectures-heading"
          className="m-0 flex items-baseline gap-2.5 text-[15px] font-medium tracking-tight text-cream"
        >
          <span>Dernières lectures</span>
          <span className="mt-mono text-[11px] text-muted" style={{ letterSpacing: "0.06em" }}>
            {volumeCount}&nbsp;{volumeCount > 1 ? "TOMES" : "TOME"}
          </span>
        </h1>
      </div>

      <ReadingHistoryList groups={groups} />
    </section>
  );
}
