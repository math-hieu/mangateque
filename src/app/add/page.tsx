import { AniListSearch } from "@/components/AniListSearch";

export default function AddPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="mt-mono text-xs text-muted" style={{ letterSpacing: "0.06em" }}>
          BIBLIOTHÈQUE › AJOUTER
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Ajouter une série</h1>
      </div>
      <AniListSearch />
    </div>
  );
}
