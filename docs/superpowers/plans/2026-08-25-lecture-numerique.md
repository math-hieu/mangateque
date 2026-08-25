# Lecture numérique — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de suivre des livres numériques (couverture, titre, plateforme, tomes) dans une vue `/numerique` séparée de la bibliothèque physique, comptés uniquement dans les statistiques de lecture.

**Architecture:** Stockage partagé avec une colonne discriminante `format` (`physical` | `digital`) sur `mangateque.series`. Les vues et les requêtes filtrent sur ce format ; les composants existants sont paramétrés plutôt que dupliqués. Aucune table nouvelle.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Supabase (PostgREST, schéma `mangateque`), Tailwind v4, Recharts, sonner.

**Spec:** `docs/superpowers/specs/2026-08-25-lecture-numerique-design.md`

## Global Constraints

- **Pas de tests automatisés.** Décision explicite de l'utilisateur. Chaque tâche se vérifie par `npx tsc --noEmit` (typecheck) et, quand c'est pertinent, une vérification manuelle dans le navigateur (`npm run dev`). Ne pas installer de runner de test.
- **Next.js 16 :** `params` et `searchParams` d'une page sont des `Promise` et doivent être `await`és. Vérifié dans `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`.
- **Langue :** toute chaîne visible par l'utilisateur est en français.
- **Format des valeurs :** `format` vaut exactement `"physical"` ou `"digital"`. Ne jamais utiliser `"numerique"` ou `"numérique"` comme valeur stockée — uniquement comme libellé affiché.
- **Commits :** un commit par tâche, en conventional commits français, scope `numerique` (ex. `feat(numerique): ...`).
- **Style :** suivre les classes utilitaires maison déjà présentes (`mt-mono`, `mt-label`, `mt-input`, `mt-cta`, `mt-ghost`, `mt-tabular`) et les variables CSS (`var(--border)`, `var(--amber)`, …). Ne pas introduire de nouvelle convention de style.
- **Nullabilité :** après la tâche 2, `Series.publisher` et `Volume.price` sont nullables. Ne jamais appeler une méthode directement dessus (`s.publisher.toUpperCase()` casse le typecheck) — passer par `issuerLabel` ou un garde explicite.

---

### Task 1: Migration Supabase

**Files:**
- Create: `supabase/migrations/20260825000000_digital_format.sql`

**Interfaces:**
- Consumes: rien.
- Produits: colonnes `mangateque.series.format` (`text not null default 'physical'`), `mangateque.series.platform` (`text null`) ; `mangateque.series.publisher` et `mangateque.volumes.price` deviennent nullables ; contrainte `series_format_fields`.

- [ ] **Step 1: Écrire le fichier de migration**

```sql
-- Rattrape la colonne read_at appliquée à la main lors de la page /stats :
-- sans elle, le dossier migrations/ n'est pas rejouable sur une base neuve.
alter table mangateque.volumes
  add column if not exists read_at timestamptz;

alter table mangateque.series
  add column format text not null default 'physical'
    check (format in ('physical', 'digital')),
  add column platform text;

alter table mangateque.series alter column publisher drop not null;
alter table mangateque.volumes  alter column price     drop not null;

-- Un numérique a toujours une plateforme et jamais d'éditeur, et réciproquement.
-- C'est cette contrainte qui rend l'étanchéité fiable malgré le stockage partagé.
alter table mangateque.series add constraint series_format_fields check (
  (format = 'physical' and publisher is not null) or
  (format = 'digital'  and platform  is not null)
);

create index series_format_idx on mangateque.series(format);
```

- [ ] **Step 2: Appliquer la migration**

Ce projet n'a pas de CLI Supabase configurée : les migrations précédentes ont été appliquées à la main. Coller le contenu du fichier dans le SQL Editor du projet Supabase et l'exécuter.

**Cette étape demande une action de l'utilisateur.** L'agent qui exécute le plan doit s'arrêter ici et demander la confirmation que la migration est passée avant de continuer.

- [ ] **Step 3: Vérifier en base**

Exécuter dans le SQL Editor :

```sql
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'mangateque'
  and table_name = 'series'
  and column_name in ('format', 'platform', 'publisher');
```

