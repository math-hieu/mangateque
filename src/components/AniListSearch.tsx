"use client";

import { useEffect, useState } from "react";
import { searchAniListAction } from "@/actions/anilist";
import type { AniListResult } from "@/lib/anilist";
import { SeriesForm } from "./SeriesForm";

export function AniListSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AniListResult[]>([]);
  const [selected, setSelected] = useState<AniListResult | null>(null);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (manual || selected) return;
    if (!query.trim()) {
      setResults([]);
      setUnavailable(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchAniListAction(query);
      if (r.ok) {
        setResults(r.results);
        setUnavailable(false);
      } else {
        setResults([]);
        setUnavailable(true);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, manual, selected]);

  if (selected || manual) {
    return (
      <div className="space-y-4">
        <button
          className="text-sm text-muted hover:text-cream"
          onClick={() => {
            setSelected(null);
            setManual(false);
          }}
        >
          ← Retour à la recherche
        </button>
        <SeriesForm
          initial={
            selected
              ? {
                  anilist_id: selected.id,
                  title: selected.title,
                  cover_url: selected.coverUrl ?? undefined,
                  total_volumes: selected.volumes ?? undefined,
                  status: selected.status,
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-ink-2 px-3 py-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          autoFocus
          placeholder="Rechercher un manga sur AniList…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-cream outline-none placeholder:text-muted"
        />
      </div>
      {loading && <p className="text-xs text-muted">Recherche…</p>}
      {unavailable && (
        <p className="text-xs text-amber">Recherche indisponible. Créez la série manuellement.</p>
      )}
      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => setSelected(r)}
              className="flex w-full items-center gap-3 rounded-md border border-[var(--border)] bg-surface p-2 text-left hover:bg-surface-2"
            >
              {r.coverUrl && <img src={r.coverUrl} alt="" className="h-16 w-12 object-cover rounded" />}
              <div>
                <p className="text-sm font-medium text-cream">{r.title}</p>
                <p className="mt-mono text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
                  {r.volumes ? `${r.volumes} TOMES` : "NB DE TOMES INCONNU"} · {r.status === "ongoing" ? "EN COURS" : "TERMINÉE"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <button className="mt-ghost" onClick={() => setManual(true)}>
        Créer sans AniList
      </button>
    </div>
  );
}
