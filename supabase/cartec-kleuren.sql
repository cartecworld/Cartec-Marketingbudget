-- Eenmalig: zet de bestaande categorieën op de Cartec-kleuren.
update public.categories set color = v.color
from (values
  ('Advertenties', '#1E63D6'),
  ('Prijsgeld', '#E03A2F'),
  ('Samenwerkingen', '#2BB3A3'),
  ('Opleidingen/cursussen', '#F2A900'),
  ('Offline marketingmateriaal', '#7FA7E8'),
  ('Online marketingmateriaal', '#8E9AAF')
) as v (name, color)
where categories.name = v.name;
