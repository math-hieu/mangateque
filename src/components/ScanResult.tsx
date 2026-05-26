"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addVolume } from "@/actions/volumes";
import { createSeriesAndAddVolume } from "@/actions/isbn";
import type { IsbnLookupResult } from "@/lib/types";

type Props = {
  data: IsbnLookupResult;
  onDone: () => void;
};

export function ScanResult({ data, onDone }: Props) {
  const [useMatch, setUseMatch] = useState(data.matchedSeries !== null);
  const [title, setTitle] = useState(data.seriesTitle);
  const [publisher, setPublisher] = useState(data.publisher ?? "");
  const [volumeNumber, setVolumeNumber] = useState(String(data.volumeNumber ?? ""));
  const [price, setPrice] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const vol = Number(volumeNumber);
    const p = Number(price.replace(",", "."));
    if (!Number.isInteger(vol) || vol <= 0) return toast.error("Numéro de tome invalide");
    if (!(p >= 0)) return toast.error("Prix invalide");

    start(async () => {
      try {
        if (useMatch && data.matchedSeries) {
          await addVolume(data.matchedSeries.id, vol, p);
          toast.success(`Tome ${vol} ajouté à ${data.matchedSeries.title}`);
        } else {
          if (!title.trim() || !publisher.trim()) {
            toast.error("Titre et éditeur sont obligatoires");
            return;
          }
          const seriesId = await createSeriesAndAddVolume(
            {
              anilist_id: null,
              title: title.trim(),
              cover_url: data.coverUrl,
              publisher: publisher.trim(),
              edition_variant: null,
              total_volumes: null,
              status: "ongoing",
            },
            vol,
            p,
          );
          toast.success(`Série "${title.trim()}" créée avec le tome ${vol}`);
        }
        onDone();
      } catch (e: any) {
        toast.error(e.message ?? "Erreur lors de l'ajout");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Book info from Google Books */}
      <div className="flex items-start gap-4 rounded-lg border border-[var(--border)] bg-surface p-4">
        {data.coverUrl && (
          <img
            src={data.coverUrl}
            alt=""
            className="h-24 w-auto rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cream">{data.rawTitle}</p>
          {data.publisher && (
            <p className="mt-mono mt-1 text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
              {data.publisher.toUpperCase()}
            </p>
          )}
          <p className="mt-mono mt-1 text-[10px] text-muted-2" style={{ letterSpacing: "0.06em" }}>
            ISBN {data.isbn}
          </p>
        </div>
      </div>

      {/* Series matching */}
      {data.matchedSeries ? (
        <div className="space-y-2">
          {useMatch ? (
            <div className="flex items-center justify-between rounded-lg border border-[var(--amber-soft)] bg-[rgba(232,161,74,0.06)] px-4 py-3">
              <div>
                <p className="mt-mono text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>SÉRIE EXISTANTE</p>
                <p className="text-sm font-medium text-cream">{data.matchedSeries.title}</p>
              </div>
              <button type="button" className="text-xs text-muted hover:text-cream" onClick={() => setUseMatch(false)}>
                Créer une autre série
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button type="button" className="text-xs text-amber hover:text-amber-deep" onClick={() => setUseMatch(true)}>
                ← Utiliser « {data.matchedSeries.title} »
              </button>
              <div>
                <label className="mt-label mb-1.5 block">Titre de la série</label>
                <input className="mt-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="mt-label mb-1.5 block">Éditeur</label>
                <input className="mt-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} required placeholder="Ki-oon, Glénat, ..." />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="mt-mono text-[10px] text-amber" style={{ letterSpacing: "0.06em" }}>NOUVELLE SÉRIE</p>
          <div>
            <label className="mt-label mb-1.5 block">Titre de la série</label>
            <input className="mt-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="mt-label mb-1.5 block">Éditeur</label>
            <input className="mt-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} required placeholder="Ki-oon, Glénat, ..." />
          </div>
        </div>
      )}

      {/* Already owned warning */}
      {data.alreadyOwned && useMatch && (
        <div className="flex items-center gap-3 rounded-lg border border-[rgba(198,103,86,0.3)] bg-[rgba(198,103,86,0.06)] px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--crimson)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-crimson">
            Vous possédez déjà le tome {data.volumeNumber} de cette série.
          </p>
        </div>
      )}

      {/* Volume number + Price */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mt-label mb-1.5 block">Tome N°</label>
          <input
            className="mt-input"
            type="number"
            min={1}
            value={volumeNumber}
            onChange={(e) => setVolumeNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mt-label mb-1.5 block">Prix d'achat</label>
          <input
            className="mt-input"
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="8,25 €"
            required
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="mt-cta flex-1" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </button>
        <button type="button" className="mt-ghost" onClick={onDone} disabled={pending}>
          Annuler
        </button>
      </div>
    </form>
  );
}
