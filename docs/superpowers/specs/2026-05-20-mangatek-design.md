# Mangatek — Design Spec

**Date** : 2026-05-20
**Statut** : Validé pour V1

## Contexte & objectif

L'utilisateur suit actuellement sa collection de mangas dans un spreadsheet (un onglet par série), avec le prix d'achat de chaque tome pour suivre le coût total. Le but de Mangatek est de remplacer ce spreadsheet par une web app personnelle :

- Ajouter des séries de manga et les tomes qu'il possède
- Noter le prix d'achat de chaque tome
- Marquer les tomes comme lus / non lus
- Rechercher dans la collection avec filtres (éditeur, statut, lu)
- Voir des stats de coût (total, par série, % lus)
- Afficher les couvertures des séries

App déployée sur Vercel, données dans Supabase. Usage personnel mono-utilisateur pour la V1 (auth ajoutée plus tard).

## Stack technique

- **Next.js 14+** App Router, **TypeScript**
- **Server Components** pour lectures, **Server Actions** pour écritures (pas de routes API)
- **Supabase** (Postgres) — client `@supabase/supabase-js` côté serveur, clé service en variable d'env Vercel
- **AniList GraphQL** (`https://graphql.anilist.co`) — appel via `fetch`, pas de clé requise
- **Tailwind CSS** + **shadcn/ui**
- Pas d'auth V1 → URL non publique partagée

## Modèle de données

Une seule édition par série (publisher + variante intégrés à la table `series`). Si le besoin de tracker plusieurs éditions d'une même série apparaît plus tard, extraction facile dans une table dédiée.

### Table `series`

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | défaut `gen_random_uuid()` |
| `anilist_id` | `int` nullable | ID AniList si récupéré |
| `title` | `text` not null | titre FR de préférence, éditable |
| `cover_url` | `text` nullable | URL CDN AniList |
| `publisher` | `text` not null | ex: "Ki-oon", "Glénat" |
| `edition_variant` | `text` nullable | ex: "Édition originale", "Perfect", "3-en-1" |
| `total_volumes` | `int` nullable | nb total de tomes connus |
| `status` | `text` enum | `ongoing` ou `completed` |
| `created_at` | `timestamptz` | défaut `now()` |

### Table `volumes`

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | défaut `gen_random_uuid()` |
| `series_id` | `uuid` FK → `series(id)` | `ON DELETE CASCADE` |
| `number` | `int` not null | numéro de tome |
| `price` | `numeric(6,2)` not null | prix d'achat en € |
| `is_read` | `bool` not null | défaut `false` |
| `created_at` | `timestamptz` | défaut `now()` |

**Contraintes**
- `UNIQUE(series_id, number)` — pas deux fois le même tome dans une série
- `CHECK (number > 0)`
- `CHECK (price >= 0)`

## Pages & UI

### `/` — Bibliothèque (accueil)