Attendu : trois lignes — `format` (`NO`, `'physical'::text`), `platform` (`YES`), `publisher` (`YES`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260825000000_digital_format.sql
git commit -m "feat(numerique): migration format physique/numerique sur series"
```

---

### Task 2: Types et helper `issuerLabel`

Cette tâche rend le code compilable avec les colonnes nullables, sans changer aucun comportement : toutes les séries existantes sont `physical`, donc tous les affichages restent identiques.

**Files:**
- Create: `src/lib/series.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/components/SeriesCard.tsx`
- Modify: `src/components/SeriesHero.tsx`
- Modify: `src/components/SeriesActions.tsx`
- Modify: `src/components/CurrentlyReadingCarousel.tsx`
- Modify: `src/components/VolumesTable.tsx`
- Modify: `src/app/series/[id]/page.tsx`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type SeriesFormat = "physical" | "digital"` (dans `src/lib/types.ts`)
  - `Series.format: SeriesFormat`, `Series.platform: string | null`, `Series.publisher: string | null`
  - `Volume.price: number | null`
  - `ReadingItem.series.format: SeriesFormat`, `ReadingItem.series.platform: string | null`, `ReadingItem.series.publisher: string | null`
  - `issuerLabel(s: { publisher: string | null; platform: string | null }): string` (dans `src/lib/series.ts`)

- [ ] **Step 1: Créer le helper**

`src/lib/series.ts` :

```ts
/**
 * Libellé de l'émetteur d'une série : l'éditeur pour un livre physique, la
 * plateforme pour un numérique. La contrainte `series_format_fields` en base
 * garantit qu'exactement l'un des deux est renseigné, donc le repli sur "" ne
 * se produit jamais en pratique — il n'est là que pour satisfaire le typage.
 */
export function issuerLabel(s: { publisher: string | null; platform: string | null }): string {
  return s.publisher ?? s.platform ?? "";
}
```

- [ ] **Step 2: Mettre à jour les types**

Dans `src/lib/types.ts`, ajouter en tête (à côté de `SeriesStatus`) :

```ts
export type SeriesFormat = "physical" | "digital";
```

Modifier `Series` — `publisher` devient nullable, deux champs s'ajoutent :

```ts
export type Series = {
  id: string;
  anilist_id: number | null;
  title: string;
  cover_url: string | null;
  publisher: string | null;
  platform: string | null;
  format: SeriesFormat;
  edition_variant: string | null;
  total_volumes: number | null;
  status: SeriesStatus;
  created_at: string;
};
```

Modifier `Volume` — `price` devient nullable :

```ts
export type Volume = {
  id: string;
  series_id: string;
  number: number;
  price: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};
```

Modifier le bloc `series` de `ReadingItem` :

```ts
export type ReadingItem = {
  series: {
    id: string;
    title: string;
    publisher: string | null;
    platform: string | null;
    format: SeriesFormat;
    edition_variant: string | null;
    cover_url: string | null;
  };
  owned_count: number;
  read_count: number;
  next_volume: {
    id: string;
    number: number;
  };
};
```

- [ ] **Step 3: Constater les erreurs de typage**

Run: `npx tsc --noEmit`
Expected: FAIL. Les erreurs attendues portent sur `publisher` possiblement `null` (passé à `Cover`, à `.toUpperCase()`, à un `<input value>`) et sur `price` possiblement `null` (passé à `Number()`, à `.toFixed()`). Noter la liste : elle sert de checklist pour l'étape suivante.

- [ ] **Step 4: Corriger les sites d'affichage**

`src/components/SeriesCard.tsx` — importer le helper et remplacer les deux usages de `s.publisher` :

```tsx
import { issuerLabel } from "@/lib/series";
```

```tsx
<Cover url={s.cover_url} seedKey={s.id} title={s.title} publisher={issuerLabel(s)} />
```

```tsx
<span className="mt-mono text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
  {issuerLabel(s).toUpperCase()}
  {s.edition_variant ? ` · ${s.edition_variant.toUpperCase()}` : ""}
</span>
```

`src/components/SeriesHero.tsx` — importer `issuerLabel` et remplacer l'usage dans `Cover` :

```tsx
<Cover url={series.cover_url} seedKey={series.id} title={series.title} publisher={issuerLabel(series)} />
```

et la valeur de la ligne « Éditeur » :

```tsx
<span className="text-cream truncate">{issuerLabel(series)}</span>
```

`src/components/SeriesActions.tsx` — l'état du champ éditeur doit tolérer `null` :

```tsx
const [publisher, setPublisher] = useState(series.publisher ?? "");
```

et le `Cover` de la popin :

```tsx
<Cover url={coverUrl} seedKey={series.id} title={series.title} publisher={issuerLabel(series)} />
```

(ajouter `import { issuerLabel } from "@/lib/series";`)

`src/components/CurrentlyReadingCarousel.tsx` — deux usages, dans le composant de carte (la variable locale s'appelle `series`). Ajouter `import { issuerLabel } from "@/lib/series";`, puis la prop de `Cover` :

```tsx
          <Cover
            url={series.cover_url}
            seedKey={series.id}
            title={series.title}
            publisher={issuerLabel(series)}
          />
```

et la ligne mono sous le titre :

```tsx
        <span className="mt-mono text-[10px] text-muted" style={{ letterSpacing: "0.06em" }}>
          {issuerLabel(series).toUpperCase()}
          {series.edition_variant ? ` · ${series.edition_variant.toUpperCase()}` : ""}
        </span>
```

`src/components/VolumesTable.tsx` — le prix nullable. Dans `EditablePrice`, la prop reste `price: number` (l'appelant garantit la valeur) ; c'est le site d'appel qui change :

```tsx
<EditablePrice volumeId={v.id} price={Number(v.price ?? 0)} />
```

`src/app/series/[id]/page.tsx` — le total et le fil d'Ariane :

```tsx
const totalSpent = volumes.reduce((s, v) => s + Number(v.price ?? 0), 0);
```

```tsx
<span>{(series.publisher ?? series.platform ?? "").toUpperCase()}</span>
```

(le fil d'Ariane sera repris proprement en tâche 6 ; ici on se contente de le rendre compilable)

- [ ] **Step 5: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, aucune sortie.

- [ ] **Step 6: Vérifier que rien n'a bougé visuellement**

Run: `npm run dev`
Ouvrir `/`, puis une série. Attendu : grille, `StatsRow`, carrousel et page série strictement identiques à avant — les séries existantes sont toutes `physical` et `publisher` est toujours renseigné.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/series.ts src/components src/app/series
git commit -m "feat(numerique): types format/platform et helper issuerLabel"
```

---

### Task 3: Server actions

Toujours aucun changement de comportement visible : les valeurs par défaut `"physical"` font que tous les appels existants restent corrects.

**Files:**
- Modify: `src/actions/series.ts`
- Modify: `src/actions/volumes.ts`
- Modify: `src/actions/reading.ts`
- Modify: `src/actions/stats.ts`
- Modify: `src/actions/isbn.ts`
- Modify: `src/components/ScanResult.tsx`
- Modify: `src/lib/reading.ts`

**Interfaces:**
- Consumes: `SeriesFormat`, `issuerLabel` (tâche 2).
- Produces:
  - `listSeriesForLibrary(format?: SeriesFormat): Promise<SeriesCardData[]>` — défaut `"physical"`
  - `listInProgressSeries(format?: SeriesFormat): Promise<ReadingItem[]>` — défaut `"physical"`
  - `listPlatforms(): Promise<string[]>`
  - `CreateSeriesInput` porte `format: SeriesFormat` et `platform: string | null`
  - `addVolume(seriesId: string, number: number, price: number | null): Promise<void>`
  - `ReadVolumeEntry` / `ReadingGroup` : `series_publisher` remplacé par `series_issuer: string`, plus `format: SeriesFormat`
  - `ReadVolume` (stats) : `series_publisher` remplacé par `series_issuer: string`, plus `format: SeriesFormat`

- [ ] **Step 1: Paramétrer les listes par format**

Dans `src/actions/series.ts`, importer `SeriesFormat` depuis `@/lib/types`, puis :

```ts
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
```

Et pour `listInProgressSeries`, changer la signature et la requête (le reste du corps est inchangé, sauf le bloc `items.push` ci-dessous) :

```ts
export async function listInProgressSeries(
  format: SeriesFormat = "physical",
): Promise<ReadingItem[]> {
  const { data, error } = await supabase()
    .from("series")
    .select("id, title, publisher, platform, format, edition_variant, cover_url, volumes(id, number, is_read, read_at, created_at)")
    .eq("format", format);
  if (error) throw new Error(error.message);
```

Dans le `items.push` de cette même fonction, compléter le bloc `series` :

```ts
      series: {
        id: row.id,
        title: row.title,
        publisher: row.publisher,
        platform: row.platform,
        format: row.format,
        edition_variant: row.edition_variant,
        cover_url: row.cover_url,
      },
```

- [ ] **Step 2: Étanchéifier les statistiques de collection**

Toujours dans `src/actions/series.ts`, `getLibraryStats`. La requête `volumes` doit être jointe à `series` pour ne compter que le physique :

```ts
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
```

`series!inner(format)` force une jointure interne : sans elle, `.eq("series.format", …)` filtrerait la relation imbriquée sans écarter la ligne parente.

- [ ] **Step 3: Ouvrir la création au numérique**

Toujours dans `src/actions/series.ts`, `CreateSeriesInput` :

```ts
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
```

Dans `createSeries`, ajouter la revalidation de la nouvelle route à côté de celle de `/` :

```ts
  revalidatePath("/");
  revalidatePath("/numerique");
```

Faire de même dans `updateSeries` et `deleteSeries`. Dans `deleteSeries`, la redirection reste `redirect("/")` : la tâche 6 la rendra dépendante du format.

Ajouter enfin l'action qui alimente la `datalist` du formulaire :

```ts
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
```

- [ ] **Step 4: Rendre le prix optionnel à l'ajout d'un tome**

Dans `src/actions/volumes.ts`, `addVolume` accepte `null` et revalide `/numerique` :

```ts
export async function addVolume(seriesId: string, number: number, price: number | null) {
  const { error } = await supabase().from("volumes").insert({
    series_id: seriesId,
    number,
    price,
    is_read: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/series/${seriesId}`);
  revalidatePath("/");
  revalidatePath("/numerique");
}
```

Ajouter `revalidatePath("/numerique");` après le `revalidatePath("/")` existant de `toggleVolumeRead` et de `deleteVolume`. `updateVolumePrice` n'est appelée que depuis la colonne prix, qui n'existe pas en numérique : la laisser telle quelle.

- [ ] **Step 5: Faire transiter le format dans l'historique de lecture**

Dans `src/lib/reading.ts`, remplacer `series_publisher` par `series_issuer` et ajouter `format` aux deux types :

```ts
import type { SeriesFormat } from "./types";

export type ReadVolumeEntry = {
  series_id: string;
  series_title: string;
  series_issuer: string;
  format: SeriesFormat;
  edition_variant: string | null;
  cover_url: string | null;
  number: number;
  read_at: string;
};

export type ReadingGroup = {
  series_id: string;
  series_title: string;
  series_issuer: string;
  format: SeriesFormat;
  edition_variant: string | null;
  cover_url: string | null;
  from_volume: number;
  to_volume: number;
  count: number;
  first_read_at: string;
  last_read_at: string;
};
```

Dans `groupReadingHistory`, le `groups.push` recopie les deux champs renommés — la logique de regroupement ne change pas, un groupe est homogène en format puisqu'il est homogène en série :

```ts
    groups.push({
      series_id: entry.series_id,
      series_title: entry.series_title,
      series_issuer: entry.series_issuer,
      format: entry.format,
      edition_variant: entry.edition_variant,
      cover_url: entry.cover_url,
      from_volume: entry.number,
      to_volume: entry.number,
      count: 1,
      first_read_at: entry.read_at,
      last_read_at: entry.read_at,
    });
```

Dans `src/actions/reading.ts`, élargir le `select` et calculer le libellé côté action :

```ts
import { supabase } from "@/lib/supabase";
import { issuerLabel } from "@/lib/series";
import { groupReadingHistory, type ReadingGroup } from "@/lib/reading";

export async function listReadingHistory(): Promise<ReadingGroup[]> {
  const { data, error } = await supabase()
    .from("volumes")
    .select("series_id, number, read_at, series(title, publisher, platform, format, edition_variant, cover_url)")
    .not("read_at", "is", null)
    // Un marquage en masse pose le même timestamp sur tous les tomes : on
    // départage par série avant le numéro, sinon deux séries marquées lues
    // ensemble s'entrelacent et cassent les groupes.
    .order("read_at", { ascending: true })
    .order("series_id", { ascending: true })
    .order("number", { ascending: true });
  if (error) throw new Error(error.message);

  return groupReadingHistory(
    (data ?? []).map((row: any) => ({
      series_id: row.series_id,
      series_title: row.series?.title ?? "",
      series_issuer: issuerLabel({
        publisher: row.series?.publisher ?? null,
        platform: row.series?.platform ?? null,
      }),
      format: (row.series?.format ?? "physical") as SeriesFormat,
      edition_variant: row.series?.edition_variant ?? null,
      cover_url: row.series?.cover_url ?? null,
      number: row.number,
      read_at: row.read_at,
    })),
  );
}
```

Ajouter `import type { SeriesFormat } from "@/lib/types";`. Cette requête ne filtre pas : `/lectures` montre les deux mondes, c'est voulu.

- [ ] **Step 6: Compter le numérique dans les lectures, pas dans les achats**

Dans `src/actions/stats.ts`, `getReadingStats` — une seule requête, un aiguillage en JS :

```ts
  const { data: volumes, error } = await supabase()
    .from("volumes")
    .select("created_at, price, read_at, series!inner(format)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
```

et la boucle :

```ts
  for (const v of volumes ?? []) {
    // Achats et dépenses restent une affaire de bibliothèque physique.
    if ((v as any).series?.format === "physical") {
      const purchaseKey = toMonthKey(v.created_at);
      purchaseCounts.set(purchaseKey, (purchaseCounts.get(purchaseKey) ?? 0) + 1);
      spendByMonth.set(purchaseKey, (spendByMonth.get(purchaseKey) ?? 0) + Number(v.price ?? 0));
    }

    // Les lectures comptent quel que soit le support.
    if (v.read_at) {
      const readKey = toMonthKey(v.read_at);
      readCounts.set(readKey, (readCounts.get(readKey) ?? 0) + 1);
      const weekKey = toWeekKey(v.read_at);
      readWeekCounts.set(weekKey, (readWeekCounts.get(weekKey) ?? 0) + 1);
    }
  }
```

Puis `ReadVolume` et `getVolumesReadInPeriod`, qui alimentent la popin :

```ts
export type ReadVolume = {
  id: string;
  series_id: string;
  series_title: string;
  series_issuer: string;
  format: SeriesFormat;
  cover_url: string | null;
  number: number;
  read_at: string;
};
```

```ts
  const { data, error } = await supabase()
    .from("volumes")
    .select("id, series_id, number, read_at, series(title, publisher, platform, format, cover_url)")
    .gte("read_at", start.toISOString())
    .lt("read_at", end.toISOString())
    .order("read_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    series_id: row.series_id,
    series_title: row.series?.title ?? "",
    series_issuer: issuerLabel({
      publisher: row.series?.publisher ?? null,
      platform: row.series?.platform ?? null,
    }),
    format: (row.series?.format ?? "physical") as SeriesFormat,
    cover_url: row.series?.cover_url ?? null,
    number: row.number,
    read_at: row.read_at,
  }));
```

Ajouter en tête du fichier : `import { issuerLabel } from "@/lib/series";` et `import type { SeriesFormat } from "@/lib/types";`.

- [ ] **Step 7: Étanchéifier le flux de scan ISBN**

Voir spec §3.3. Un scan de code-barres porte sur un livre papier : ce flux est
exclusivement physique.

Dans `src/actions/isbn.ts`, la recherche de série existante par titre doit ignorer le
numérique — sans ce filtre, scanner le tome d'une série qu'on suit aussi en numérique
rattacherait un tome payant à la série numérique :

```ts
  const { data: allSeries } = await supabase()
    .from("series")
    .select("id, title")
    .eq("format", "physical");
```

Dans `src/components/ScanResult.tsx`, l'objet passé à `createSeriesAndAddVolume` doit
satisfaire le nouveau `CreateSeriesInput`. Ajouter les deux champs à l'objet littéral
existant (vers la ligne 45, à côté de `publisher: publisher.trim()`) :

```tsx
              format: "physical",
              platform: null,
```

Les deux autres accès base de `isbn.ts` n'ont pas besoin de changer : la lecture des
tomes est déjà bornée par `series_id`, et l'insertion de tome porte un prix saisi par
l'utilisateur.

- [ ] **Step 8: Réparer les appelants**

`npx tsc --noEmit` signale les consommateurs des champs renommés :

- `src/components/ReadingHistoryList.tsx` : `group.series_publisher` → `group.series_issuer` (deux usages : la prop `publisher` de `Cover` et la ligne mono en majuscules).
- `src/components/ReadVolumesDialog.tsx` : `v.series_publisher` → `v.series_issuer` dans la prop `publisher` de `Cover`.
- `src/components/SeriesForm.tsx` : l'appel à `createSeries` doit désormais fournir `format` et `platform`. Passer provisoirement `format: "physical"` et `platform: null` — la tâche 4 branche le vrai sélecteur.

- [ ] **Step 9: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, aucune sortie.

- [ ] **Step 10: Vérifier que les chiffres n'ont pas bougé**

Run: `npm run dev`
Ouvrir `/`, `/lectures` et `/stats`. Attendu : les trois pages s'affichent sans erreur, avec les mêmes valeurs qu'avant cette tâche — aucune série numérique n'existe encore, donc les filtres ajoutés ne peuvent rien écarter. La preuve d'étanchéité réelle est faite en tâche 8, une fois qu'il y a du numérique en base.

- [ ] **Step 11: Commit**

```bash
git add src/actions src/lib src/components
git commit -m "feat(numerique): filtrage par format dans les server actions"
```

---

### Task 4: Créer une série numérique depuis `/add`

**Files:**
- Modify: `src/components/SeriesForm.tsx`
- Modify: `src/app/add/page.tsx`
- Modify: `src/components/AniListSearch.tsx`

**Interfaces:**
- Consumes: `CreateSeriesInput`, `listPlatforms` (tâche 3).
- Produces: `SeriesForm` accepte une prop `defaultFormat?: SeriesFormat` et une prop `platforms: string[]` ; `AniListSearch` accepte et relaie les mêmes props.

- [ ] **Step 1: Ajouter le sélecteur et le champ plateforme au formulaire**

Dans `src/components/SeriesForm.tsx`, ajouter les imports et l'état :

```tsx
import type { SeriesFormat } from "@/lib/types";
```

```tsx
export function SeriesForm({
  initial,
  defaultFormat = "physical",
  platforms,
}: {
  initial?: SeriesFormInitial;
  defaultFormat?: SeriesFormat;
  platforms: string[];
}) {
  const [format, setFormat] = useState<SeriesFormat>(defaultFormat);
  const [platform, setPlatform] = useState("");
```

`SeriesFormInitial` est le type déjà exporté en tête du fichier : il ne change pas.

Le sélecteur, inséré en tête du `<form>`, avant le champ Titre :

```tsx
      <div>
        <label className="mt-label mb-1.5 block">Format</label>
        <div className="inline-flex overflow-hidden rounded-md border border-[var(--border-2)]">
          {(["physical", "digital"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className="px-3.5 py-1.5 text-xs"
              style={{
                background: format === f ? "var(--amber)" : "transparent",
                color: format === f ? "#1a1208" : "var(--cream)",
              }}
            >
              {f === "physical" ? "Physique" : "Numérique"}
            </button>
          ))}
        </div>
      </div>
```

Remplacer le bloc à deux colonnes « Éditeur / Variante » par un rendu conditionnel :

```tsx
      {format === "physical" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mt-label mb-1.5 block">Éditeur</label>
            <input className="mt-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Ki-oon, Glénat, ..." />
          </div>
          <div>
            <label className="mt-label mb-1.5 block">Variante (optionnel)</label>
            <input className="mt-input" value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="Édition originale, Perfect..." />
          </div>
        </div>
      ) : (
        <div>
          <label className="mt-label mb-1.5 block">Plateforme</label>
          <input
            className="mt-input"
            list="platforms"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="Mangas.io, Izneo, Webtoon..."
          />
          <datalist id="platforms">
            {platforms.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      )}
```

Noter le retrait de l'attribut `required` sur l'éditeur : il empêcherait la soumission d'un formulaire numérique où le champ n'est pas rendu. La validation passe entièrement par `submit`.

- [ ] **Step 2: Adapter la validation et la soumission**

Dans la fonction `submit` du même fichier :

```tsx
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    if (format === "physical" && !publisher.trim()) {
      toast.error("L'éditeur est obligatoire pour un livre physique");
      return;
    }
    if (format === "digital" && !platform.trim()) {
      toast.error("La plateforme est obligatoire pour un livre numérique");
      return;
    }
    start(async () => {
      try {
        await createSeries({
          anilist_id: initial?.anilist_id ?? null,
          title: title.trim(),
          cover_url: coverUrl.trim() || null,
          format,
          publisher: format === "physical" ? publisher.trim() : null,
          platform: format === "digital" ? platform.trim() : null,
          edition_variant: format === "physical" ? variant.trim() || null : null,
          total_volumes: totalVolumes ? Number(totalVolumes) : null,
          status,
        });
      } catch (e: any) {
        toast.error(e.message ?? "Erreur création");
      }
    });
  }
```

Les `null` explicites sur le format non retenu sont ce qui satisfait la contrainte `series_format_fields`.

- [ ] **Step 3: Relayer les props depuis `AniListSearch`**

Dans `src/components/AniListSearch.tsx`, accepter et transmettre les deux nouvelles props :

```tsx
export function AniListSearch({
  defaultFormat,
  platforms,
}: {
  defaultFormat?: SeriesFormat;
  platforms: string[];
}) {
```

et sur les deux rendus de `<SeriesForm …>` (branche `selected` et branche `manual`), ajouter `defaultFormat={defaultFormat} platforms={platforms}`. Ajouter l'import de type `SeriesFormat`.

- [ ] **Step 4: Lire `?format=digital` sur la page**

Réécrire `src/app/add/page.tsx`. `searchParams` est une `Promise` en Next 16 :

```tsx
import { AniListSearch } from "@/components/AniListSearch";
import { listPlatforms } from "@/actions/series";

export const dynamic = "force-dynamic";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const { format } = await searchParams;
  const defaultFormat = format === "digital" ? "digital" : "physical";
  const platforms = await listPlatforms();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="mt-mono text-xs text-muted" style={{ letterSpacing: "0.06em" }}>
          AJOUTER UNE SÉRIE
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Ajouter une série</h1>
      </div>
      <AniListSearch defaultFormat={defaultFormat} platforms={platforms} />
    </div>
  );
}
```

Le fil d'Ariane devient neutre : la page sert désormais les deux formats.

- [ ] **Step 5: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Créer une série numérique de bout en bout**

Run: `npm run dev`
Ouvrir `/add?format=digital`. Attendu : le sélecteur est sur « Numérique », le champ « Plateforme » est affiché, ni « Éditeur » ni « Variante » ne le sont.
Chercher un titre sur AniList, le sélectionner, saisir une plateforme, créer. Attendu : redirection vers `/series/<id>` sans erreur.
Ouvrir ensuite `/add` (sans paramètre). Attendu : sélecteur sur « Physique », champs Éditeur et Variante présents ; la création d'une série physique fonctionne comme avant.

- [ ] **Step 7: Commit**

```bash
git add src/components/SeriesForm.tsx src/components/AniListSearch.tsx src/app/add/page.tsx
git commit -m "feat(numerique): selecteur de format dans le formulaire d'ajout"
```

---

### Task 5: Vue `/numerique`

**Files:**
- Create: `src/app/numerique/page.tsx`
- Modify: `src/components/SeriesGrid.tsx`
- Modify: `src/components/SeriesCard.tsx`
- Modify: `src/components/Topbar.tsx`

**Interfaces:**
- Consumes: `listSeriesForLibrary(format)`, `listInProgressSeries(format)` (tâche 3), `issuerLabel` (tâche 2).
- Produces: `SeriesGrid` accepte `heading?: string` et `issuerFilterLabel?: string` ; route `/numerique`.

- [ ] **Step 1: Paramétrer `SeriesGrid`**

Dans `src/components/SeriesGrid.tsx`, ajouter l'import `issuerLabel` puis les deux props :

```tsx
export function SeriesGrid({
  series,
  afterFilters,
  heading = "Ma bibliothèque",
  issuerFilterLabel = "Éditeur",
}: {
  series: SeriesCardData[];
  afterFilters?: React.ReactNode;
  heading?: string;
  issuerFilterLabel?: string;
}) {
```

Renommer l'état de filtre et le construire sur le libellé d'émetteur (le nom `publisher` devient trompeur en numérique) :

```tsx
  const [issuer, setIssuer] = useState<string>("all");
```

```tsx
  const issuers = useMemo(
    () => Array.from(new Set(series.map((s) => issuerLabel(s)))).sort((a, b) => a.localeCompare(b, "fr")),
    [series]
  );
```

Dans `filtered`, remplacer la ligne de filtre éditeur :

```tsx
      if (issuer !== "all" && issuerLabel(s) !== issuer) return false;
```

Dans le JSX, le `<label>` correspondant :

```tsx
        <label className={filterBtn}>
          {issuerFilterLabel}
          <select
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            className="mt-mono bg-transparent text-cream outline-none"
          >
            <option value="all">· Tous</option>
            {issuers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
```

Et le titre de section :

```tsx
        <span>{heading}</span>
```

- [ ] **Step 2: Masquer « Dépensé » sur les cartes numériques**

Dans `src/components/SeriesCard.tsx`, envelopper les deux `<span>` de la ligne Dépensé :

```tsx
          {s.format === "physical" && (
            <>
              <span className="mt-label">Dépensé</span>
              <span className="text-right text-[11px] text-cream" style={{ fontVariantNumeric: "tabular-nums" }}>
                {s.total_spent.toFixed(2).replace(".", ",")} €
              </span>
            </>
          )}
```

- [ ] **Step 3: Créer la route**

`src/app/numerique/page.tsx` :

```tsx
import Link from "next/link";
import { listInProgressSeries, listSeriesForLibrary } from "@/actions/series";
import { SeriesGrid } from "@/components/SeriesGrid";
import { CurrentlyReadingCarousel } from "@/components/CurrentlyReadingCarousel";

export const dynamic = "force-dynamic";

export default async function NumeriquePage() {
  const [series, inProgress] = await Promise.all([
    listSeriesForLibrary("digital"),
    listInProgressSeries("digital"),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-3 px-0.5">
        <h1 className="m-0 text-[15px] font-medium tracking-tight text-cream">
          Lecture numérique
        </h1>
        <Link href="/add?format=digital" className="mt-cta whitespace-nowrap">
          ＋ Ajouter
        </Link>
      </div>
      <SeriesGrid
        series={series}
        heading="Mes lectures numériques"
        issuerFilterLabel="Plateforme"
        afterFilters={<CurrentlyReadingCarousel items={inProgress} />}
      />
    </div>
  );
}
```

Pas de `StatsRow` : aucune statistique de collection n'a de sens pour du numérique.

- [ ] **Step 4: Ajouter le lien de navigation**

Dans `src/components/Topbar.tsx` :

```tsx
const NAV_LINKS = [
  { href: "/", label: "Bibliothèque" },
  { href: "/numerique", label: "Numérique" },
  { href: "/lectures", label: "Lectures" },
  { href: "/stats", label: "Stats" },
];
```

- [ ] **Step 5: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Vérifier le rendu**

Run: `npm run dev`
Ouvrir `/numerique`. Attendu : la série créée en tâche 4 apparaît, sa carte n'affiche pas de ligne « Dépensé », le filtre s'intitule « Plateforme » et propose la plateforme saisie.
Ouvrir `/`. Attendu : la série numérique **n'y est pas**, et le filtre s'intitule toujours « Éditeur ».
Réduire la fenêtre à 375 px de large. Attendu : la rangée de navigation mobile affiche les 4 liens sans débordement horizontal. Si ça déborde, réduire `px-2` à `px-1.5` et `text-[13px]` à `text-[12px]` dans la variante `row` de `NavLinks`.

- [ ] **Step 7: Commit**

```bash
git add src/app/numerique src/components/SeriesGrid.tsx src/components/SeriesCard.tsx src/components/Topbar.tsx
git commit -m "feat(numerique): vue /numerique et lien de navigation"
```

---

### Task 6: Page série adaptée au numérique

**Files:**
- Modify: `src/app/series/[id]/page.tsx`
- Modify: `src/components/SeriesHero.tsx`
- Modify: `src/components/VolumesTable.tsx`
- Modify: `src/components/QuickAddVolume.tsx`
- Modify: `src/components/SeriesActions.tsx`
- Modify: `src/actions/series.ts`

**Interfaces:**
- Consumes: `Series.format`, `issuerLabel` (tâche 2).
- Produces: `VolumesTable` et `QuickAddVolume` acceptent `showPrice: boolean`.

- [ ] **Step 1: Adapter le fil d'Ariane et le passage des props**

Dans `src/app/series/[id]/page.tsx` :

```tsx
  const isDigital = series.format === "digital";
```

Fil d'Ariane :

```tsx
      <div className="mt-mono mb-4 truncate text-[10px] text-muted sm:text-[11px]" style={{ letterSpacing: "0.06em" }}>
        <Link href={isDigital ? "/numerique" : "/"} className="hover:text-cream">
          {isDigital ? "NUMÉRIQUE" : "BIBLIOTHÈQUE"}
        </Link>
        <span className="px-1.5 sm:px-2">›</span>
        <span>{issuerLabel(series).toUpperCase()}</span>
        <span className="px-1.5 sm:px-2">›</span>
        <span>{series.title.toUpperCase()}</span>
      </div>
```

(ajouter `import { issuerLabel } from "@/lib/series";`)

Entête du bloc tomes et props des deux composants :

```tsx
          <div className="text-sm font-medium">{isDigital ? "Tomes lus" : "Tomes possédés"}</div>
        </div>
        <VolumesTable volumes={volumes} showPrice={!isDigital} />
        <QuickAddVolume seriesId={series.id} suggestedNumber={nextNumber} showPrice={!isDigital} />
```

- [ ] **Step 2: Adapter le hero**

Dans `src/components/SeriesHero.tsx`, calculer le format en tête du composant :

```tsx
  const isDigital = series.format === "digital";
```

Remplacer les deux premières lignes de la grille d'infos :

```tsx
            <span className="mt-label self-center">{isDigital ? "Plateforme" : "Éditeur"}</span>
            <span className="text-cream truncate">{issuerLabel(series)}</span>
            {!isDigital && (
              <>
                <span className="mt-label self-center">Variante</span>
                <span className="text-cream truncate">{series.edition_variant ?? "—"}</span>
              </>
            )}
```

Et masquer la carte « Total dépensé » de la colonne de droite :

```tsx
        {!isDigital && (
          <div className="rounded-lg border border-[var(--border)] bg-ink-2 px-4 py-3 sm:py-3.5">
            <div className="mt-label">Total dépensé</div>
            <div className="mt-tabular mt-1 text-2xl font-medium tracking-tight sm:text-[28px]">
              {totalSpent.toFixed(2).replace(".", ",")} €
            </div>
            <div className="mt-1 text-[11px] text-muted">
              moyenne {avg.toFixed(2).replace(".", ",")} € · {ownedCount} {ownedCount > 1 ? "tomes" : "tome"}
            </div>
          </div>
        )}
```

- [ ] **Step 3: Retirer la colonne prix du tableau**

Dans `src/components/VolumesTable.tsx`, remplacer la constante de gabarit par une fonction — le desktop passe de 6 à 5 colonnes quand le prix disparaît :

```tsx
// Mobile: 4 colonnes (N°, Lu, Prix, Suppr.) — 3 sans prix.
// Desktop: 6 colonnes (avec espaceur et Ajouté le) — 5 sans prix.
const GRID_WITH_PRICE =
  "grid grid-cols-[44px_72px_1fr_36px] sm:grid-cols-[60px_100px_1fr_120px_120px_40px]";
const GRID_NO_PRICE =
  "grid grid-cols-[44px_72px_1fr_36px] sm:grid-cols-[60px_100px_1fr_120px_40px]";
```

Signature et gabarit :

```tsx
export function VolumesTable({ volumes, showPrice }: { volumes: Volume[]; showPrice: boolean }) {
  const [, start] = useTransition();
  const gridCls = showPrice ? GRID_WITH_PRICE : GRID_NO_PRICE;
```

Remplacer les deux occurrences de `${GRID_CLS}` par `${gridCls}`. Dans l'entête, rendre la cellule « Prix » conditionnelle :

```tsx
        <span>N°</span>
        <span>Lu</span>
        <span className="hidden sm:inline" />
        {showPrice && <span className="text-right">Prix</span>}
        <span className="hidden text-right sm:inline">Ajouté le</span>
        <span></span>
```

Et dans la ligne, le composant de prix :

```tsx
            {showPrice && <EditablePrice volumeId={v.id} price={Number(v.price ?? 0)} />}
```

En mobile sans prix, la 3ᵉ colonne `1fr` est occupée par l'espaceur `hidden sm:inline` : la ligne reste alignée, la case de suppression reste à droite.

- [ ] **Step 4: Retirer le champ prix de l'ajout rapide**

Dans `src/components/QuickAddVolume.tsx`, mêmes gabarits :

```tsx
const GRID_WITH_PRICE =
  "grid grid-cols-[44px_1fr_auto_36px] sm:grid-cols-[60px_100px_1fr_120px_120px_40px]";
const GRID_NO_PRICE =
  "grid grid-cols-[44px_1fr_auto_36px] sm:grid-cols-[60px_100px_1fr_120px_40px]";
```

```tsx
export function QuickAddVolume({
  seriesId,
  suggestedNumber,
  showPrice,
}: {
  seriesId: string;
  suggestedNumber: number;
  showPrice: boolean;
}) {
```

Dans `submit`, ne valider et n'envoyer le prix que s'il est demandé :

```tsx
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(number);
    if (!Number.isInteger(n) || n <= 0) return toast.error("Numéro invalide");
    let p: number | null = null;
    if (showPrice) {
      p = Number(price.replace(",", "."));
      if (!(p >= 0)) return toast.error("Prix invalide");
    }
    start(async () => {
      try {
        await addVolume(seriesId, n, p);
        setNumber(String(n + 1));
        setPrice("");
        numberRef.current?.focus();
      } catch (e: any) {
        toast.error(e.message ?? "Erreur ajout");
      }
    });
  }
```

Dans le JSX, utiliser `showPrice ? GRID_WITH_PRICE : GRID_NO_PRICE` comme classe et envelopper l'input de prix :

```tsx
      {showPrice && (
        <input
          type="text"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="8,25 €"
          className="mt-mono w-full bg-transparent text-right text-[13px] text-cream outline-none placeholder:text-muted-2"
        />
      )}
```

- [ ] **Step 5: Adapter l'édition de série**

Dans `src/components/SeriesActions.tsx`, ajouter l'état de plateforme et le format :

```tsx
  const [platform, setPlatform] = useState(series.platform ?? "");
  const isDigital = series.format === "digital";
```

Remplacer le bloc à deux colonnes « Éditeur / Variante » de la popin :

```tsx
              {isDigital ? (
                <div>
                  <label className="mt-label mb-1.5 block">Plateforme</label>
                  <input className="mt-input" value={platform} onChange={(e) => setPlatform(e.target.value)} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mt-label mb-1.5 block">Éditeur</label>
                    <input className="mt-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
                  </div>
                  <div>
                    <label className="mt-label mb-1.5 block">Variante</label>
                    <input className="mt-input" value={variant} onChange={(e) => setVariant(e.target.value)} />
                  </div>
                </div>
              )}
```

Et la sauvegarde, qui doit respecter la contrainte de base :

```tsx
        await updateSeries(series.id, {
          title: title.trim(),
          publisher: isDigital ? null : publisher.trim(),
          platform: isDigital ? platform.trim() : null,
          edition_variant: isDigital ? null : variant.trim() || null,
          status,
          total_volumes: total ? Number(total) : null,
          cover_url: coverUrl,
        });
```

- [ ] **Step 6: Rediriger la suppression vers la bonne vue**

Dans `src/actions/series.ts`, `deleteSeries` doit connaître le format avant de supprimer la ligne :

```ts
export async function deleteSeries(id: string) {
  const sb = supabase();
  const { data: existing } = await sb.from("series").select("format").eq("id", id).maybeSingle();
  const { error } = await sb.from("series").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/numerique");
  redirect(existing?.format === "digital" ? "/numerique" : "/");
}
```

`redirect` lève une exception de contrôle de flux : il doit rester le dernier appel de la fonction.

- [ ] **Step 7: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Vérifier le rendu**

Run: `npm run dev`
Ouvrir la série numérique. Attendu : fil d'Ariane `NUMÉRIQUE › <PLATEFORME> › <TITRE>`, hero avec la ligne « Plateforme » et sans « Variante » ni « Total dépensé », bloc « Tomes lus », tableau sans colonne prix, ajout rapide sans champ prix.
Ajouter deux tomes, en cocher un. Attendu : aucune erreur, la barre de progression du hero bouge.
Ouvrir une série physique. Attendu : strictement inchangée, prix compris.

- [ ] **Step 9: Commit**

```bash
git add src/app/series src/components src/actions/series.ts
git commit -m "feat(numerique): page serie adaptee au format numerique"
```

---

### Task 7: Badge « numérique » sur les lectures

**Files:**
- Create: `src/components/DigitalBadge.tsx`
- Modify: `src/components/ReadingHistoryList.tsx`
- Modify: `src/components/ReadVolumesDialog.tsx`

**Interfaces:**
- Consumes: `ReadingGroup.format`, `ReadVolume.format` (tâche 3).
- Produces: `<DigitalBadge />` — composant sans props.

- [ ] **Step 1: Créer le badge**

`src/components/DigitalBadge.tsx` :

```tsx
/** Marque une lecture faite sur support numérique, dans les vues qui mêlent les deux. */
export function DigitalBadge() {
  return (
    <span
      className="mt-mono shrink-0 rounded-[3px] border border-[var(--border-3)] px-1.5 py-0.5 text-[9px] text-cream-mute"
      style={{ letterSpacing: "0.06em" }}
    >
      NUMÉRIQUE
    </span>
  );
}
```

- [ ] **Step 2: L'afficher dans l'historique**

Dans `src/components/ReadingHistoryList.tsx`, importer `DigitalBadge` et remplacer le titre du groupe par un titre suivi du badge :

```tsx
              <div className="flex items-baseline gap-2">
                <h3 className="truncate text-[14px] font-medium tracking-tight text-cream">
                  {group.series_title}
                </h3>
                {group.format === "digital" && <DigitalBadge />}
              </div>
```

- [ ] **Step 3: L'afficher dans la popin de statistiques**

Dans `src/components/ReadVolumesDialog.tsx`, importer `DigitalBadge` et adapter le titre de la ligne :

```tsx
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-sm font-medium">{v.series_title}</p>
                    {v.format === "digital" && <DigitalBadge />}
                  </div>
                  <p className="mt-tabular text-xs text-cream-mute">
                    Tome {v.number} · {DATE_FORMAT.format(new Date(v.read_at))}
                  </p>
                </div>
```

- [ ] **Step 4: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Vérifier le rendu**

Run: `npm run dev`
Ouvrir `/lectures`. Attendu : le tome numérique coché en tâche 6 apparaît dans la liste avec le badge `NUMÉRIQUE` ; les lectures physiques n'ont pas de badge.
Ouvrir `/stats`, cliquer sur la barre de la semaine en cours. Attendu : la popin liste le tome numérique avec son badge.

- [ ] **Step 6: Commit**

```bash
git add src/components/DigitalBadge.tsx src/components/ReadingHistoryList.tsx src/components/ReadVolumesDialog.tsx
git commit -m "feat(numerique): badge numerique dans les vues de lecture"
```

---

### Task 8: Recette d'étanchéité

Cette tâche ne produit pas de code : elle vérifie la promesse centrale de la fonctionnalité — le numérique ne contamine aucune statistique de collection.

**Files:** aucun (vérification manuelle).

**Interfaces:**
- Consumes: l'ensemble des tâches précédentes.
- Produces: rien.

- [ ] **Step 1: Build de production**

Run: `npm run build`
Expected: succès, sans erreur de typage ni avertissement de route manquante.

- [ ] **Step 2: Relever les valeurs de référence**

Run: `npm run dev`
Sur `/`, noter les quatre valeurs de `StatsRow` : total dépensé, nombre de séries, tomes possédés, progrès lecture.
Sur `/stats`, noter la dernière valeur du graphe « dépenses par mois » et celle de « achats par mois » pour le mois en cours.

- [ ] **Step 3: Créer du bruit numérique**

Créer via `/add?format=digital` une seconde série numérique, lui ajouter 3 tomes et les marquer tous lus.

- [ ] **Step 4: Vérifier l'étanchéité**

Revenir sur `/`. Attendu : les quatre valeurs de `StatsRow` sont **inchangées**, la nouvelle série n'apparaît ni dans la grille ni dans le carrousel « Lecture en cours ».
Revenir sur `/stats`. Attendu : « dépenses par mois » et « achats par mois » sont inchangés ; « lectures par semaine » et « lectures par mois » ont augmenté de 3.

Si une valeur de collection a bougé, le filtre de format manque dans la requête correspondante — revoir la tâche 3, étape 2 pour `StatsRow`, étape 6 pour les graphes.

- [ ] **Step 5: Vérifier le scan ISBN**

Si une de tes séries numériques existe aussi en papier chez toi, scanner un de ses tomes
via `/scan`. Attendu : le scan propose de créer une **nouvelle** série physique, il ne
propose pas de rattacher le tome à la série numérique existante.

- [ ] **Step 6: Vérifier la conversion inverse n'est pas possible par accident**

Ouvrir la série numérique, cliquer sur « Modifier ». Attendu : aucun champ « Éditeur » ni « Format » — le format n'est pas modifiable depuis l'interface, conformément au non-objectif de la spec.

- [ ] **Step 7: Commit final**

Aucun fichier à commiter si la recette passe. Si des ajustements ont été nécessaires :

```bash
git add -A
git commit -m "fix(numerique): ajustements issus de la recette"
```
