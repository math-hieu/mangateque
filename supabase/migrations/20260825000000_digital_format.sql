-- Rattrape la colonne read_at appliquée à la main lors de la page /stats :
-- sans elle, le dossier migrations/ n'est pas rejouable sur une base neuve.
alter table mangateque.volumes
  add column if not exists read_at timestamptz;

alter table mangateque.series
  add column format text not null default 'physical'
    check (format in ('physical', 'digital')),
  add column platform text;

alter table mangateque.series alter column publisher drop not null;
alter table mangateque.volumes  alter column price     drop not null;

-- Un numérique a toujours une plateforme et jamais d'éditeur, et réciproquement.
-- C'est cette contrainte qui rend l'étanchéité fiable malgré le stockage partagé.
alter table mangateque.series add constraint series_format_fields check (
  (format = 'physical' and publisher is not null) or
  (format = 'digital'  and platform  is not null)
);

create index series_format_idx on mangateque.series(format);
