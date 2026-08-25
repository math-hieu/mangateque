# Lecture numérique

## Résumé

Ajouter une notion de **livre numérique** à côté de la bibliothèque physique existante.
Un livre numérique a une couverture, un titre, une **plateforme** de lecture et un ou
plusieurs tomes. Il vit dans une vue dédiée `/numerique`, n'entre dans **aucune**
statistique de collection (dépenses, achats, progression de la bibliothèque), mais
compte dans les statistiques de **lecture** par semaine et par mois, et apparaît dans
`/lectures` avec un badge `NUMÉRIQUE`.

## Décisions de conception

| Sujet | Décision |
|---|---|
| Stockage | Colonne discriminante `format` sur `mangateque.series`, pas de tables séparées |
| Saisie des tomes | Identique au physique : liste de tomes, cochage individuel qui horodate `read_at` |
| Stats semaine/mois | Total fusionné physique + numérique, sans distinction visuelle |
| Création | Même formulaire qu'aujourd'hui, avec un sélecteur Physique / Numérique |
| Tests | Aucun pour le moment : vérification par `npm run build` + passe manuelle |

Le choix du stockage partagé est motivé par un besoin futur explicite : **convertir une
série numérique en physique** quand elle est achetée. Avec `format`, la conversion sera
un `update` d'une colonne plutôt qu'une migration de lignes entre tables.

## Non-objectifs

- La conversion numérique → physique n'est **pas** implémentée ici.
- Pas de suivi de prix ni d'abonnement pour le numérique.
- Pas de distinction physique/numérique dans les graphes de `/stats`.
- Aucun test automatisé n'est ajouté.

## 1. Migration Supabase

Nouveau fichier `supabase/migrations/20260825000000_digital_format.sql` :

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

Le `default 'physical'` rend les séries existantes valides sans backfill.

## 2. Types (`src/lib/types.ts`)

```ts
export type SeriesFormat = "physical" | "digital";
```

- `Series` : ajouter `format: SeriesFormat` et `platform: string | null` ; `publisher`
  passe à `string | null`.
- `Volume` : `price` passe à `number | null`.
- `SeriesCardData` : hérite de `Series`, donc porte `format` (utilisé pour masquer
  « Dépensé »).
- `ReadingItem.series` : ajouter `format` et `platform`, `publisher` devient nullable.

Nouveau helper `src/lib/series.ts` :

```ts
/** Libellé de l'émetteur : éditeur pour un physique, plateforme pour un numérique. */
export function issuerLabel(s: { publisher: string | null; platform: string | null }): string
```

Il alimente tous les endroits qui affichent aujourd'hui `series.publisher`, pour ne pas semer des
`?? ""` dans chaque composant : `Cover`, `SeriesCard`, `SeriesHero`,
`CurrentlyReadingCarousel`, `ReadingHistoryList`, `ReadVolumesDialog` et le fil d'Ariane
de `/series/[id]`.

## 3. Requêtes

Deux groupes, exhaustifs — aucun autre site ne lit la base.

### 3.1 Exclure le numérique

| Fonction | Fichier | Modification |
|---|---|---|
| `listSeriesForLibrary` | `actions/series.ts` | paramètre `format: SeriesFormat = "physical"` + `.eq("format", format)` |
| `listInProgressSeries` | `actions/series.ts` | paramètre `format: SeriesFormat = "physical"` + `.eq("format", format)` |
| `getLibraryStats` | `actions/series.ts` | `.eq("format", "physical")` sur `series` ; sur `volumes`, `select("price, is_read, series!inner(format)")` + `.eq("series.format", "physical")` |

`listSeriesForLibrary` et `listInProgressSeries` sont paramétrées plutôt que dupliquées :
`/numerique` réutilise la même logique avec `"digital"`. Le défaut `"physical"` fait que
les appels existants de `/` restent corrects sans être modifiés.

### 3.2 Exposer le format

| Fonction | Fichier | Modification |
|---|---|---|
| `listReadingHistory` | `actions/reading.ts` | ajouter `format, platform` au `select` de la relation `series` ; les propager dans `ReadVolumeEntry` puis `ReadingGroup` |
| `getVolumesReadInPeriod` | `actions/stats.ts` | ajouter `format, platform` au `select` ; les propager dans `ReadVolume` |
| `getReadingStats` | `actions/stats.ts` | `select("created_at, price, read_at, series!inner(format)")`. Dans la boucle : `read_at` compte toujours ; `price` et `created_at` ne comptent que si `format === "physical"` |

`groupReadingHistory` (`lib/reading.ts`) n'a pas besoin de changer sa logique : elle
regroupe déjà par `series_id`, donc un groupe est homogène en format par construction.
Seuls les champs `format` et `platform` sont recopiés de l'entrée vers le groupe.

## 4. Écriture

- `CreateSeriesInput` : ajouter `format: SeriesFormat` et `platform: string | null`.
  En numérique, l'appelant envoie `publisher: null`, `edition_variant: null`.
- `addVolume(seriesId, number, price)` : `price` devient `number | null`.
- `updateVolumePrice` et l'édition inline de prix restent réservées au physique
  (colonne non rendue en numérique).
- `revalidatePath("/")` accompagne aujourd'hui chaque mutation de volume ; ajouter
  `revalidatePath("/numerique")` aux mêmes endroits (`addVolume`, `toggleVolumeRead`,
  `deleteVolume`) ainsi que dans `createSeries` / `updateSeries` / `deleteSeries`.

