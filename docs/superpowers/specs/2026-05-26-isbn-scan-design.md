# ISBN Barcode Scan — Design Spec

## Overview

Add manga volumes to the library by scanning ISBN barcodes with the phone camera. The app fetches book metadata from Google Books, automatically matches or creates the series, and lets the user enter a purchase price before saving.

## User Flow

1. User taps the "Scanner" button in the Topbar (next to "+ Ajouter")
2. `/scan` page opens with the camera active, scanning for EAN-13 barcodes
3. Barcode detected → camera pauses → server action calls Google Books API
4. Result screen shows:
   - Book cover thumbnail + title from Google Books
   - Matched existing series OR "Nouvelle série" creation form
   - Detected volume number (editable)
   - Purchase price input
   - "Ajouter" button
5. On submit: volume is added (and series created if needed)
6. Toast confirmation → automatic return to scanner for the next book

## Technical Design

### New Dependency

- `html5-qrcode` — browser-based barcode scanner using device camera. Supports EAN-13 (ISBN). No native dependencies.

### New Files

#### `src/app/scan/page.tsx`

Server component. Minimal layout wrapping the client scanner component.

#### `src/components/IsbnScanner.tsx`

Client component. Manages the full scan flow with three states:

- **scanning** — Camera active via `html5-qrcode`. On successful decode, transitions to `loading`.
- **loading** — Calls `lookupIsbn` server action. On success, transitions to `result`. On error (book not found, API failure), shows error with "Réessayer" button back to scanning.
- **result** — Renders `ScanResult` component with the fetched data.

Lifecycle: mounts/unmounts the `html5-qrcode` scanner when entering/leaving the scanning state. Cleans up camera on component unmount.

#### `src/components/ScanResult.tsx`

Client component. Receives the lookup result and the list of existing series. Displays:

- Book cover + title from Google Books
- If series matched: shows the matched series name with a confirmation chip. User can reject the match and create a new series instead.
- If no match: shows a mini form with pre-filled title, publisher, and status fields (from Google Books data) to create a new series.
- Volume number input (pre-filled from title parsing, editable)
- Price input (same pattern as `QuickAddVolume`)
- "Ajouter" submit button

On submit:
1. If creating a new series, calls `createSeriesAndAddVolume` server action
2. If adding to existing series, calls `addVolume` server action
3. Shows success toast
4. Calls `onDone()` callback to reset the scanner to scanning state

#### `src/actions/isbn.ts`

Server actions:

**`lookupIsbn(isbn: string)`**

1. Calls `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}` (no API key)
2. Extracts from the first result: `title`, `authors`, `publisher`, `imageLinks.thumbnail`, `industryIdentifiers`
3. Parses the title to extract series name and volume number (see Title Parsing below)
4. Queries Supabase `series` table for a match by normalized title (case-insensitive, trimmed)
5. Returns:

```typescript
type IsbnLookupResult = {
  isbn: string;
  rawTitle: string;
  seriesTitle: string;
  volumeNumber: number | null;
  coverUrl: string | null;
  publisher: string | null;
  matchedSeries: { id: string; title: string } | null;
};
```

**`createSeriesAndAddVolume(input: CreateSeriesInput, volumeNumber: number, price: number)`**

Creates the series in Supabase, then adds the volume. Returns the new series ID. Does not redirect (unlike `createSeries`), since the scan flow stays on `/scan`.

### Modified Files

#### `src/components/Topbar.tsx`

Add a "Scanner" link/button next to "+ Ajouter", pointing to `/scan`.

#### `src/actions/series.ts`

Add a new function `findSeriesByTitle(title: string)` that does a case-insensitive search on the `series` table. Used by `lookupIsbn` for auto-matching.

### Title Parsing

Google Books manga titles follow various patterns. The parser tries these regexes in order:

| Pattern | Example | Series | Volume |
|---------|---------|--------|--------|
| `(.+),\s*Vol\.\s*(\d+)` | "One Piece, Vol. 42" | "One Piece" | 42 |
| `(.+)\s*-\s*[Tt]ome?\s*(\d+)` | "Naruto - Tome 12" | "Naruto" | 12 |
| `(.+)\s+[Tt]\.?\s*(\d+)` | "Bleach T.5" or "Bleach T5" | "Bleach" | 5 |
| `(.+)\s+(\d+)$` | "Dragon Ball 34" | "Dragon Ball" | 34 |

Fallback: if no pattern matches, the full title is used as the series name with `volumeNumber: null`. The user can edit both fields manually.

### Series Matching

Matching is done by normalizing both the parsed series title and existing series titles:
- Lowercase
- Trim whitespace
- Remove diacritics (normalize NFD + strip combining marks)

If a match is found, it is pre-selected but the user must confirm before adding.

### Error Handling

- **ISBN not found in Google Books**: show message "Livre non trouvé pour cet ISBN" with a "Réessayer" button
- **Camera permission denied**: show message explaining how to grant permission
- **Network error**: show generic error with retry option
- **Volume already exists**: rely on existing Supabase unique constraint (if any) or let it add — user can manage duplicates from the series page

### UX Details

- The scanner auto-detects and scans continuously — no "take photo" button needed
- After adding a volume, the scanner resets immediately for fast batch scanning
- A visible "Retour" link goes back to the home page
- The scan page works on mobile (primary use case) and desktop (camera permitting)
