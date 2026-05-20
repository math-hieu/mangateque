import { notFound } from "next/navigation";
import Link from "next/link";
import { getSeries } from "@/actions/series";
import { listVolumes } from "@/actions/volumes";
import { SeriesHero } from "@/components/SeriesHero";
import { VolumesTable } from "@/components/VolumesTable";
import { QuickAddVolume } from "@/components/QuickAddVolume";
import { SeriesActions } from "@/components/SeriesActions";

export default async function SeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await getSeries(id);
  if (!series) notFound();
  const volumes = await listVolumes(series.id);

  const ownedCount = volumes.length;
  const totalSpent = volumes.reduce((s, v) => s + Number(v.price), 0);
  const readCount = volumes.filter((v) => v.is_read).length;
  const nextNumber = ownedCount === 0 ? 1 : Math.max(...volumes.map((v) => v.number)) + 1;

  return (
    <div>
      <div className="mt-mono mb-4 truncate text-[10px] text-muted sm:text-[11px]" style={{ letterSpacing: "0.06em" }}>
        <Link href="/" className="hover:text-cream">BIBLIOTHÈQUE</Link>
        <span className="px-1.5 sm:px-2">›</span>
        <span>{series.publisher.toUpperCase()}</span>
        <span className="px-1.5 sm:px-2">›</span>
        <span>{series.title.toUpperCase()}</span>
      </div>

      <SeriesHero
        series={series}
        ownedCount={ownedCount}
        totalSpent={totalSpent}
        readCount={readCount}
        actions={<SeriesActions series={series} />}
      />

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-surface">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-3 sm:px-[18px] sm:py-3.5">
          <div className="text-sm font-medium">Tomes possédés</div>
        </div>
        <VolumesTable volumes={volumes} />
        <QuickAddVolume seriesId={series.id} suggestedNumber={nextNumber} />
      </div>
    </div>
  );
}
