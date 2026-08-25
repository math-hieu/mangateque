import { AniListSearch } from "@/components/AniListSearch";
import { listPlatforms } from "@/actions/series";

export const dynamic = "force-dynamic";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const { format } = await searchParams;
  const defaultFormat = format === "digital" ? "digital" : "physical";
  const platforms = await listPlatforms();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="mt-mono text-xs text-muted" style={{ letterSpacing: "0.06em" }}>
          AJOUTER UNE SÉRIE
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Ajouter une série</h1>
      </div>
      <AniListSearch defaultFormat={defaultFormat} platforms={platforms} />
    </div>
  );
}
