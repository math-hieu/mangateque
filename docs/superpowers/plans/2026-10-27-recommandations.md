# Recommandations — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une page `/recommandations` qui affiche 10 séries recommandées (infos AniList + édition VF + avis), lues depuis des fichiers JSON datés que génère un skill Claude Code `/reco` lancé à la main en local.

**Architecture:** Le skill (`.claude/skills/reco/SKILL.md`) s'appuie sur deux scripts Node du dépôt : `scripts/reco-context.mjs` (lit Supabase → contexte JSON) et `scripts/reco-validate.mjs` (contrôle le fichier avant écriture définitive). Les fichiers vivent dans `data/recommandations/YYYY-MM-DD.json`, commités. Côté Next, `src/lib/recommendations.ts` liste/lit ces fichiers via `fs` (inclus dans la sortie Vercel par `outputFileTracingIncludes`) ; la page croise avec Supabase pour le badge « Dans ma bibliothèque ».

**Tech Stack:** Next.js 16 (App Router, server components), React 19, Supabase (schéma `mangateque`), Tailwind v4, Node ≥ 20 (`--env-file`), Claude Code skills.

**Spec:** `docs/superpowers/specs/2026-10-27-recommandations-design.md`

## Global Constraints

- **Pas de tests automatisés** (décision de l'utilisateur, comme pour les features précédentes). Vérification par `npx tsc --noEmit`, `npm run build`, exécution des scripts, et contrôle manuel (`npm run dev`). Ne pas installer de runner de test.
- **Next.js 16 :** `searchParams` d'une page est une `Promise` à `await`er. Lire `node_modules/next/dist/docs/` avant d'écrire du code Next (notamment `01-app/03-api-reference/03-file-conventions/page.md` et `05-config/01-next-config-js/output.md` pour `outputFileTracingIncludes`).
- **Langue :** toute chaîne visible est en français.
- **Toujours exactement 10 recos** par fichier, chacune avec `fr` et `anilist` renseignés ; seul `anilist.volumes` peut être `null`.
- **Statuts :** `"ongoing" | "completed"` (VO et VF), convention de `src/lib/anilist.ts`.
- **Manga japonais uniquement** (`countryOfOrigin: JP` sur AniList).
- **Aucun appel LLM ni clé API côté site.** Le skill n'est jamais exécuté sur Vercel.
- **Le skill ne commite pas** : l'utilisateur relit et commite lui-même.
- **Style :** classes maison existantes (`mt-mono`, `mt-label`, `mt-ghost`, `text-cream`, `text-muted`, `bg-surface`, `var(--border)`, `var(--border-2)`, `var(--amber)`…) ; réutiliser `src/components/Cover.tsx` pour les couvertures (le projet n'utilise pas `next/image`).
- **Commits :** un par tâche, conventional commits en français, scope `recommandations`.

## Review Focus

1. **`?date=` arbitraire** (`../../.env`, `2026-13-45`, date sans fichier) → jamais de lecture hors de `data/recommandations/` ; on retombe sur la génération la plus récente. Testé en Task 4, step 5.
2. **Aucun fichier** (dossier absent ou vide) → la page affiche l'état vide qui invite à lancer `/reco`, sans erreur 500. Testé en Task 4, step 5.
3. **Série possédée sans `anilist_id`** (saisie libre) → le badge s'appuie sur le titre normalisé (casse, accents, ponctuation ignorés). Testé en Task 4, step 5.
4. **Fichier JSON incomplet ou mal formé** produit par le skill (9 recos, `fr` manquant, statut `"RELEASING"`) → refusé par `reco-validate.mjs` avant d'être commité. Testé en Task 1, step 4.
5. **Build de prod** : les JSON doivent être présents dans la fonction Vercel, sinon la page en ligne est vide alors qu'elle marche en dev. Testé en Task 4, step 6.

---

### Task 1: Scripts de contexte et de validation

**Files:**
- Create: `scripts/reco-context.mjs`
- Create: `scripts/reco-validate.mjs`

**Interfaces:**
- Consumes: variables `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` de `.env`.
- Produces:
  - `node --env-file=.env scripts/reco-context.mjs` → JSON sur stdout :
    `{ rated: Array<{ title, rating, anilist_id, format, owned_volumes, read_volumes, total_volumes, status }>, owned: Array<{ title, anilist_id }> }`
    (`owned` = toutes les séries de la table, notées ou non).
  - `node scripts/reco-validate.mjs <fichier.json>` → code 0 et `OK` si valide ; code 1 et une ligne par erreur (`recommendations[3].fr.volumes: attendu un entier ≥ 1`) sinon.

- [ ] **Step 1: Écrire `scripts/reco-context.mjs`**

ESM, `@supabase/supabase-js` (déjà en dépendance), client avec `db: { schema: "mangateque" }`. Une requête `series` avec `volumes(is_read)` ; `owned_volumes` = nombre de lignes `volumes`, `read_volumes` = celles `is_read`. Erreur Supabase → message sur stderr et code 1.

- [ ] **Step 2: Vérifier le contexte**

Run: `node --env-file=.env scripts/reco-context.mjs | node -e 'const c=JSON.parse(require("fs").readFileSync(0));console.log(c.rated.length, c.owned.length)'`
Expected: `19 35` (état de la base au 27/10/2026 ; des nombres cohérents avec la bibliothèque si elle a bougé).

- [ ] **Step 3: Écrire `scripts/reco-validate.mjs`**

Validation manuelle (pas de dépendance), qui collecte toutes les erreurs avant de sortir. Règles, d'après le format du spec §2 :
- `generated_at` : chaîne ISO parsable ; `based_on.rated_count` / `owned_count` : entiers ≥ 0.
- `recommendations` : exactement 10 éléments ; `rank` = 1..10, uniques, dans l'ordre.
- `title`, `why` : chaînes non vides ; `pros`, `cons` : 1 à 6 chaînes non vides ; `sources` : ≥ 1 `{ label, url }` avec `url` en `https://`.
- `related_to` : `null` ou chaîne non vide.
- `fr` : `publisher` non vide, `volumes` entier ≥ 1, `status` ∈ `ongoing|completed`, `source_url` en `https://`.
- `anilist` : `id` entier, `url` commençant par `https://anilist.co/manga/`, `title_romaji` non vide, `cover_url` en `https://`, `volumes` entier ≥ 1 ou `null`, `status` ∈ `ongoing|completed`, `average_score` entier ou `null`, `genres` tableau de chaînes, `start_year` entier, `authors` ≥ 1 chaîne.
- Pas deux recos avec le même `anilist.id`.
- Le nom du fichier doit être `YYYY-MM-DD.json`.

- [ ] **Step 4: Vérifier le validateur sur un bon et un mauvais fichier**

Écrire dans le scratchpad un fichier valide de 10 recos (données fictives) et une copie cassée : 9 recos, `fr` supprimé sur l'une, `anilist.status` = `"RELEASING"`.
Run: `node scripts/reco-validate.mjs <valide>/2026-01-01.json; echo $?` puis la même chose sur le fichier cassé.
Expected: `OK` / `0` ; puis au moins trois lignes d'erreur (nombre de recos, `fr` manquant, statut) et `1`.

- [ ] **Step 5: Commit**

```bash
git add scripts/reco-context.mjs scripts/reco-validate.mjs
git commit -m "feat(recommandations): scripts de contexte et de validation pour /reco"
```

---

### Task 2: Skill `/reco` et première génération

**Files:**
- Create: `.claude/skills/reco/SKILL.md`
- Create: `data/recommandations/<date du jour>.json` (produit en lançant le skill)

**Interfaces:**
- Consumes: les deux scripts de la Task 1.
- Produces: fichiers `data/recommandations/YYYY-MM-DD.json` conformes au spec §2 et validés par `reco-validate.mjs`.

- [ ] **Step 1: Écrire `.claude/skills/reco/SKILL.md`**

Frontmatter : `name: reco`, `description:` « Génère 10 recommandations de séries manga à partir des notes de la mangathèque et les écrit dans data/recommandations/ ». Corps en français, qui transcrit fidèlement le spec §1 étapes 1 à 7, avec en plus :
- la commande exacte de l'étape 1 (`node --env-file=.env scripts/reco-context.mjs`) ;
- la règle suites/spin-offs du spec (note 4–5 → candidat ; 1–2 → exclu sauf avis nettement meilleurs, à dire dans `why` ; non notée → neutre), et `related_to` à renseigner ;
- l'exclusion des séries possédées par `anilist_id` **et** par titre ;
- la requête GraphQL AniList à utiliser (`https://graphql.anilist.co`, `Page(perPage: 10) { media(search: $s, type: MANGA, countryOfOrigin: JP) { id siteUrl title { romaji english native } coverImage { large } volumes status averageScore genres startDate { year } staff(perPage: 4) { edges { role node { name { full } } } } } }`), le contrôle auteur + année avant d'accepter un résultat, et la conversion `RELEASING`/`HIATUS` → `ongoing`, sinon `completed` ; `authors` = staff dont le rôle contient « Story » ou « Art » ;
- les recherches web d'avis en sources FR d'abord, sans rien inventer : chaque point doit venir d'une page réellement lue, référencée dans `sources` ;
- remplacement d'une série écartée (pas d'AniList vérifiable, pas d'édition FR confirmée) jusqu'à avoir 10 recos ;
- écriture dans `data/recommandations/<date du jour>.json` (écrase si existe), puis `node scripts/reco-validate.mjs <fichier>` ; corriger et revalider tant que ce n'est pas `OK` ;
- fin : afficher la liste des 10 titres, sans commiter.

- [ ] **Step 2: Lancer le skill**

Dans une session Claude Code à la racine du dépôt, exécuter `/reco` (un sous-agent peut suivre le SKILL.md à la lettre). Durée attendue : plusieurs minutes.
Expected: `data/recommandations/<date>.json` existe et `node scripts/reco-validate.mjs data/recommandations/<date>.json` affiche `OK`.

- [ ] **Step 3: Contrôle qualité à l'œil**

Ouvrir trois `anilist.url` du fichier : ce sont bien les œuvres recommandées (auteur cohérent). Aucune reco n'est un titre de `owned`. Si Jujutsu Kaisen/Demon Slayer/Mashle (2/5) ont des spin-offs dans la liste, le `why` justifie l'exception.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/reco/SKILL.md data/recommandations/
git commit -m "feat(recommandations): skill /reco et premiere generation"
```

---

### Task 3: Types et lecture des fichiers

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/recommendations.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: le format des fichiers (Task 2).
- Produces (dans `src/lib/types.ts`) :
  - `type RecoStatus = "ongoing" | "completed"`
  - `type Recommendation = { rank: number; title: string; why: string; pros: string[]; cons: string[]; sources: { label: string; url: string }[]; related_to: string | null; fr: { publisher: string; volumes: number; status: RecoStatus; source_url: string }; anilist: { id: number; url: string; title_romaji: string; cover_url: string; volumes: number | null; status: RecoStatus; average_score: number | null; genres: string[]; start_year: number; authors: string[] } }`
  - `type RecommendationFile = { generated_at: string; based_on: { rated_count: number; owned_count: number }; recommendations: Recommendation[] }`
- Produces (dans `src/lib/recommendations.ts`, `import "server-only"`) :
  - `listRecommendationDates(): Promise<string[]>` — dates `YYYY-MM-DD` des fichiers de `path.join(process.cwd(), "data/recommandations")`, plus récente d'abord ; `[]` si le dossier n'existe pas.
  - `readRecommendations(date: string): Promise<RecommendationFile | null>` — `null` si `date` ne matche pas `/^\d{4}-\d{2}-\d{2}$/` ou ne fait pas partie de `listRecommendationDates()`.
  - `normalizeTitle(title: string): string` — minuscules, accents retirés (`normalize("NFD")` + suppression des diacritiques), tout ce qui n'est pas lettre/chiffre retiré.
  - `ownedMatcher(owned: { anilist_id: number | null; title: string }[]): (reco: Recommendation) => boolean` — vrai si un `anilist_id` égal à `reco.anilist.id`, ou si `normalizeTitle` d'un titre possédé égale celui de `reco.title` ou `reco.anilist.title_romaji`.

- [ ] **Step 1: Ajouter les types** à `src/lib/types.ts`.

- [ ] **Step 2: Écrire `src/lib/recommendations.ts`** avec les quatre fonctions ci-dessus (`fs/promises`, `path`).

- [ ] **Step 3: Inclure les JSON dans la sortie** — dans `next.config.ts`, ajouter `outputFileTracingIncludes: { "/recommandations": ["./data/recommandations/**/*.json"] }` (forme vérifiée dans la doc Next locale).

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (Le module importe `server-only` et ne s'exécute pas hors de Next : son comportement — dates invalides, dossier absent, correspondance par titre — est vérifié dans la page, Task 4 step 5.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/recommendations.ts next.config.ts
git commit -m "feat(recommandations): types et lecture des fichiers de recommandations"
```

---

### Task 4: Page `/recommandations` et navigation

**Files:**
- Create: `src/app/recommandations/page.tsx`
- Create: `src/components/RecommendationCard.tsx`
- Create: `src/components/RecommendationDatePicker.tsx`
- Modify: `src/components/Topbar.tsx` (`NAV_LINKS`)

**Interfaces:**
- Consumes: `listRecommendationDates`, `readRecommendations`, `ownedMatcher` (Task 3) ; `supabase()` de `src/lib/supabase.ts` ; `Cover` de `src/components/Cover.tsx`.
- Produces: route `/recommandations`, `?date=YYYY-MM-DD`.

- [ ] **Step 1: Page** — `export const dynamic = "force-dynamic"`. `searchParams: Promise<{ date?: string }>`. Liste les dates ; date affichée = `date` demandée si `readRecommendations` la trouve, sinon la plus récente. Lit `series` (`anilist_id, title`) pour construire `ownedMatcher`. En-tête dans le style de `src/app/lectures/page.tsx` : titre « Recommandations », sous-titre mono « GÉNÉRÉES LE 27 OCT. 2026 · BASÉES SUR 19 SÉRIES NOTÉES » (date en `fr-FR`), sélecteur à droite. État vide si aucune date : « Aucune recommandation pour l'instant. Lance /reco dans Claude Code pour en générer. »

- [ ] **Step 2: `RecommendationDatePicker`** — composant client (`"use client"`), `<select>` des dates (libellés `fr-FR` longs, plus récente d'abord), `router.push("/recommandations?date=…")` au changement. Caché s'il n'y a qu'une date.

- [ ] **Step 3: `RecommendationCard`** — props `{ reco: Recommendation; owned: boolean }`. Contenu et ordre du spec §3 :
  - couverture via `Cover` (`url={reco.anilist.cover_url}`, `seedKey={String(reco.anilist.id)}`) ;
  - rang « #1 » ; titre ; badge « Dans ma bibliothèque » si `owned` (style des badges existants, cf. `DigitalBadge.tsx`) ; « Suite / spin-off de {related_to} » si présent ;
  - ligne d'infos : `{fr.publisher} · VF {fr.volumes} tomes ({En cours|Terminé}) · VO {anilist.volumes ?? "?"} tomes ({En cours|Terminé}) · {authors.join(", ")} · {start_year} · AniList {average_score ?? "–"}` avec lien sur `anilist.url` ;
  - genres en chips ; `why` ; deux colonnes « Points forts » / « Points faibles » (`md:grid-cols-2`, empilées en dessous) ; sources en petit, liens `target="_blank" rel="noopener noreferrer"`.

- [ ] **Step 4: Navigation** — ajouter `{ href: "/recommandations", label: "Recos" }` en dernier dans `NAV_LINKS`. Vérifier que la rangée mobile (5 liens en `flex-1`) tient à 375 px de large.

- [ ] **Step 5: Vérifier en dev**

Run: `npx tsc --noEmit` puis `npm run dev`.
Expected, dans le navigateur :
- `/recommandations` : les 10 cartes de la Task 2, dans l'ordre, couvertures chargées.
- Ajouter temporairement via `/add` une série de la liste avec son `anilist_id` → badge visible au rechargement ; la supprimer. Recommencer en saisie libre (`anilist_id` vide), titre tapé en minuscules sans accents → badge toujours visible ; supprimer.
- `/recommandations?date=../../.env` et `?date=2099-01-01` → génération la plus récente affichée, aucune erreur.
- Renommer temporairement `data/recommandations` → état vide affiché, pas de 500 ; remettre.
- Largeur mobile : forts/faibles empilés, barre de nav lisible.

- [ ] **Step 6: Vérifier le build de prod**

Run: `npm run build && npm run start`, ouvrir `/recommandations`.
Expected: build sans erreur, page identique à celle du dev. Contrôler que `.next/server/app/recommandations/page.js.nft.json` liste bien les fichiers `data/recommandations/*.json`.

- [ ] **Step 7: Commit**

```bash
git add src/app/recommandations src/components/RecommendationCard.tsx src/components/RecommendationDatePicker.tsx src/components/Topbar.tsx
git commit -m "feat(recommandations): page /recommandations avec historique et badge bibliotheque"
```