- **Bandeau stats** : total dépensé global, nb de séries, nb de tomes possédés, % tomes lus
- **Barre de recherche** sur titre de série — filtrage côté client (la collection personnelle restera de l'ordre de quelques centaines de séries max, donc Server Component qui charge tout puis filtre via state client)
- **Filtres** : éditeur (multi-select), statut série (ongoing/completed), filtre lu/non-lu — appliqués côté client sur la même liste
- **Grille de cartes série** : couverture + titre + éditeur (+ variante si présente) + `X tomes possédés` (+ `/ Y` si `total_volumes` connu)
- **CTA** : « + Ajouter une série » → `/add`

### `/series/[id]` — Détail d'une série

- **Header** : couverture + titre + éditeur + variante + statut + stats série (total dépensé, X/Y tomes, % lus)
- **Tableau des tomes** : colonnes `n°` • `prix` • `lu` (checkbox toggle inline, Server Action) • supprimer
- **Quick-add row** en bas du tableau : champs `n°` et `prix` uniquement (la lecture est cochée plus tard inline). Validation à l'`Enter`, le focus revient sur le champ `n°` après ajout pour enchaîner.
- **Actions série** : bouton « Modifier la série » (édite publisher, variant, statut, titre) et « Supprimer la série » (confirmation requise, cascade les tomes).

### `/add` — Ajouter une série

- **Champ de recherche AniList** — debounced 300ms côté client, requête via Server Action
- **Résultats** : liste de 10 max avec couverture + titre + nb de tomes connus
- **Sélection** → formulaire pré-rempli (titre éditable, couverture éditable, total éditable) + champs à saisir : éditeur (obligatoire), variante (optionnel), statut (`ongoing` par défaut si AniList renvoie `RELEASING`)
- **Création manuelle** : bouton « Créer sans AniList » → ouvre le formulaire vide
- À la création, redirection vers `/series/[id]`

### Navigation

Header simple sur toutes les pages :
- Logo « Mangatek » → `/`
- Bouton « + Ajouter » → `/add`

## Intégration AniList

**Endpoint** : `https://graphql.anilist.co` (POST GraphQL public, sans clé).

**Query de recherche** :

```graphql
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
```

**Mapping vers le modèle local**
- `title` → `english` ou `romaji` (fallback) — éditable
- `coverImage.large` → `cover_url` (stocké tel quel, pas de proxy)
- `volumes` → `total_volumes` (peut être `null` si série en cours)
- `status` → `ongoing` si `RELEASING`, sinon `completed`

**Couvertures** : on stocke juste l'URL AniList (CDN). Pas de mirror sur Supabase Storage en V1. Risque accepté : si AniList change ses URLs, on perd les images — migration vers Storage facile plus tard.

**Rate limiting** : AniList tolère 90 req/min, le debounce client suffit largement pour notre usage manuel.

**Indisponibilité** : si AniList répond en erreur, l'UI affiche « Recherche indisponible, créez la série manuellement » et le bouton de création manuelle reste accessible.

## Comportements & règles

- **Suppression série** → cascade sur les tomes (FK `ON DELETE CASCADE`)
- **Toggle lu/non-lu** : Server Action sur la checkbox, optimistic UI
- **Quick-add tome** : `is_read` à `false` par défaut, l'utilisateur coche après si déjà lu
- **Édition tome** : pour la V1, pas d'édition inline du prix (suppression + re-création si erreur). À reconsidérer si pénible à l'usage.
- **Stats** : calculées côté serveur via SQL aggrégat (pas de cache)
- **Erreurs Server Action** : remontées via `useFormState` / toast côté UI, pas de page d'erreur dédiée en V1

## Hors scope V1

Volontairement exclu, à reconsidérer plus tard selon usage :
- Authentification (multi-user ou solo)
- Détection des tomes manquants à partir d'AniList
- Wishlist (séries à acheter)
- Tracking par volume des couvertures spécifiques de chaque tome FR
- Date d'achat / date de lecture / lieu d'achat / état (neuf/occasion)
- Tests automatisés
- Seed script depuis le spreadsheet existant (saisie manuelle dans l'app)
- Alertes nouveau tome
- Bulk add de tomes

## Déploiement

- **Vercel** pour Next.js — build automatique sur push
- **Supabase** — projet dédié, schéma initial appliqué via SQL migrations dans `supabase/migrations/`
- **Variables d'env Vercel** :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (côté serveur uniquement)
- Pas de clé AniList nécessaire

## Critères d'acceptation V1

L'app est considérée terminée quand :
1. Je peux créer une série depuis une recherche AniList (titre + couverture + total tomes auto-remplis), en précisant éditeur et variante
2. Je peux créer une série manuellement (sans recherche)
3. Je peux ajouter des tomes à une série rapidement (n° + prix)
4. Je peux toggle l'état lu/non-lu d'un tome en un clic
5. Je peux supprimer un tome ou une série
6. La page d'accueil montre les stats globales et la grille de séries
7. Je peux filtrer la grille par éditeur / statut / lu
8. Le détail d'une série montre les stats série + le tableau des tomes
9. L'app est déployée sur Vercel, accessible via une URL
