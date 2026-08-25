import Link from "next/link";
import { listInProgressSeries, listSeriesForLibrary } from "@/actions/series";
import { SeriesGrid } from "@/components/SeriesGrid";
import { CurrentlyReadingCarousel } from "@/components/CurrentlyReadingCarousel";

export const dynamic = "force-dynamic";

export default async function NumeriquePage() {
  const [series, inProgress] = await Promise.all([
    listSeriesForLibrary("digital"),
    listInProgressSeries("digital"),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-3 px-0.5">
        <h1 className="m-0 text-[15px] font-medium tracking-tight text-cream">
          Lecture numérique
        </h1>
        <Link href="/add?format=digital" className="mt-cta whitespace-nowrap">
          ＋ Ajouter
        </Link>
      </div>
      <SeriesGrid
        series={series}
        heading="Mes lectures numériques"
        issuerFilterLabel="Plateforme"
        afterFilters={<CurrentlyReadingCarousel items={inProgress} />}
      />
    </div>
  );
}
