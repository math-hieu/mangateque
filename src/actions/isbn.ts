"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { parseVolumeTitle, normalizeForMatch } from "@/lib/isbn";
import type { IsbnLookupResult } from "@/lib/types";
import type { CreateSeriesInput } from "@/actions/series";

type OpenLibraryBook = {
  title?: string;
  publishers?: Array<{ name: string }>;
  cover?: { medium?: string; large?: string };
};

type OpenLibraryResponse = Record<string, OpenLibraryBook>;

export async function lookupIsbn(isbn: string): Promise<IsbnLookupResult> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur lors de la recherche Open Library");

  const data: OpenLibraryResponse = await res.json();
  const book = data[`ISBN:${isbn}`];
  if (!book) {
    throw new Error("Livre non trouvé pour cet ISBN");
  }

  const rawTitle = book.title ?? "Titre inconnu";
  const parsed = parseVolumeTitle(rawTitle);
  const coverUrl = book.cover?.large ?? book.cover?.medium ?? null;
  const publisher = book.publishers?.[0]?.name ?? null;

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

  return {
    isbn,
    rawTitle,
    seriesTitle: parsed.seriesTitle,
    volumeNumber: parsed.volumeNumber,
    coverUrl,
    publisher,
    matchedSeries,
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
