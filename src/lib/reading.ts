import type { SeriesFormat } from "./types";

export type ReadVolumeEntry = {
  series_id: string;
  series_title: string;
  series_issuer: string;
  format: SeriesFormat;
  edition_variant: string | null;
  cover_url: string | null;
  number: number;
  read_at: string;
};

export type ReadingGroup = {
  series_id: string;
  series_title: string;
  series_issuer: string;
  format: SeriesFormat;
  edition_variant: string | null;
  cover_url: string | null;
  from_volume: number;
  to_volume: number;
  count: number;
  first_read_at: string;
  last_read_at: string;
};

/**
 * Regroupe un flux de lectures trié du plus ancien au plus récent : les tomes
 * d'une même série dont les numéros s'enchaînent (n, n+1, …) forment un seul
 * groupe, même étalés sur plusieurs jours. Un tome d'une autre série, ou un
 * trou dans la numérotation, ouvre un nouveau groupe.
 *
 * Le résultat est rendu du plus récent au plus ancien.
 */
export function groupReadingHistory(entries: ReadVolumeEntry[]): ReadingGroup[] {
  const groups: ReadingGroup[] = [];

  for (const entry of entries) {
    const current = groups[groups.length - 1];
    if (current && current.series_id === entry.series_id && entry.number === current.to_volume + 1) {
      current.to_volume = entry.number;
      current.count += 1;
      current.last_read_at = entry.read_at;
      continue;
    }

    groups.push({
      series_id: entry.series_id,
      series_title: entry.series_title,
      series_issuer: entry.series_issuer,
      format: entry.format,
      edition_variant: entry.edition_variant,
      cover_url: entry.cover_url,
      from_volume: entry.number,
      to_volume: entry.number,
      count: 1,
      first_read_at: entry.read_at,
      last_read_at: entry.read_at,
    });
  }

  return groups.reverse();
}
