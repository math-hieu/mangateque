"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Volume } from "@/lib/types";
import { toggleVolumeRead, deleteVolume } from "@/actions/volumes";

const ROW_GRID = "60px 100px 1fr 120px 120px 40px";

export function VolumesTable({ volumes }: { volumes: Volume[] }) {
  const [, start] = useTransition();

  function toggle(v: Volume, next: boolean) {
    start(async () => {
      try {
        await toggleVolumeRead(v.id, next);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur");
      }
    });
  }

  function remove(v: Volume) {
    if (!confirm(`Supprimer le tome ${v.number} ?`)) return;
    start(async () => {
      try {
        await deleteVolume(v.id);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur");
      }
    });
  }

  return (
    <>
      <div
        className="mt-mono grid border-b border-[var(--border)] bg-ink-2 px-[18px] py-2.5 text-[10px] text-muted"
        style={{ gridTemplateColumns: ROW_GRID, letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        <span>N°</span>
        <span>Lu</span>
        <span></span>
        <span className="text-right">Prix</span>
        <span className="text-right">Ajouté le</span>
        <span></span>
      </div>
      {volumes.length === 0 ? (
        <p className="px-[18px] py-6 text-sm text-muted">Aucun tome. Ajoute le premier ci-dessous.</p>
      ) : (
        volumes.map((v) => (
          <div
            key={v.id}
            className="grid items-center border-b border-[var(--border)] px-[18px] py-3 text-[13px]"
            style={{ gridTemplateColumns: ROW_GRID }}
          >
            <span
              className="mt-mono inline-block text-center"
              style={{
                fontSize: 12,
                border: "1px solid var(--border-2)",
                borderRadius: 4,
                padding: "2px 8px",
                minWidth: 40,
                letterSpacing: "0.04em",
              }}
            >
              {String(v.number).padStart(2, "0")}
            </span>
            <span className="flex items-center gap-2">
              <button
                onClick={() => toggle(v, !v.is_read)}
                aria-label={v.is_read ? "Marquer non lu" : "Marquer lu"}
                className="inline-flex h-4 w-4 items-center justify-center rounded-[4px]"
                style={{
                  border: `1px solid ${v.is_read ? "var(--amber)" : "var(--border-3)"}`,
                  background: v.is_read ? "var(--amber)" : "transparent",
                  color: "#1a1208",
                }}
              >
                {v.is_read && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m2.5 6 2.5 2.5L9.5 4" />
                  </svg>
                )}
              </button>
              <span className="text-xs" style={{ color: v.is_read ? "var(--cream)" : "var(--muted)" }}>
                {v.is_read ? "Lu" : "—"}
              </span>
            </span>
            <span />
            <span className="mt-mono text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
              {Number(v.price).toFixed(2).replace(".", ",")} €
            </span>
            <span className="mt-mono text-right text-xs text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
              {new Date(v.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
            </span>
            <button
              onClick={() => remove(v)}
              aria-label="Supprimer le tome"
              className="flex h-[22px] w-[22px] items-center justify-center rounded text-muted-2 hover:text-crimson"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4l.6 8a1 1 0 0 0 1 1h2.8a1 1 0 0 0 1-1L11 4" />
              </svg>
            </button>
          </div>
        ))
      )}
    </>
  );
}
