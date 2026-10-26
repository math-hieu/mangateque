const STARS = [1, 2, 3, 4, 5];

/** Affichage seul, pour les cartes : rien tant que la série n'est pas notée. */
export function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <span
      role="img"
      aria-label={`Note : ${rating} sur 5`}
      className="inline-flex shrink-0 gap-px text-[11px] leading-none"
    >
      {STARS.map((n) => (
        <span key={n} aria-hidden className={n <= rating ? "text-amber" : "text-muted-2"}>★</span>
      ))}
    </span>
  );
}
