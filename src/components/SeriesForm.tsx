"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSeries } from "@/actions/series";
import type { SeriesFormat } from "@/lib/types";

export type SeriesFormInitial = Partial<{
  anilist_id: number;
  title: string;
  cover_url: string;
  total_volumes: number;
  status: "ongoing" | "completed";
}>;

export function SeriesForm({
  initial,
  defaultFormat = "physical",
  platforms,
}: {
  initial?: SeriesFormInitial;
  defaultFormat?: SeriesFormat;
  platforms: string[];
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [format, setFormat] = useState<SeriesFormat>(defaultFormat);
  const [publisher, setPublisher] = useState("");
  const [platform, setPlatform] = useState("");
  const [variant, setVariant] = useState("");
  const [totalVolumes, setTotalVolumes] = useState<string>(
    initial?.total_volumes != null ? String(initial.total_volumes) : ""
  );
  const [status, setStatus] = useState<"ongoing" | "completed">(initial?.status ?? "ongoing");
  const [createVolumes, setCreateVolumes] = useState(true);
  const [pending, start] = useTransition();

  // Le champ est libre : tant qu'il ne contient pas un entier positif, il n'y a
  // rien à créer et la case n'a pas de sens.
  const parsedTotal = Number(totalVolumes);
  const volumeCount =
    totalVolumes.trim() !== "" && Number.isInteger(parsedTotal) && parsedTotal > 0
      ? parsedTotal
      : null;
  const willCreateVolumes = format === "digital" && createVolumes && volumeCount !== null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    if (format === "physical" && !publisher.trim()) {
      toast.error("L'éditeur est obligatoire pour un livre physique");
      return;
    }
    if (format === "digital" && !platform.trim()) {
      toast.error("La plateforme est obligatoire pour un livre numérique");
      return;
    }
    start(async () => {
      try {
        await createSeries({
          anilist_id: initial?.anilist_id ?? null,
          title: title.trim(),
          cover_url: coverUrl.trim() || null,
          format,
          publisher: format === "physical" ? publisher.trim() : null,
          platform: format === "digital" ? platform.trim() : null,
          edition_variant: format === "physical" ? variant.trim() || null : null,
          total_volumes: totalVolumes ? Number(totalVolumes) : null,
          status,
        }, willCreateVolumes ? volumeCount : undefined);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur création");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mt-label mb-1.5 block">Format</label>
        <div className="inline-flex overflow-hidden rounded-md border border-[var(--border-2)]">
          {(["physical", "digital"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className="px-3.5 py-1.5 text-xs"
              style={{
                background: format === f ? "var(--amber)" : "transparent",
                color: format === f ? "#1a1208" : "var(--cream)",
              }}
            >
              {f === "physical" ? "Physique" : "Numérique"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mt-label mb-1.5 block">Titre</label>
        <input className="mt-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="mt-label mb-1.5 block">URL de la couverture</label>
        <input className="mt-input" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
      </div>
      {format === "physical" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mt-label mb-1.5 block">Éditeur</label>
            <input className="mt-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Ki-oon, Glénat, ..." />
          </div>
          <div>
            <label className="mt-label mb-1.5 block">Variante (optionnel)</label>
            <input className="mt-input" value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="Édition originale, Perfect..." />
          </div>
        </div>
      ) : (
        <div>
          <label className="mt-label mb-1.5 block">Plateforme</label>
          <input
            className="mt-input"
            list="platforms"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="Mangas.io, Izneo, Webtoon..."
          />
          <datalist id="platforms">
            {platforms.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mt-label mb-1.5 block">Nb total de tomes (optionnel)</label>
          <input className="mt-input" type="number" min={1} value={totalVolumes} onChange={(e) => setTotalVolumes(e.target.value)} />
          {format === "digital" && (
            <label className="mt-2 flex items-center gap-2 text-[12px] text-cream-mute">
              <input
                type="checkbox"
                checked={createVolumes}
                disabled={volumeCount === null}
                onChange={(e) => setCreateVolumes(e.target.checked)}
                className="accent-[var(--amber)]"
              />
              {volumeCount === null
                ? "Renseigne le nombre de tomes pour les créer d'office"
                : volumeCount > 1
                  ? `Créer les ${volumeCount} tomes`
                  : "Créer le tome 1"}
            </label>
          )}
        </div>
        <div>
          <label className="mt-label mb-1.5 block">Statut</label>
          <select className="mt-select w-full" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="ongoing">En cours</option>
            <option value="completed">Terminée</option>
          </select>
        </div>
      </div>
      <button type="submit" className="mt-cta" disabled={pending}>
        {pending ? "Création..." : "Créer la série"}
      </button>
    </form>
  );
}
