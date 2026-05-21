import { getLibraryStats, listInProgressSeries, listSeriesForLibrary } from "@/actions/series";
import { StatsRow } from "@/components/StatsRow";
import { SeriesGrid } from "@/components/SeriesGrid";
import { CurrentlyReadingCarousel } from "@/components/CurrentlyReadingCarousel";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, series, inProgress] = await Promise.all([
    getLibraryStats(),
    listSeriesForLibrary(),
    listInProgressSeries(),
  ]);
  return (
    <div>
      <StatsRow stats={stats} />
      <SeriesGrid
        series={series}
        afterFilters={<CurrentlyReadingCarousel items={inProgress} />}
      />
    </div>
  );
}
