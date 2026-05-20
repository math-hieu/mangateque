"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { addVolume } from "@/actions/volumes";

const ROW_GRID = "60px 100px 1fr 120px 120px 40px";

export function QuickAddVolume({ seriesId, suggestedNumber }: { seriesId: string; suggestedNumber: number }) {
  const [number, setNumber] = useState(String(suggestedNumber));
  const [price, setPrice] = useState("");
  const numberRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(number);
    const p = Number(price.replace(",", "."));
    if (!Number.isInteger(n) || n <= 0) return toast.error("Numéro invalide");
    if (!(p >= 0)) return toast.error("Prix invalide");
    start(async () => {
      try {
        await addVolume(seriesId, n, p);
        setNumber(String(n + 1));
        setPrice("");
        numberRef.current?.focus();
      } catch (e: any) {
        toast.error(e.message ?? "Erreur ajout");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid items-center border-t border-dashed border-[var(--border-2)] px-[18px] py-3"
      style={{ gridTemplateColumns: ROW_GRID, background: "rgba(232,161,74,0.04)" }}
    >
      <input
        ref={numberRef}
        type="number"
        min={1}
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        className="mt-mono inline-block text-center"
        style={{
          fontSize: 12,
          background: "transparent",
          color: "var(--cream)",
          border: "1px solid var(--amber)",
          borderRadius: 4,
          padding: "2px 8px",
          minWidth: 40,
          outline: "none",
        }}
      />
      <span className="text-[11px] text-muted">par défaut</span>
      <span className="text-[11px] italic text-muted">—</span>
      <input
        type="text"
        inputMode="decimal"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="8,25 €"
        className="mt-mono bg-transparent text-right text-[13px] text-cream outline-none placeholder:text-muted-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-mono text-right text-[11px] text-amber hover:text-amber-deep"
        style={{ letterSpacing: "0.06em" }}
      >
        ↵ ENTRER
      </button>
      <span />
    </form>
  );
}
