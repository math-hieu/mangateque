"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Series, SeriesCardData, LibraryStats, ReadingItem, SeriesFormat } from "@/lib/types";

export type CreateSeriesInput = {
  anilist_id: number | null;
  title: string;
  cover_url: string | null;
  format: SeriesFormat;
  publisher: string | null;
  platform: string | null;
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

/** Garde-fou : le compte vient d'AniList ou d'une saisie libre, pas d'une source sûre. */
const MAX_AUTO_VOLUMES = 1000;

/**
 * `volumeCount` crée d'office les tomes 1 à N, sans prix : sur une plateforme
 * numérique on a accès à toute la série, contrairement au physique où une ligne
 * de tome signifie qu'on le possède.
 */
export async function createSeries(
  input: CreateSeriesInput,
  volumeCount?: number,
): Promise<string> {
  const sb = supabase();
  const { data, error } = await sb
    .from("series")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (volumeCount != null) {
    if (!Number.isInteger(volumeCount) || volumeCount < 1 || volumeCount > MAX_AUTO_VOLUMES) {
      throw new Error(`Nombre de tomes invalide (1 à ${MAX_AUTO_VOLUMES})`);
    }
    // Une seule insertion plutôt que N, et avant le redirect : celui-ci lève une
    // exception de contrôle de flux qui couperait tout ce qui le suit.
    const { error: volErr } = await sb.from("volumes").insert(
      Array.from({ length: volumeCount }, (_, i) => ({
        series_id: data.id,
        number: i + 1,
        price: null,
        is_read: false,
      })),
    );
    // La série reste créée : on la retrouve sans tomes, l'état habituel après
    // n'importe quelle création. L'erreur remonte pour ne pas passer inaperçue.
    if (volErr) throw new Error(volErr.message);
  }

  revalidatePath("/");
  revalidatePath("/numerique");
  redirect(`/series/${data.id}`);
}

export async function updateSeries(id: string, input: Partial<CreateSeriesInput>) {
  const { error } = await supabase().from("series").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/numerique");
  revalidatePath(`/series/${id}`);
}

export async function deleteSeries(id: string) {
  const sb = supabase();
  const { data: existing } = await sb.from("series").select("format").eq("id", id).maybeSingle();
  const { error } = await sb.from("series").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/numerique");
  redirect(existing?.format === "digital" ? "/numerique" : "/");
}

/** Plateformes déjà utilisées, pour l'autocomplétion du formulaire. */
export async function listPlatforms(): Promise<string[]> {
  const { data, error } = await supabase()
    .from("series")
    .select("platform")
    .eq("format", "digital")
    .not("platform", "is", null);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((r: any) => r.platform as string))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
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

export async function listSeriesForLibrary(
  format: SeriesFormat = "physical",
): Promise<SeriesCardData[]> {
  const { data, error } = await supabase()
    .from("series")
    .select("*, volumes(price, is_read)")
    .eq("format", format)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => {
    const vols = row.volumes ?? [];
    return {
      ...row,
      volumes: undefined,
      owned_count: vols.length,
      read_count: vols.filter((v: any) => v.is_read).length,
      total_spent: vols.reduce((s: number, v: any) => s + Number(v.price ?? 0), 0),
    } as SeriesCardData;
  });
}

/**
 * Séries dont la lecture peut continuer, triées par activité la plus récente.
 * Sans `format`, les deux supports sont renvoyés entrelacés : « ce que je lis »
 * est une notion d'activité, pas de possession.
 */
export async function listInProgressSeries(format?: SeriesFormat): Promise<ReadingItem[]> {
  let query = supabase()
    .from("series")
    .select("id, title, publisher, platform, format, edition_variant, cover_url, volumes(id, number, is_read, read_at, created_at)");
  if (format) query = query.eq("format", format);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const items: (ReadingItem & { _activity: number })[] = [];
  for (const row of data ?? []) {
    const vols = (row.volumes ?? []) as { id: string; number: number; is_read: boolean; read_at: string | null; created_at: string }[];
    if (vols.length === 0) continue;
    const readNumbers = vols.filter((v) => v.is_read).map((v) => v.number);
    if (readNumbers.length === 0) continue;

    // La lecture ne peut continuer que si le tome suivant immédiatement le
    // dernier tome lu est dans la collection.
    const nextAfterLastRead = vols.find((v) => v.number === Math.max(...readNumbers) + 1);
    if (!nextAfterLastRead) continue;

    // Tri sur la lecture la plus récente ; repli sur la date d'ajout pour les
    // tomes marqués lus sans read_at.
    const readDates = vols
      .filter((v) => v.is_read && v.read_at)
      .map((v) => new Date(v.read_at as string).getTime());
    const lastActivity = readDates.length
      ? Math.max(...readDates)
      : Math.max(...vols.map((v) => new Date(v.created_at).getTime()));

    items.push({
      series: {
        id: row.id,
        title: row.title,
        publisher: row.publisher,
        platform: row.platform,
        format: row.format,
        edition_variant: row.edition_variant,
        cover_url: row.cover_url,
      },
      owned_count: vols.length,
      read_count: readNumbers.length,
      next_volume: { id: nextAfterLastRead.id, number: nextAfterLastRead.number },
      _activity: lastActivity,
    });
  }

  items.sort((a, b) => b._activity - a._activity);
  return items.map(({ _activity, ...rest }) => rest);
}

export async function getLibraryStats(): Promise<LibraryStats> {
  const sb = supabase();
  const [{ data: series }, { data: volumes }] = await Promise.all([
    sb.from("series").select("status").eq("format", "physical"),
    sb
      .from("volumes")
      .select("price, is_read, series!inner(format)")
      .eq("series.format", "physical"),
  ]);
  const vols = volumes ?? [];
  const allSeries = series ?? [];
  const totalSpent = vols.reduce((s, v: any) => s + Number(v.price ?? 0), 0);
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
