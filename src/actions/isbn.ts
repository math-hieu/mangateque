"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { parseVolumeTitle, normalizeForMatch } from "@/lib/isbn";
import { searchAniListMedia } from "@/lib/anilist";
import type { IsbnLookupResult } from "@/lib/types";
import type { CreateSeriesInput } from "@/actions/series";

type GoogleBooksResponse = {
  totalItems: number;
  items?: Array<{
    volumeInfo: {
      title?: string;
      authors?: string[];
      publisher?: string;
      imageLinks?: { thumbnail?: string };
    };
  }>;
};

export async function lookupIsbn(isbn: string): Promise<IsbnLookupResult> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) throw new Error("Clé API Google Books manquante");

  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&key=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Erreur lors de la recherche Google Books");

  const data: GoogleBooksResponse = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error("Livre non trouvé pour cet ISBN");
  }

  const info = data.items[0].volumeInfo;
  const rawTitle = info.title ?? "Titre inconnu";
  const parsed = parseVolumeTitle(rawTitle);
  let coverUrl = info.imageLinks?.thumbnail?.replace("http://", "https://") ?? null;
  const publisher = info.publisher ?? null;

  if (!coverUrl) {
    try {
      const aniResults = await searchAniListMedia(parsed.seriesTitle);
      if (aniResults.length > 0) coverUrl = aniResults[0].coverUrl;
    } catch {}
  }

  const normalizedTitle = normalizeForMatch(parsed.seriesTitle);
  const { data: allSeries } = await supabase()
    .from("series")
    .select("id, title");

  let matchedSeries: { id: string; title: string } | null = null;
  for (const s of allSeries ?? []) {
    if (normalizeForMatch(s.title) === normalizedTitle) {
      matchedSeries = { id: s.id, title: s.title };
      break;
    }
  }

  let alreadyOwned = false;
  if (matchedSeries && parsed.volumeNumber != null) {
    const { data: existing } = await supabase()
      .from("volumes")
      .select("id")
      .eq("series_id", matchedSeries.id)
      .eq("number", parsed.volumeNumber)
      .maybeSingle();
    alreadyOwned = existing != null;
  }

  return {
    isbn,
    rawTitle,
    seriesTitle: parsed.seriesTitle,
    volumeNumber: parsed.volumeNumber,
    coverUrl,
    publisher,
    matchedSeries,
    alreadyOwned,
  };
}

export async function createSeriesAndAddVolume(
  input: CreateSeriesInput,
  volumeNumber: number,
  price: number,
): Promise<string> {
  const sb = supabase();
  const { data: series, error: seriesErr } = await sb
    .from("series")
    .insert(input)
    .select("id")
    .single();
  if (seriesErr) throw new Error(seriesErr.message);

  const { error: volErr } = await sb.from("volumes").insert({
    series_id: series.id,
    number: volumeNumber,
    price,
    is_read: false,
  });
  if (volErr) throw new Error(volErr.message);

  revalidatePath("/");
  return series.id;
}
