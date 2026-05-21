"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Volume } from "@/lib/types";
import { toggleVolumeRead, deleteVolume, updateVolumePrice } from "@/actions/volumes";

function formatPrice(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

function EditablePrice({ volumeId, price }: { volumeId: string; price: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(formatPrice(price));
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!editing) setValue(formatPrice(price));
  }, [price, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function save() {
    const next = Number(value.replace(",", "."));
    if (!Number.isFinite(next) || next < 0) {
      toast.error("Prix invalide");
      setValue(formatPrice(price));
      setEditing(false);
      return;
    }
    if (Math.abs(next - price) < 0.005) {
      setEditing(false);
      return;
    }
    start(async () => {
      try {
        await updateVolumePrice(volumeId, next);
        setEditing(false);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur");
        setValue(formatPrice(price));
        setEditing(false);
      }
    });
  }

  function cancel() {
    setValue(formatPrice(price));
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          else if (e.key === "Escape") cancel();
        }}
        disabled={pending}
        aria-label="Modifier le prix"
        className="mt-mono w-full bg-transparent text-right outline-none"
        style={{
          fontVariantNumeric: "tabular-nums",
          fontSize: 13,
          color: "var(--cream)",
          border: "1px solid var(--amber)",
          borderRadius: 4,
          padding: "2px 6px",
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Modifier le prix"
      className="mt-mono w-full cursor-text rounded text-right hover:text-amber"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {formatPrice(price)} €
    </button>
  );
}

// Mobile: 4 columns (N°, Lu, Prix, Delete). Desktop: 6 columns (with empty spacer + Date).
const GRID_CLS =
  "grid grid-cols-[44px_72px_1fr_36px] sm:grid-cols-[60px_100px_1fr_120px_120px_40px]";

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
        className={`mt-mono ${GRID_CLS} border-b border-[var(--border)] bg-ink-2 px-3 py-2.5 text-[10px] text-muted sm:px-[18px]`}
        style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        <span>N°</span>
        <span>Lu</span>
        <span className="hidden sm:inline" />
        <span className="text-right">Prix</span>
        <span className="hidden text-right sm:inline">Ajouté le</span>
        <span></span>
      </div>
      {volumes.length === 0 ? (
        <p className="px-3 py-6 text-sm text-muted sm:px-[18px]">Aucun tome. Ajoute le premier ci-dessous.</p>
      ) : (
        volumes.map((v) => (
          <div
            key={v.id}
            className={`${GRID_CLS} items-center border-b border-[var(--border)] px-3 py-3 text-[13px] sm:px-[18px]`}
          >
            <span
              className="mt-mono inline-block text-center"
              style={{
                fontSize: 12,
                border: "1px solid var(--border-2)",
                borderRadius: 4,
                padding: "2px 8px",
                minWidth: 36,
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
            <span className="hidden sm:inline" />
            <EditablePrice volumeId={v.id} price={Number(v.price)} />
            <span className="mt-mono hidden text-right text-xs text-muted sm:inline" style={{ fontVariantNumeric: "tabular-nums" }}>
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
