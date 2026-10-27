// Contrôle un fichier de recommandations avant commit (format : spec 2026-10-27, §2).
// Usage : node scripts/reco-validate.mjs data/recommandations/YYYY-MM-DD.json
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage : node scripts/reco-validate.mjs <fichier.json>");
  process.exit(1);
}

const errors = [];
const fail = (path, msg) => errors.push(`${path}: ${msg}`);

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isInt = (v, min = -Infinity) => Number.isInteger(v) && v >= min;
const isHttps = (v) => typeof v === "string" && v.startsWith("https://");
const STATUSES = ["ongoing", "completed"];

function check(cond, path, msg) {
  if (!cond) fail(path, msg);
  return cond;
}

if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(basename(file))) {
  fail("fichier", "le nom doit être YYYY-MM-DD.json");
}

let doc;
try {
  doc = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`JSON illisible : ${e.message}`);
  process.exit(1);
}

check(typeof doc.generated_at === "string" && !Number.isNaN(Date.parse(doc.generated_at)),
  "generated_at", "attendu une date ISO");
if (check(isObj(doc.based_on), "based_on", "attendu un objet")) {
  check(isInt(doc.based_on.rated_count, 0), "based_on.rated_count", "attendu un entier ≥ 0");
  check(isInt(doc.based_on.owned_count, 0), "based_on.owned_count", "attendu un entier ≥ 0");
}

const recos = doc.recommendations;
if (check(Array.isArray(recos), "recommendations", "attendu un tableau")) {
  check(recos.length === 10, "recommendations", `attendu exactement 10 recos, trouvé ${recos.length}`);
  const seenIds = new Set();

  recos.forEach((r, i) => {
    const p = `recommendations[${i}]`;
    if (!check(isObj(r), p, "attendu un objet")) return;

    check(r.rank === i + 1, `${p}.rank`, `attendu ${i + 1}`);
    check(isStr(r.title), `${p}.title`, "attendu une chaîne non vide");
    check(isStr(r.why), `${p}.why`, "attendu une chaîne non vide");
    for (const k of ["pros", "cons"]) {
      check(Array.isArray(r[k]) && r[k].length >= 1 && r[k].length <= 6 && r[k].every(isStr),
        `${p}.${k}`, "attendu 1 à 6 chaînes non vides");
    }
    if (check(Array.isArray(r.sources) && r.sources.length >= 1, `${p}.sources`, "attendu au moins une source")) {
      r.sources.forEach((s, j) => {
        check(isObj(s) && isStr(s.label) && isHttps(s.url), `${p}.sources[${j}]`, "attendu { label, url https:// }");
      });
    }
    check(r.related_to === null || isStr(r.related_to), `${p}.related_to`, "attendu null ou une chaîne non vide");

    const fr = r.fr;
    if (check(isObj(fr), `${p}.fr`, "attendu un objet")) {
      check(isStr(fr.publisher), `${p}.fr.publisher`, "attendu une chaîne non vide");
      check(isInt(fr.volumes, 1), `${p}.fr.volumes`, "attendu un entier ≥ 1");
      check(STATUSES.includes(fr.status), `${p}.fr.status`, `attendu ${STATUSES.join(" ou ")}`);
      check(isHttps(fr.source_url), `${p}.fr.source_url`, "attendu une URL https://");
    }

    const a = r.anilist;
    if (check(isObj(a), `${p}.anilist`, "attendu un objet")) {
      if (check(isInt(a.id, 1), `${p}.anilist.id`, "attendu un entier")) {
        check(!seenIds.has(a.id), `${p}.anilist.id`, `doublon (${a.id})`);
        seenIds.add(a.id);
      }
      check(typeof a.url === "string" && a.url.startsWith("https://anilist.co/manga/"),
        `${p}.anilist.url`, "attendu https://anilist.co/manga/…");
      check(isStr(a.title_romaji), `${p}.anilist.title_romaji`, "attendu une chaîne non vide");
      check(isHttps(a.cover_url), `${p}.anilist.cover_url`, "attendu une URL https://");
      check(a.volumes === null || isInt(a.volumes, 1), `${p}.anilist.volumes`, "attendu un entier ≥ 1 ou null");
      check(STATUSES.includes(a.status), `${p}.anilist.status`, `attendu ${STATUSES.join(" ou ")}`);
      check(a.average_score === null || isInt(a.average_score, 0), `${p}.anilist.average_score`, "attendu un entier ou null");
      check(Array.isArray(a.genres) && a.genres.every(isStr), `${p}.anilist.genres`, "attendu un tableau de chaînes");
      check(isInt(a.start_year, 1900), `${p}.anilist.start_year`, "attendu une année");
      check(Array.isArray(a.authors) && a.authors.length >= 1 && a.authors.every(isStr),
        `${p}.anilist.authors`, "attendu au moins un auteur");
    }
  });
}

if (errors.length) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log("OK");
