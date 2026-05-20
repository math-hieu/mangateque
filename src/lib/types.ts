export type SeriesStatus = "ongoing" | "completed";

export type Series = {
  id: string;
  anilist_id: number | null;
  title: string;
  cover_url: string | null;
  publisher: string;
  edition_variant: string | null;
  total_volumes: number | null;
  status: SeriesStatus;
  created_at: string;
};

export type Volume = {
  id: string;
  series_id: string;
  number: number;
  price: number;
  is_read: boolean;
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
