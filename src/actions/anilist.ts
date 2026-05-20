"use server";

import { searchAniListMedia, type AniListResult } from "@/lib/anilist";

export async function searchAniListAction(
  search: string
): Promise<{ ok: true; results: AniListResult[] } | { ok: false }> {
  try {
    const results = await searchAniListMedia(search);
    return { ok: true, results };
  } catch (e) {
    console.error("AniList search failed", e);
    return { ok: false };
  }
}
