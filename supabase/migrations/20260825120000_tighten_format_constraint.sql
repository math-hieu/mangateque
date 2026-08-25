alter table mangateque.series drop constraint series_format_fields;

-- Symétrique : un physique a un éditeur et jamais de plateforme, un numérique
-- l'inverse. La version précédente n'écrivait que la moitié positive, ce qui
-- laissait passer un numérique porteur d'un éditeur — et `issuerLabel` préfère
-- l'éditeur, donc la plateforme disparaissait silencieusement de l'affichage.
alter table mangateque.series add constraint series_format_fields check (
  (format = 'physical' and publisher is not null and platform  is null) or
  (format = 'digital'  and platform  is not null and publisher is null)
);