## 5. Interface

### 5.1 Navigation

`Topbar` : ajouter `{ href: "/numerique", label: "Numérique" }` entre Bibliothèque et
Lectures. La rangée mobile passe de 3 à 4 liens `flex-1` ; vérifier le rendu à 375 px et
réduire `px`/`text` si ça déborde.

### 5.2 `/add` — `SeriesForm`

- Sélecteur de format en tête du formulaire : deux boutons segmentés Physique /
  Numérique, `physical` par défaut.
- En **numérique** : le champ « Éditeur » devient « Plateforme » (input + `datalist`
  alimentée par les plateformes déjà enregistrées, pour éviter les variantes de frappe) ;
  le champ « Variante » n'est pas rendu.
- Titre, URL de couverture, nb total de tomes et statut sont communs aux deux formats.
- La validation exige le titre, plus l'éditeur (physique) **ou** la plateforme (numérique).
- La page `/add` accepte `?format=digital` pour pré-sélectionner le numérique, et son fil
  d'Ariane devient neutre (`AJOUTER UNE SÉRIE`).
- Le parcours AniList en amont (`AniListSearch`) est inchangé : il sert aux deux formats.

Une server action `listPlatforms(): Promise<string[]>` alimente la `datalist`
(`select("platform").eq("format", "digital")`, dédoublonné et trié).

### 5.3 `/numerique`

Nouvelle route `src/app/numerique/page.tsx`, `dynamic = "force-dynamic"` comme les autres.
Elle appelle `listSeriesForLibrary("digital")` et `listInProgressSeries("digital")`.

Rendu : le carrousel « Lecture en cours » (numérique) puis la grille. **Pas** de
`StatsRow` — aucune statistique de collection n'a de sens ici. Un CTA « Ajouter » pointe
vers `/add?format=digital`.

`SeriesGrid` est paramétrée plutôt que dupliquée, avec deux nouvelles props :

- `heading` : `"Ma bibliothèque"` ou `"Mes lectures numériques"` ;
- `issuerFilterLabel` : `"Éditeur"` ou `"Plateforme"`.

La liste déroulante de filtre est construite sur `issuerLabel(s)` au lieu de
`s.publisher`. Les filtres Statut et Lecture restent identiques.

### 5.4 `SeriesCard`

Quand `s.format === "digital"`, la ligne « Dépensé » n'est pas rendue ; restent Tomes,
Lus et la barre de progression. La ligne d'émetteur affiche `issuerLabel(s)`, sans le
suffixe de variante.

### 5.5 `/series/[id]`

Une seule route sert les deux formats. Quand la série est numérique :

- fil d'Ariane `NUMÉRIQUE › TITRE`, le premier segment pointant vers `/numerique` ;
- `SeriesHero` affiche « Plateforme » à la place d'« Éditeur », sans ligne « Variante »
  et sans carte « Total dépensé » — la colonne de droite se réduit à la carte Tomes / Lus
  et à sa barre de progression ;
- l'entête du bloc tomes devient « Tomes lus » au lieu de « Tomes possédés » ;
- `VolumesTable` et `QuickAddVolume` reçoivent `showPrice={false}` : la colonne prix
  disparaît et le gabarit de grille est resserré en conséquence (les deux composants
  partagent aujourd'hui un gabarit à 6 colonnes en desktop, il en faut une variante à 5) ;
- `QuickAddVolume` appelle `addVolume(seriesId, n, null)`.

`SeriesActions` (édition / suppression) doit propager `format` et `platform` dans son
formulaire d'édition, avec les mêmes règles de champs que `SeriesForm`.

### 5.6 `/lectures`

`ReadingHistoryList` affiche un badge `NUMÉRIQUE` à côté du titre des groupes dont
`format === "digital"` (même traitement typographique que les autres méta-libellés mono
de la page : `text-[10px]`, `letterSpacing: 0.06em`). La ligne d'émetteur affiche
`issuerLabel(group)`.

### 5.7 `/stats`

Aucun changement de rendu des graphes : les tomes numériques sont comptés avec les
physiques dans « lectures par semaine » et « par mois ». Dépenses et achats restent
strictement physiques (§3.1 et §3.2).

`ReadVolumesDialog` — la popin ouverte au clic sur une barre — liste les deux types et
porte le même badge `NUMÉRIQUE` sur les lignes concernées.

## 6. Vérification

Aucun test automatisé (décision explicite). La vérification repose sur :

1. `npm run build` — le typecheck est le filet principal : le passage de `publisher` et
   `price` à nullable fait remonter mécaniquement tous les sites d'affichage oubliés.
2. Passe manuelle dans le navigateur :
   - créer une série numérique depuis `/add`, vérifier l'absence des champs éditeur et
     variante et la présence de la plateforme ;
   - ajouter des tomes, vérifier l'absence de la colonne prix ;
   - cocher des tomes lus, vérifier leur apparition dans `/lectures` avec le badge et
     dans les graphes semaine/mois de `/stats` ;
   - vérifier que `/` (grille, `StatsRow`, carrousel) et les cartes « Total dépensé » /
     « Progrès lecture » sont **inchangés** en valeur après création du numérique ;
   - vérifier que le clic sur une barre de `/stats` ouvre une popin mixte correctement
     étiquetée.
