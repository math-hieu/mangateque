# Cover Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the user to change a series' cover from the existing "Modifier" dialog by picking from a grid of 8 covers fetched from Google Books (French ebooks, query = `intitle:"<title>" tome 1`).

**Architecture:** A new server action `searchGoogleBooksCovers(title)` returns up to 8 cleaned thumbnails. The existing `SeriesActions.tsx` dialog gains a two-mode internal state: `"edit"` (current dialog + new cover preview + "Changer la couverture" button) and `"picker"` (full-dialog grid of candidates with back link). The selected URL is staged in component state and persisted via the existing `updateSeries(id, { cover_url })` server action.

**Tech Stack:** Next.js 16 (app router, server actions), Supabase (existing `series.cover_url` column), Google Books v1 API (existing `GOOGLE_BOOKS_API_KEY` env var), Tailwind CSS with project tokens (ink/surface/cream/amber), `sonner` toasts.

**Note on tests:** The project has no automated test framework. Verification is manual via `npm run dev` and `npm run build` after each task.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/actions/series.ts` | Add `CoverCandidate` type, `cleanGoogleBooksThumbnail` helper, `searchGoogleBooksCovers` server action |
| Modify | `src/components/SeriesActions.tsx` | Add cover preview in edit mode, picker mode UI, fetch + selection wiring, `cover_url` in save |

---

### Task 1: Add `searchGoogleBooksCovers` server action

**Files:**
- Modify: `src/actions/series.ts`

- [ ] **Step 1: Add `CoverCandidate` type and `cleanGoogleBooksThumbnail` helper**

In `src/actions/series.ts`, after the existing `CreateSeriesInput` type (around line 16), add:

```ts
export type CoverCandidate = {
  id: string;
  thumbnail: string;
  title: string;
  publisher: string | null;
};

function cleanGoogleBooksThumbnail(url: string): string {
  return url.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "");
}
```

- [ ] **Step 2: Add the `searchGoogleBooksCovers` server action**

In `src/actions/series.ts`, at the bottom of the file, add:

```ts
type GoogleBooksSearchResponse = {
  items?: Array<{
    id: string;
    volumeInfo: {
      title?: string;
      publisher?: string;
      imageLinks?: { thumbnail?: string };
    };
  }>;
};

export async function searchGoogleBooksCovers(seriesTitle: string): Promise<CoverCandidate[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) throw new Error("Clé API Google Books manquante");

  const q = `intitle:"${seriesTitle}" tome 1`;
  const url =
    `https://www.googleapis.com/books/v1/volumes` +
    `?q=${encodeURIComponent(q)}` +
    `&langRestrict=fr` +
    `&filter=ebooks` +
    `&maxResults=8` +
    `&key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Erreur lors de la recherche Google Books");

  const data: GoogleBooksSearchResponse = await res.json();
  const items = data.items ?? [];

  return items
    .map((it) => {
      const thumb = it.volumeInfo?.imageLinks?.thumbnail;
      if (!thumb) return null;
      return {
        id: it.id,
        thumbnail: cleanGoogleBooksThumbnail(thumb),
        title: it.volumeInfo.title ?? "",
        publisher: it.volumeInfo.publisher ?? null,
      } satisfies CoverCandidate;
    })
    .filter((c): c is CoverCandidate => c !== null);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: build succeeds with no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/actions/series.ts
git commit -m "feat(series): add searchGoogleBooksCovers server action"
```

---

### Task 2: Add cover preview + "Changer la couverture" button in edit mode

This task wires the new `coverUrl` state, the reset-on-open behavior, the preview section, and persistence — but the button is non-functional (logs only) until Task 3 adds the picker mode.

**Files:**
- Modify: `src/components/SeriesActions.tsx`

- [ ] **Step 1: Import the `Cover` component**

At the top of `src/components/SeriesActions.tsx`, add the `Cover` import next to the existing imports:

```tsx
import { Cover } from "./Cover";
```

- [ ] **Step 2: Add `coverUrl` state**

In the `SeriesActions` function body, after the existing `useState` calls (around line 14), add:

```tsx
const [coverUrl, setCoverUrl] = useState<string | null>(series.cover_url);
```

