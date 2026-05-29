# Page Statistiques de lecture

## Résumé

Ajouter une page `/stats` affichant 3 graphiques de progression : lectures par mois, dépenses cumulées, achats par mois. Nécessite l'ajout d'un champ `read_at` sur les volumes pour traquer la date de lecture.

## 1. Migration Supabase

- Ajouter la colonne `read_at` (timestamptz, nullable) à la table `volumes` (schema `mangateque`)
- Backfill des volumes existants : `UPDATE mangateque.volumes SET read_at = NOW() WHERE is_read = true`

## 2. Modification du type Volume

Dans `src/lib/types.ts`, ajouter `read_at: string | null` au type `Volume`.

## 3. Mise à jour de toggleVolumeRead

Dans `src/actions/volumes.ts`, modifier `toggleVolumeRead` :
- Quand `isRead = true` : setter `is_read = true` ET `read_at = new Date().toISOString()`
- Quand `isRead = false` : setter `is_read = false` ET `read_at = null`

## 4. Server action stats

Nouveau fichier `src/actions/stats.ts` exposant `getReadingStats()` :
- Requête tous les volumes avec `created_at`, `price`, `read_at`
- Calcule 3 jeux de données côté JS :
  - **Lectures par mois** : volumes groupés par mois/année de `read_at` (ignorer les `read_at = null`)
  - **Dépenses cumulées** : volumes triés par `created_at`, cumul progressif de `price`
  - **Achats par mois** : volumes groupés par mois/année de `created_at`
- Retourne un objet typé avec les 3 tableaux prêts pour Recharts

## 5. Page /stats

- Route : `src/app/stats/page.tsx`
- Server component qui appelle `getReadingStats()`
- Passe les données à un client component `StatsCharts` (Recharts nécessite le client)

### Layout

Scroll vertical, mobile-first, 3 sections empilées pleine largeur :

1. **Lectures par mois** — `BarChart` Recharts, barres amber (#d97706)
2. **Dépenses cumulées** — `AreaChart` Recharts, ligne amber, fill en dégradé transparent
3. **Achats par mois** — `BarChart` Recharts, barres amber

Chaque section : titre h2, graphique responsive (`ResponsiveContainer`), fond cohérent avec le design system (surface/ink/amber).

## 6. Navigation

Ajouter un lien "Stats" dans la Topbar (`src/components/Topbar.tsx`), à côté de "Bibliothèque".

## 7. Dépendances

- `recharts` — librairie de graphiques React/SVG

## Hors scope

- Répartition par éditeur
- Filtres par période
- Export des données
