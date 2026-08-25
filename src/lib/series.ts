/**
 * Libellé de l'émetteur d'une série : l'éditeur pour un livre physique, la
 * plateforme pour un numérique. La contrainte `series_format_fields` en base
 * garantit qu'exactement l'un des deux est renseigné et que l'autre est nul,
 * donc le repli sur "" ne se produit jamais en pratique — il n'est là que
 * pour satisfaire le typage.
 */
export function issuerLabel(s: { publisher: string | null; platform: string | null }): string {
  return s.publisher ?? s.platform ?? "";
}
