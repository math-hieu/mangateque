"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSeries } from "@/actions/series";

export type SeriesFormInitial = Partial<{
  anilist_id: number;
  title: string;
  cover_url: string;
  total_volumes: number;
  status: "ongoing" | "completed";
}>;

export function SeriesForm({ initial }: { initial?: SeriesFormInitial }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [publisher, setPublisher] = useState("");
  const [variant, setVariant] = useState("");
  const [totalVolumes, setTotalVolumes] = useState<string>(
    initial?.total_volumes != null ? String(initial.total_volumes) : ""
  );
  const [status, setStatus] = useState<"ongoing" | "completed">(initial?.status ?? "ongoing");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !publisher.trim()) {
      toast.error("Titre et éditeur sont obligatoires");
      return;
    }
    start(async () => {
      try {
        await createSeries({
          anilist_id: initial?.anilist_id ?? null,
          title: title.trim(),
          cover_url: coverUrl.trim() || null,
          publisher: publisher.trim(),
          edition_variant: variant.trim() || null,
          total_volumes: totalVolumes ? Number(totalVolumes) : null,
          status,
        });
      } catch (e: any) {
        toast.error(e.message ?? "Erreur création");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mt-label mb-1.5 block">Titre</label>
        <input className="mt-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="mt-label mb-1.5 block">URL de la couverture</label>
        <input className="mt-input" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mt-label mb-1.5 block">Éditeur</label>
          <input className="mt-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} required placeholder="Ki-oon, Glénat, ..." />
        </div>
        <div>
          <label className="mt-label mb-1.5 block">Variante (optionnel)</label>
          <input className="mt-input" value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="Édition originale, Perfect..." />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mt-label mb-1.5 block">Nb total de tomes (optionnel)</label>
          <input className="mt-input" type="number" min={1} value={totalVolumes} onChange={(e) => setTotalVolumes(e.target.value)} />
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
