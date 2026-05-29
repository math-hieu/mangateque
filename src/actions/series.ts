"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Series, SeriesCardData, LibraryStats, ReadingItem } from "@/lib/types";

export type CreateSeriesInput = {
  anilist_id: number | null;
  title: string;
  cover_url: string | null;
  publisher: string;
  edition_variant: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed";
};

export type CoverCandidate = {
  id: string;
  thumbnail: string;
  title: string;
  publisher: string | null;
};

function cleanGoogleBooksThumbnail(url: string): string {
  return url
    .replace(/^http:\/\//, "https://")
    .replace(/&edge=curl/g, "")
    .replace(/([?&])zoom=\d+/g, "$1zoom=3");
}

export async function createSeries(input: CreateSeriesInput): Promise<string> {
  const { data, error } = await supabase()
    .from("series")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/series/${data.id}`);
}

export async function updateSeries(id: string, input: Partial<CreateSeriesInput>) {
  const { error } = await supabase().from("series").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/series/${id}`);
}

export async function deleteSeries(id: string) {
  const { error } = await supabase().from("series").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

export async function getSeries(id: string): Promise<Series | null> {
  const { data, error } = await supabase()
    .from("series")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSeriesForLibrary(): Promise<SeriesCardData[]> {
  const { data, error } = await supabase()
    .from("series")
    .select("*, volumes(price, is_read)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => {
    const vols = row.volumes ?? [];
    return {
      ...row,
      volumes: undefined,
      owned_count: vols.length,
      read_count: vols.filter((v: any) => v.is_read).length,
      total_spent: vols.reduce((s: number, v: any) => s + Number(v.price), 0),
    } as SeriesCardData;
  });
}

export async function listInProgressSeries(): Promise<ReadingItem[]> {
  const { data, error } = await supabase()
    .from("series")
    .select("id, title, publisher, edition_variant, cover_url, volumes(id, number, is_read, created_at)");
  if (error) throw new Error(error.message);

  const items: (ReadingItem & { _activity: number })[] = [];
  for (const row of data ?? []) {
    const vols = (row.volumes ?? []) as { id: string; number: number; is_read: boolean; created_at: string }[];
    if (vols.length === 0) continue;
    const readCount = vols.filter((v) => v.is_read).length;
    if (readCount === 0 || readCount === vols.length) continue;

    const nextUnread = [...vols].sort((a, b) => a.number - b.number).find((v) => !v.is_read);
    if (!nextUnread) continue;

    const lastActivity = Math.max(...vols.map((v) => new Date(v.created_at).getTime()));

    items.push({
      series: {
        id: row.id,
        title: row.title,
        publisher: row.publisher,
        edition_variant: row.edition_variant,
        cover_url: row.cover_url,
      },
      owned_count: vols.length,
      read_count: readCount,
      next_volume: { id: nextUnread.id, number: nextUnread.number },
      _activity: lastActivity,
    });
  }

  items.sort((a, b) => b._activity - a._activity);
  return items.map(({ _activity, ...rest }) => rest);
}

export async function getLibraryStats(): Promise<LibraryStats> {
  const sb = supabase();
  const [{ data: series }, { data: volumes }] = await Promise.all([
    sb.from("series").select("status"),
    sb.from("volumes").select("price, is_read"),
  ]);
  const vols = volumes ?? [];
  const allSeries = series ?? [];
  const totalSpent = vols.reduce((s, v: any) => s + Number(v.price), 0);
  const readCount = vols.filter((v: any) => v.is_read).length;
  return {
    total_spent: totalSpent,
    series_count: allSeries.length,
    completed_count: allSeries.filter((s: any) => s.status === "completed").length,
    volumes_count: vols.length,
    read_count: readCount,
    read_pct: vols.length === 0 ? 0 : Math.round((readCount / vols.length) * 100),
  };
}

type GoogleBooksSearchResponse = {
  items?: Array<{
    id: string;
    volumeInfo?: {
      title?: string;
      publisher?: string;
      imageLinks?: { thumbnail?: string };
    };
  }>;
};

export async function searchGoogleBooksCovers(seriesTitle: string): Promise<CoverCandidate[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) throw new Error("Clé API Google Books manquante");

  const safeTitle = seriesTitle.replace(/"/g, "");
  const q = `"${safeTitle}" tome 01`;
  const url =
    `https://www.googleapis.com/books/v1/volumes` +
    `?q=${encodeURIComponent(q)}` +
    `&langRestrict=fr` +
    `&maxResults=8` +
    `&key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erreur lors de la recherche Google Books (${res.status})`);

  const data: GoogleBooksSearchResponse = await res.json();
  const items = data.items ?? [];

  return items
    .map((it) => {
      const thumb = it.volumeInfo?.imageLinks?.thumbnail;
      if (!thumb) return null;
      return {
        id: it.id,
        thumbnail: cleanGoogleBooksThumbnail(thumb),
        title: it.volumeInfo?.title ?? "",
        publisher: it.volumeInfo?.publisher ?? null,
      } satisfies CoverCandidate;
    })
    .filter((c): c is CoverCandidate => c !== null);
}
