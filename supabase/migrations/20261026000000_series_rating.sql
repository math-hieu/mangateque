-- Note personnelle de 1 à 5 ; null tant que la série n'a pas été notée.
-- Portée par la ligne de série, donc une édition papier et une édition
-- numérique de la même œuvre ont chacune leur note.
alter table mangateque.series
  add column rating smallint check (rating between 1 and 5);