- [ ] **Step 3: Add `openDialog` helper and use it on the "Modifier" button**

Keep the existing `useEffect` (it handles `dialogRef.showModal()`/`close()`). Add a new helper function below it (before `function save()`):

```tsx
function openDialog() {
  setCoverUrl(series.cover_url);
  setOpen(true);
}
```

Then change the "Modifier" button's onClick from `() => setOpen(true)` to `openDialog`:

```tsx
<button className="mt-ghost" onClick={openDialog}>
  Modifier
</button>
```

- [ ] **Step 4: Include `cover_url` in the save call**

In `save()`, update the `updateSeries` call to include the staged cover URL:

```tsx
await updateSeries(series.id, {
  title: title.trim(),
  publisher: publisher.trim(),
  edition_variant: variant.trim() || null,
  status,
  total_volumes: total ? Number(total) : null,
  cover_url: coverUrl,
});
```

- [ ] **Step 5: Add the cover preview section in the dialog**

In the dialog JSX, immediately after the `<h2>Modifier la série</h2>` line, add:

```tsx
<div className="flex items-center gap-3">
  <div
    className="shrink-0 w-20 overflow-hidden rounded shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)]"
    style={{ aspectRatio: "0.71" }}
  >
    <Cover url={coverUrl} seedKey={series.id} title={series.title} publisher={series.publisher} />
  </div>
  <button
    className="mt-ghost"
    type="button"
    onClick={() => console.log("open picker (TODO Task 3)")}
  >
    Changer la couverture
  </button>
</div>
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Manual verify in browser**

Run: `npm run dev`
- Open a series detail page.
- Click "Modifier" → dialog opens; cover vignette + "Changer la couverture" button visible above the Titre field.
- Click "Changer la couverture" → no UI change (logs to console). Expected.
- Click "Enregistrer" → cover unchanged (since we didn't pick a new one). Page revalidates.
- Re-open the dialog → vignette still shows the saved cover.

- [ ] **Step 8: Commit**

```bash
git add src/components/SeriesActions.tsx
git commit -m "feat(series): add cover preview + change button in edit dialog"
```

---

### Task 3: Add picker mode with fetch, grid, selection, and error states

**Files:**
- Modify: `src/components/SeriesActions.tsx`

- [ ] **Step 1: Import the new server action and type**

At the top of `src/components/SeriesActions.tsx`, extend the existing series action import:

```tsx
import { updateSeries, deleteSeries, searchGoogleBooksCovers, type CoverCandidate } from "@/actions/series";
```

- [ ] **Step 2: Add picker-related state**

After the `coverUrl` state added in Task 2, add:

```tsx
const [mode, setMode] = useState<"edit" | "picker">("edit");
const [candidates, setCandidates] = useState<CoverCandidate[] | null>(null);
const [coverLoading, setCoverLoading] = useState(false);
const [coverError, setCoverError] = useState<string | null>(null);
```

- [ ] **Step 3: Extend `openDialog` to reset picker state**

Replace the `openDialog` function with:

```tsx
function openDialog() {
  setCoverUrl(series.cover_url);
  setMode("edit");
  setCoverError(null);
  setOpen(true);
}
```

(Note: `candidates` is intentionally NOT reset — it acts as a session cache so re-opening the picker in the same session doesn't refetch.)

- [ ] **Step 4: Add `openPicker` function**

After `openDialog`, add:

```tsx
function openPicker() {
  setMode("picker");
  if (candidates !== null || coverLoading) return;
  setCoverLoading(true);
  setCoverError(null);
  searchGoogleBooksCovers(series.title)
    .then((r) => {
      setCandidates(r);
      setCoverLoading(false);
    })
    .catch((e: any) => {
      const msg = e?.message ?? "Erreur";
      setCoverError(msg);
      setCoverLoading(false);
      toast.error(msg);
    });
}

