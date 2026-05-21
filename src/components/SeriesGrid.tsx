"use client";

import { useMemo, useState } from "react";
import { SeriesCard } from "./SeriesCard";
import type { SeriesCardData } from "@/lib/types";

type ReadFilter = "all" | "any-unread" | "all-read";

export function SeriesGrid({
  series,
  afterFilters,
}: {
  series: SeriesCardData[];
  afterFilters?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [publisher, setPublisher] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");

  const publishers = useMemo(
    () => Array.from(new Set(series.map((s) => s.publisher))).sort(),
    [series]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return series.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q)) return false;
      if (publisher !== "all" && s.publisher !== publisher) return false;
      if (status !== "all" && s.status !== status) return false;
      if (readFilter === "any-unread" && s.owned_count > 0 && s.read_count === s.owned_count) return false;
      if (readFilter === "all-read" && (s.owned_count === 0 || s.read_count !== s.owned_count)) return false;
      return true;
    });
  }, [series, query, publisher, status, readFilter]);

  const filterBtn =
    "inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-transparent px-[11px] py-[7px] text-xs text-cream-mute hover:text-cream";

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--border)] bg-surface p-2">
        <div className="order-1 flex w-full min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-ink-2 px-2.5 py-1.5 sm:order-none sm:w-auto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un titre…"
            className="flex-1 bg-transparent text-[13px] text-cream outline-none placeholder:text-muted"
          />
        </div>
        <label className={filterBtn}>
          Éditeur
          <select
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            className="mt-mono bg-transparent text-cream outline-none"
          >
            <option value="all">· Tous</option>
            {publishers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className={filterBtn}>
          Statut
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-mono bg-transparent text-cream outline-none"
          >
            <option value="all">· Tous</option>
            <option value="ongoing">En cours</option>
            <option value="completed">Terminée</option>
          </select>
        </label>
        <label className={filterBtn}>
          Lecture
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
            className="mt-mono bg-transparent text-cream outline-none"
          >
            <option value="all">· Tous</option>
            <option value="any-unread">Avec non lus</option>
            <option value="all-read">100% lus</option>
          </select>
        </label>
      </div>
      {afterFilters}
      <h2 className="m-0 mb-3 flex items-baseline gap-2.5 px-0.5 text-[15px] font-medium tracking-tight text-cream">
        <span>Ma bibliothèque</span>
        <span className="mt-mono text-[11px] text-muted" style={{ letterSpacing: "0.06em" }}>
          {filtered.length}&nbsp;{filtered.length > 1 ? "SÉRIES" : "SÉRIE"}
        </span>
      </h2>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Aucune série ne correspond.</p>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          {filtered.map((s) => <SeriesCard key={s.id} s={s} />)}
        </div>
      )}
    </div>
  );
}
