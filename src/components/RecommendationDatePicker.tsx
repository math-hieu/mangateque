"use client";

import { useRouter } from "next/navigation";

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Choix d'une génération précédente ; inutile tant qu'il n'y en a qu'une. */
export function RecommendationDatePicker({ dates, current }: { dates: string[]; current: string }) {
  const router = useRouter();
  if (dates.length < 2) return null;

  return (
    <select
      aria-label="Génération affichée"
      className="mt-select"
      value={current}
      onChange={(e) => router.push(`/recommandations?date=${e.target.value}`)}
    >
      {dates.map((d) => (
        <option key={d} value={d}>
          {formatDate(d)}
        </option>
      ))}
    </select>
  );
}
