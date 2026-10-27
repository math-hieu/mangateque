export type SeriesStatus = "ongoing" | "completed";

export type SeriesFormat = "physical" | "digital";

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
  /** 1 à 5, null tant que la série n'est pas notée. */
  rating: number | null;
  created_at: string;
};

export type Volume = {
  id: string;
  series_id: string;
  number: number;
  price: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type LibraryStats = {
  total_spent: number;
  series_count: number;
  completed_count: number;
  volumes_count: number;
  read_count: number;
  read_pct: number;
};

export type SeriesCardData = Series & {
  owned_count: number;
  read_count: number;
  total_spent: number;
};

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

/** Statut VO (AniList) ou VF, même convention que `SeriesStatus`. */
export type RecoStatus = "ongoing" | "completed";

/** Une recommandation, telle qu'écrite par le skill /reco dans data/recommandations/. */
export type Recommendation = {
  rank: number;
  title: string;
  why: string;
  pros: string[];
  cons: string[];
  sources: { label: string; url: string }[];
  /** Titre de la série possédée dont celle-ci est une suite ou un spin-off. */
  related_to: string | null;
  fr: {
    publisher: string;
    volumes: number;
    status: RecoStatus;
    source_url: string;
  };
  anilist: {
    id: number;
    url: string;
    title_romaji: string;
    cover_url: string;
    /** Tomes VO ; null quand AniList ne le connaît pas (série en cours). */
    volumes: number | null;
    status: RecoStatus;
    average_score: number | null;
    genres: string[];
    start_year: number;
    authors: string[];
  };
};

export type RecommendationFile = {
  generated_at: string;
  based_on: { rated_count: number; owned_count: number };
  recommendations: Recommendation[];
};

export type IsbnLookupResult = {
  isbn: string;
  rawTitle: string;
  seriesTitle: string;
  volumeNumber: number | null;
  coverUrl: string | null;
  publisher: string | null;
  matchedSeries: { id: string; title: string } | null;
  alreadyOwned: boolean;
  anilistMatch: {
    id: number;
    title: string;
    coverUrl: string | null;
    volumes: number | null;
    status: "ongoing" | "completed";
  } | null;
};
