"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSeries, deleteSeries } from "@/actions/series";
import type { Series } from "@/lib/types";

export function SeriesActions({ series }: { series: Series }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(series.title);
  const [publisher, setPublisher] = useState(series.publisher);
  const [variant, setVariant] = useState(series.edition_variant ?? "");
  const [status, setStatus] = useState(series.status);
  const [total, setTotal] = useState(series.total_volumes != null ? String(series.total_volumes) : "");
  const [pending, start] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  function save() {
    start(async () => {
      try {
        await updateSeries(series.id, {
          title: title.trim(),
          publisher: publisher.trim(),
          edition_variant: variant.trim() || null,
          status,
          total_volumes: total ? Number(total) : null,
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
      <button className="mt-ghost" onClick={() => setOpen(true)}>
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
        <div className="w-[480px] max-w-[90vw] space-y-4 p-6">
          <h2 className="text-lg font-medium tracking-tight">Modifier la série</h2>
          <div>
            <label className="mt-label mb-1.5 block">Titre</label>
            <input className="mt-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mt-label mb-1.5 block">Éditeur</label>
              <input className="mt-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
            </div>
            <div>
              <label className="mt-label mb-1.5 block">Variante</label>
              <input className="mt-input" value={variant} onChange={(e) => setVariant(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
        </div>
      </dialog>
    </>
  );
}
