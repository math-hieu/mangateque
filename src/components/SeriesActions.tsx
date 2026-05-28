"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSeries, deleteSeries, searchGoogleBooksCovers, type CoverCandidate } from "@/actions/series";
import type { Series } from "@/lib/types";
import { Cover } from "./Cover";

export function SeriesActions({ series }: { series: Series }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(series.title);
  const [publisher, setPublisher] = useState(series.publisher);
  const [variant, setVariant] = useState(series.edition_variant ?? "");
  const [status, setStatus] = useState(series.status);
  const [total, setTotal] = useState(series.total_volumes != null ? String(series.total_volumes) : "");
  const [coverUrl, setCoverUrl] = useState<string | null>(series.cover_url);
  const [mode, setMode] = useState<"edit" | "picker">("edit");
  const [candidates, setCandidates] = useState<CoverCandidate[] | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  function openDialog() {
    setCoverUrl(series.cover_url);
    setMode("edit");
    setCoverError(null);
    setOpen(true);
  }

  function openPicker() {
    setMode("picker");
    if (candidates !== null || coverLoading) return;
    setCoverLoading(true);
    setCoverError(null);
    searchGoogleBooksCovers(series.title)
      .then((r) => {
        setCandidates(r);
        setCoverLoading(false);
      })
      .catch((e: any) => {
        const msg = e?.message ?? "Erreur";
        setCoverError(msg);
        setCoverLoading(false);
        toast.error(msg);
      });
  }

  function retryFetch() {
    setCandidates(null);
    setCoverError(null);
    setCoverLoading(true);
    searchGoogleBooksCovers(series.title)
      .then((r) => {
        setCandidates(r);
        setCoverLoading(false);
      })
      .catch((e: any) => {
        const msg = e?.message ?? "Erreur";
        setCoverError(msg);
        setCoverLoading(false);
        toast.error(msg);
      });
  }

  function save() {
    start(async () => {
      try {
        await updateSeries(series.id, {
          title: title.trim(),
          publisher: publisher.trim(),
          edition_variant: variant.trim() || null,
          status,
          total_volumes: total ? Number(total) : null,
          cover_url: coverUrl,
        });
        setOpen(false);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur");
      }
    });
  }

  function remove() {
    if (!confirm(`Supprimer la série "${series.title}" et tous ses tomes ?`)) return;
    start(async () => {
      try {
        await deleteSeries(series.id);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur");
      }
    });
  }

  return (
    <>
      <button className="mt-ghost" onClick={openDialog}>
        Modifier
      </button>
      <button className="mt-ghost mt-ghost-danger" onClick={remove} disabled={pending}>
        Supprimer la série
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="rounded-xl border border-[var(--border-2)] bg-surface p-0 text-cream backdrop:bg-black/60"
      >
        <div className="w-[480px] max-w-[calc(100vw-2rem)] space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-medium tracking-tight">
            {mode === "edit" ? "Modifier la série" : "Choisir une couverture"}
          </h2>

          {mode === "edit" ? (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="shrink-0 w-20 overflow-hidden rounded shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)]"
                  style={{ aspectRatio: "0.71" }}
                >
                  <Cover url={coverUrl} seedKey={series.id} title={series.title} publisher={series.publisher} />
                </div>
                <button className="mt-ghost" type="button" onClick={openPicker}>
                  Changer la couverture
                </button>
              </div>
              <div>
                <label className="mt-label mb-1.5 block">Titre</label>
                <input className="mt-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mt-label mb-1.5 block">Éditeur</label>
                  <input className="mt-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
                </div>
                <div>
                  <label className="mt-label mb-1.5 block">Variante</label>
                  <input className="mt-input" value={variant} onChange={(e) => setVariant(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mt-label mb-1.5 block">Nb total de tomes</label>
                  <input className="mt-input" type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} />
                </div>
                <div>
                  <label className="mt-label mb-1.5 block">Statut</label>
                  <select className="mt-select w-full" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="ongoing">En cours</option>
                    <option value="completed">Terminée</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="mt-ghost" onClick={() => setOpen(false)}>Annuler</button>
                <button className="mt-cta" onClick={save} disabled={pending}>
                  {pending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="text-sm text-muted hover:text-cream"
                onClick={() => setMode("edit")}
              >
                ← Retour
              </button>

              {coverLoading && <p className="text-xs text-muted">Recherche…</p>}

              {coverError && !coverLoading && (
                <div className="space-y-2">
                  <p className="text-xs text-amber">{coverError}</p>
                  <button type="button" className="mt-ghost" onClick={retryFetch}>
                    Réessayer
                  </button>
                </div>
              )}

              {!coverLoading && !coverError && candidates && candidates.length === 0 && (
                <p className="text-xs text-muted">Aucune couverture trouvée pour cette série.</p>
              )}

              {!coverLoading && !coverError && candidates && candidates.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.publisher ? `${c.title} — ${c.publisher}` : c.title}
                      onClick={() => {
                        setCoverUrl(c.thumbnail);
                        setMode("edit");
                      }}
                      className="overflow-hidden rounded ring-1 ring-[var(--border)] hover:ring-2 hover:ring-amber"
                      style={{ aspectRatio: "0.71" }}
                    >
                      <img
                        src={c.thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const btn = e.currentTarget.parentElement as HTMLElement | null;
                          if (btn) btn.style.display = "none";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
