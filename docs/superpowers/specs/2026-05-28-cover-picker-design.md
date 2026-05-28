# Modification de la couverture d'une série

## Résumé

Permettre à l'utilisateur de changer la couverture d'une série depuis le dialog "Modifier" existant. Au clic sur "Changer la couverture", le dialog bascule vers un picker affichant une grille de 8 vignettes proposées par l'API Google Books, recherchées automatiquement à partir du titre de la série.

## 1. Server action

Nouveau fichier de helpers + nouvelle server action dans `src/actions/series.ts`.

### Type

```ts
export type CoverCandidate = {
  id: string;          // identifiant Google Books (pour key React)
  thumbnail: string;   // URL nettoyée (https, sans &edge=curl)
  title: string;       // titre du volume tel que retourné par GB
  publisher: string | null;
};
```

### Fonction

```ts
export async function searchGoogleBooksCovers(seriesTitle: string): Promise<CoverCandidate[]>
```

- Requête : `https://www.googleapis.com/books/v1/volumes?q=intitle:"<title>"+tome+1&langRestrict=fr&filter=ebooks&maxResults=8&key=<GOOGLE_BOOKS_API_KEY>`
- `cache: "no-store"`
- Filtre côté serveur les items sans `volumeInfo.imageLinks.thumbnail` (jamais de trou dans la grille).
- Nettoie chaque thumbnail via un helper local `cleanGoogleBooksThumbnail(url)` :
  - `http://` → `https://`
  - supprime `&edge=curl`
  - garde `zoom=1`
- Retourne un tableau (potentiellement vide).

### Erreurs

- Pas de `GOOGLE_BOOKS_API_KEY` → `throw new Error("Clé API Google Books manquante")` (cohérent avec `lookupIsbn` dans `src/actions/isbn.ts`).
- `fetch` non-OK → `throw new Error("Erreur lors de la recherche Google Books")`.
- Réponse vide ou tous les items filtrés → retourne `[]` (pas une erreur).

## 2. Persistance

Aucune migration nécessaire. La colonne `cover_url` existe déjà sur `series` et `CreateSeriesInput` l'expose déjà. On réutilise `updateSeries(id, { cover_url })`.

## 3. Composant client : `SeriesActions.tsx`

### Nouvel état

- `mode: "edit" | "picker"` — vue affichée dans le dialog (init `"edit"`)
- `coverUrl: string | null` — cover stagée (init `series.cover_url`)
- `candidates: CoverCandidate[] | null` — résultats GB (null = pas encore chargé)
- `coverLoading: boolean`
- `coverError: string | null`

### Réinitialisation

Le composant existant ne reset pas son state en fermant le dialog (les `useState(series.x)` ne sont initialisés qu'une fois). Pour les nouveaux champs, on ajoute un reset explicite à l'ouverture, dans la fonction qui ouvre le dialog :

- `coverUrl` revient à `series.cover_url`
- `mode` revient à `"edit"`
- `coverError` revient à `null`
- `candidates` est conservé (cache implicite — pas besoin de refaire la requête si on ré-ouvre le picker dans la même session)

Cela évite qu'un utilisateur qui pick une couverture sans sauvegarder puis ferme/réouvre voie la cover non sauvegardée comme si elle l'était.

### Mode `"edit"`

Nouvelle section au-dessus du champ "Titre" :

- Vignette ~80×113px (aspect-ratio 0.71) du `coverUrl` actuel, rendue via `<Cover>` (gère le fallback SVG si `coverUrl === null`).
- À droite : bouton ghost "Changer la couverture".

Tout le reste du dialog (titre, éditeur, variante, statut, nb tomes, boutons Annuler/Enregistrer) reste inchangé.

### Mode `"picker"`

Remplace tout le contenu du dialog sauf le titre du dialog qui devient "Choisir une couverture".

- Lien retour `← Retour` en haut (pattern `AniListSearch.tsx`) → `setMode("edit")`.
- `coverLoading === true` → texte muted "Recherche…"
- `coverError !== null` → message d'erreur + bouton ghost "Réessayer" qui relance le fetch.
- `candidates` chargé et vide → "Aucune couverture trouvée pour cette série."
- `candidates` chargé et non vide → grille `grid grid-cols-4 gap-3` avec `<button>` cliquables :
  - chaque tuile : `<img src={c.thumbnail}>` en aspect-ratio 0.71, `object-cover`, `rounded`
  - hover : ring amber
  - `onError` sur l'`<img>` : masquer la tuile (le `<button>` parent contenant l'image)
  - clic : `setCoverUrl(c.thumbnail); setMode("edit")`

### Déclenchement du fetch

Au clic sur "Changer la couverture" :
- `setMode("picker")`
- Si `candidates === null` : déclencher `searchGoogleBooksCovers(series.title)` (pas le titre stagé dans `title` state, on prend le titre actuel de la série pour ne pas requêter un titre non sauvegardé).
- Pendant le fetch : `coverLoading = true`. À la fin : `candidates = results` ou `coverError = e.message` + `toast.error`.

## 4. Save

`save()` étend l'appel existant :

```ts
await updateSeries(series.id, {
  title: title.trim(),
  publisher: publisher.trim(),
  edition_variant: variant.trim() || null,
  status,
  total_volumes: total ? Number(total) : null,
  cover_url: coverUrl,
});
```

`updateSeries` revalide déjà `/` et `/series/[id]` — la nouvelle cover apparaît dans le `SeriesHero` et la `SeriesCard`.

## 5. Vérification

Pas de tests automatisés (le projet n'en a pas). Vérification manuelle :

1. `npm run dev`, ouvrir une série existante.
2. Cliquer "Modifier" → vignette actuelle visible en haut du dialog.
3. Cliquer "Changer la couverture" → loading puis grille de vignettes.
4. Cliquer une vignette → retour au mode édition, preview mise à jour.
5. "Enregistrer" → nouvelle cover dans `SeriesHero` et dans `SeriesCard` sur `/`.
6. Cas vide : tester avec un titre exotique → "Aucune couverture trouvée".
7. `npm run build` passe sans erreur TypeScript.

## Hors scope

- Upload d'image custom
- Saisie manuelle d'URL
- Crop / édition d'image
- Cache serveur des résultats Google Books
- Sources alternatives (AniList, etc.)
- Aperçu plein écran / lightbox des candidats
