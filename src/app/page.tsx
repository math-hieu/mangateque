import { getLibraryStats, listSeriesForLibrary } from "@/actions/series";
import { StatsRow } from "@/components/StatsRow";
import { SeriesGrid } from "@/components/SeriesGrid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, series] = await Promise.all([getLibraryStats(), listSeriesForLibrary()]);
  return (
    <div>
      <StatsRow stats={stats} />
      <SeriesGrid series={series} />
    </div>
  );
}
