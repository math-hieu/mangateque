"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSeriesRating } from "@/actions/series";

const STARS = [1, 2, 3, 4, 5];

export function RatingInput({ seriesId, rating }: { seriesId: string; rating: number | null }) {
  const [value, setValue] = useState(rating);
  const [hover, setHover] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const shown = hover ?? value ?? 0;

  function save(next: number | null) {
    const previous = value;
    // Affichage immédiat ; on revient à l'ancienne note si l'écriture échoue.
    setValue(next);
    start(async () => {
      try {
        await setSeriesRating(seriesId, next);
      } catch (e: any) {
        setValue(previous);
        toast.error(e?.message ?? "Erreur");
      }
    });
  }

  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="inline-flex gap-0.5" onMouseLeave={() => setHover(null)}>
        {STARS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onClick={() => save(n)}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            aria-label={`Noter ${n} sur 5`}
            aria-pressed={value === n}
            className={`cursor-pointer bg-transparent p-0 text-lg leading-none transition-colors disabled:cursor-wait ${
              n <= shown ? "text-amber" : "text-muted-2 hover:text-muted"
            }`}
          >
            ★
          </button>
        ))}
      </span>
      {value == null ? (
        <span className="mt-mono text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
          PAS ENCORE NOTÉE
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => save(null)}
          className="rounded-[5px] border border-[var(--border)] bg-transparent px-[7px] py-0.5 text-[11px] text-muted hover:text-cream disabled:cursor-wait"
        >
          ✕ Retirer
        </button>
      )}
    </span>
  );
}
