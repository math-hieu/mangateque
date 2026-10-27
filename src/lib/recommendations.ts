import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Recommendation, RecommendationFile } from "@/lib/types";

/** Écrit par le skill /reco ; inclus dans la sortie Vercel via `outputFileTracingIncludes`. */
const DIR = path.join(process.cwd(), "data/recommandations");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dates des générations disponibles, la plus récente d'abord. */
export async function listRecommendationDates(): Promise<string[]> {
  let files: string[];
  try {
    files = await readdir(DIR);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .filter((d) => DATE_RE.test(d))
    .sort()
    .reverse();
}

/**
 * `date` vient de l'URL : on ne lit que si elle figure parmi les fichiers
 * existants, ce qui écarte du même coup toute tentative de sortir du dossier.
 * Un fichier illisible (JSON cassé, édité à la main) renvoie null plutôt que
 * de faire tomber la page : c'est `scripts/reco-validate.mjs` qui garde le format.
 */
export async function readRecommendations(date: string): Promise<RecommendationFile | null> {
  if (!DATE_RE.test(date)) return null;
  const dates = await listRecommendationDates();
  if (!dates.includes(date)) return null;
  try {
    const file = JSON.parse(await readFile(path.join(DIR, `${date}.json`), "utf8"));
    return Array.isArray(file?.recommendations) ? (file as RecommendationFile) : null;
  } catch {
    return null;
  }
}

/** Comparaison de titres insensible à la casse, aux accents et à la ponctuation. */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Une reco est « dans ma bibliothèque » si une série possédée a le même id
 * AniList ; repli sur le titre pour les séries saisies sans AniList.
 */
export function ownedMatcher(
  owned: { anilist_id: number | null; title: string }[],
): (reco: Recommendation) => boolean {
  const ids = new Set(owned.map((s) => s.anilist_id).filter((id): id is number => id != null));
  const titles = new Set(owned.map((s) => normalizeTitle(s.title)));
  return (reco) =>
    ids.has(reco.anilist.id) ||
    titles.has(normalizeTitle(reco.title)) ||
    titles.has(normalizeTitle(reco.anilist.title_romaji));
}