function retryFetch() {
  setCandidates(null);
  setCoverError(null);
  openPicker();
}
```

- [ ] **Step 5: Wire the "Changer la couverture" button to `openPicker`**

Change the `onClick` on the "Changer la couverture" button from the Task 2 console.log to:

```tsx
onClick={openPicker}
```

- [ ] **Step 6: Conditionally render edit vs picker inside the dialog**

The dialog `<div className="w-[480px] ...">` currently contains the h2 + edit form. Wrap the form in a `mode === "edit"` branch and add a picker branch.

Replace the full dialog inner block (from `<div className="w-[480px] max-w-[calc(100vw-2rem)] space-y-4 p-4 sm:p-6">` opening to its closing `</div>`) with:

```tsx
<div className="w-[480px] max-w-[calc(100vw-2rem)] space-y-4 p-4 sm:p-6">
  <h2 className="text-lg font-medium tracking-tight">
    {mode === "edit" ? "Modifier la série" : "Choisir une couverture"}
  </h2>

  {mode === "edit" ? (
    <>
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-20 overflow-hidden rounded shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)]"
          style={{ aspectRatio: "0.71" }}
        >
          <Cover url={coverUrl} seedKey={series.id} title={series.title} publisher={series.publisher} />
        </div>
        <button className="mt-ghost" type="button" onClick={openPicker}>
          Changer la couverture
        </button>
      </div>
      <div>
        <label className="mt-label mb-1.5 block">Titre</label>
        <input className="mt-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mt-label mb-1.5 block">Nb total de tomes</label>
          <input className="mt-input" type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
        <div>
          <label className="mt-label mb-1.5 block">Statut</label>
          <select className="mt-select w-full" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="ongoing">En cours</option>
            <option value="completed">Terminée</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="mt-ghost" onClick={() => setOpen(false)}>Annuler</button>
        <button className="mt-cta" onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </>
  ) : (
    <>
      <button
        type="button"
        className="text-sm text-muted hover:text-cream"
        onClick={() => setMode("edit")}
      >
        ← Retour
      </button>

      {coverLoading && <p className="text-xs text-muted">Recherche…</p>}

      {coverError && !coverLoading && (
        <div className="space-y-2">
          <p className="text-xs text-amber">{coverError}</p>
          <button type="button" className="mt-ghost" onClick={retryFetch}>
            Réessayer
          </button>
        </div>
      )}

      {!coverLoading && !coverError && candidates && candidates.length === 0 && (
        <p className="text-xs text-muted">Aucune couverture trouvée pour cette série.</p>
      )}

      {!coverLoading && !coverError && candidates && candidates.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCoverUrl(c.thumbnail);
                setMode("edit");
              }}
              className="overflow-hidden rounded ring-1 ring-[var(--border)] hover:ring-2 hover:ring-amber"
              style={{ aspectRatio: "0.71" }}
            >
              <img
                src={c.thumbnail}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  const btn = e.currentTarget.parentElement as HTMLElement | null;
                  if (btn) btn.style.display = "none";
                }}
              />
            </button>
          ))}
        </div>
      )}
    </>
  )}
</div>
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: build succeeds with no TS errors.

- [ ] **Step 8: Manual verify the full flow**

Run: `npm run dev`

Cas nominal :
- Open a series detail page → click "Modifier" → dialog opens in edit mode with cover preview.
- Click "Changer la couverture" → dialog swaps to picker mode, shows "Recherche…" then a 4×2 grid of thumbnails.
- Click a thumbnail → returns to edit mode; preview vignette now shows the picked cover.
- Click "Enregistrer" → dialog closes; the `SeriesHero` cover and the home `SeriesCard` cover update to the new image.

Cas "annulation" :
- Re-open "Modifier" → click "Changer la couverture" → pick a different cover → click "Annuler" instead of "Enregistrer" → re-open "Modifier" → the preview should show the previously-saved cover, not the canceled pick.

Cas vide :
- (Optional) Test with a series whose title returns no Google Books results → expect "Aucune couverture trouvée pour cette série."

Cas erreur :
- (Optional, requires temporarily breaking the API key) → expect error message + "Réessayer" button + toast.

- [ ] **Step 9: Commit**

```bash
git add src/components/SeriesActions.tsx
git commit -m "feat(series): add Google Books cover picker in edit dialog"
```

---

## Out of scope

- Custom image upload
- Manual URL paste field
- Image crop / edit
- Server-side cache of Google Books results
- Alternative sources (AniList, etc.)
- Fullscreen / lightbox preview of candidates
- Automated tests (project has no test framework)
