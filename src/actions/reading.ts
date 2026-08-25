"use server";

import { supabase } from "@/lib/supabase";
import { issuerLabel } from "@/lib/series";
import { groupReadingHistory, type ReadingGroup } from "@/lib/reading";
import type { SeriesFormat } from "@/lib/types";

/**
 * Historique de lecture, du plus récent au plus ancien. Les tomes marqués lus
 * sans `read_at` (lignes antérieures au suivi de date) sont exclus : sans date
 * ils n'ont pas de place dans une frise chronologique.
 */
export async function listReadingHistory(): Promise<ReadingGroup[]> {
  const { data, error } = await supabase()
    .from("volumes")
    .select("series_id, number, read_at, series(title, publisher, platform, format, edition_variant, cover_url)")
    .not("read_at", "is", null)
    // Un marquage en masse pose le même timestamp sur tous les tomes : on
    // départage par série avant le numéro, sinon deux séries marquées lues
    // ensemble s'entrelacent et cassent les groupes.
    .order("read_at", { ascending: true })
    .order("series_id", { ascending: true })
    .order("number", { ascending: true });
  if (error) throw new Error(error.message);

  return groupReadingHistory(
    (data ?? []).map((row: any) => ({
      series_id: row.series_id,
      series_title: row.series?.title ?? "",
      series_issuer: issuerLabel({
        publisher: row.series?.publisher ?? null,
        platform: row.series?.platform ?? null,
      }),
      format: (row.series?.format ?? "physical") as SeriesFormat,
      edition_variant: row.series?.edition_variant ?? null,
      cover_url: row.series?.cover_url ?? null,
      number: row.number,
      read_at: row.read_at,
    })),
  );
}
