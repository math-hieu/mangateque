// Contexte du skill /reco : séries notées et séries possédées, en JSON sur stdout.
// Usage : node --env-file=.env scripts/reco-context.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars (lancer avec --env-file=.env)");
  process.exit(1);
}

const db = createClient(url, key, {
  db: { schema: "mangateque" },
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await db
  .from("series")
  .select("title, anilist_id, rating, format, status, total_volumes, volumes(is_read)")
  .order("title");
if (error) {
  console.error(`Supabase error: ${error.message}`);
  process.exit(1);
}

const rated = data
  .filter((s) => s.rating != null)
  .map((s) => ({
    title: s.title,
    rating: s.rating,
    anilist_id: s.anilist_id,
    format: s.format,
    owned_volumes: s.volumes.length,
    read_volumes: s.volumes.filter((v) => v.is_read).length,
    total_volumes: s.total_volumes,
    status: s.status,
  }));

const owned = data.map((s) => ({ title: s.title, anilist_id: s.anilist_id }));

console.log(JSON.stringify({ rated, owned }, null, 2));
