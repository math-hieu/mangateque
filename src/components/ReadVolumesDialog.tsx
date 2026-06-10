"use client";

import { useEffect, useRef, useState } from "react";
import { getVolumesReadInPeriod, type ReadVolume } from "@/actions/stats";
import { Cover } from "./Cover";

export type ReadPeriod = {
  type: "week" | "month";
  key: string;
  label: string;
};

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ReadVolumesDialog({
  period,
  onClose,
}: {
  period: ReadPeriod | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<ReadVolume[]>([]);

  useEffect(() => {
    if (period) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [period]);

  useEffect(() => {
    if (!period) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setVolumes([]);
    getVolumesReadInPeriod({ type: period.type, key: period.key })
      .then((rows) => {
        if (!cancelled) {
          setVolumes(rows);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.message ?? "Erreur");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto rounded-xl border border-[var(--border-2)] bg-surface p-0 text-cream backdrop:bg-black/60"
    >
      <div className="w-[480px] max-w-[calc(100vw-2rem)] space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium tracking-tight">
            Lectures — {period?.label ?? ""}
          </h2>
          <button className="mt-ghost" onClick={onClose} type="button">
            Fermer
          </button>
        </div>

        {loading && <p className="text-xs text-muted">Chargement…</p>}

        {error && !loading && <p className="text-xs text-amber">{error}</p>}

        {!loading && !error && volumes.length === 0 && (
          <p className="text-xs text-muted">Aucune lecture sur cette période.</p>
        )}

        {!loading && !error && volumes.length > 0 && (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {volumes.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-surface-2 p-2"
              >
                <div
                  className="shrink-0 w-10 overflow-hidden rounded shadow-[0_4px_12px_-6px_rgba(0,0,0,0.6)]"
                  style={{ aspectRatio: "0.71" }}
                >
                  <Cover
                    url={v.cover_url}
                    seedKey={v.series_id}
                    title={v.series_title}
                    publisher={v.series_publisher}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.series_title}</p>
                  <p className="mt-tabular text-xs text-cream-mute">
                    Tome {v.number} · {DATE_FORMAT.format(new Date(v.read_at))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
