const ENDPOINT = "https://graphql.anilist.co";

export type AniListResult = {
  id: number;
  title: string;
  coverUrl: string | null;
  volumes: number | null;
  status: "ongoing" | "completed";
};

const SEARCH_QUERY = `
  query ($search: String) {
    Page(perPage: 10) {
      media(search: $search, type: MANGA, format_in: [MANGA, ONE_SHOT]) {
        id
        title { romaji english native }
        coverImage { large }
        volumes
        status
      }
    }
  }
`;

export async function searchAniListMedia(search: string): Promise<AniListResult[]> {
  if (!search.trim()) return [];
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search } }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = await res.json();
  const media = json?.data?.Page?.media ?? [];
  return media.map((m: any) => ({
    id: m.id,
    title: m.title.english ?? m.title.romaji ?? m.title.native,
    coverUrl: m.coverImage?.large ?? null,
    volumes: m.volumes ?? null,
    status: m.status === "RELEASING" ? "ongoing" : "completed",
  }));
}
