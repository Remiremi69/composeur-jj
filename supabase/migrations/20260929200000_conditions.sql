-- ============================================================
-- Alignement sur les conditions de mariage (j-jtraiteur.fr/conditions-mariage)
-- • Personnel de service : 1 pour 45 convives (et non 25)
-- • Deux « petits plus » : enlèvement des bouteilles vides (60 €) et
--   enlèvement des ordures sur site (150 €)
-- Données uniquement, aucun changement de schéma. Idempotente.
-- ============================================================
update public.inclusions
   set label = '1 membre du personnel de service pour 45 convives'
 where label = '1 serveur pour 25 convives';

insert into public.options (slug, category, name, description, price, price_unit, position, is_active)
values
  ('enlevement-bouteilles', 'services', 'Enlèvement de vos bouteilles vides',
   'Nous repartons avec vos bouteilles vides en fin de soirée.', 60.00, 'forfait', 14, true),
  ('enlevement-ordures', 'services', 'Enlèvement des ordures sur site',
   'Nous emportons les ordures de la réception : vous n’avez rien à gérer.', 150.00, 'forfait', 15, true)
on conflict (slug) do update
  set category = excluded.category, name = excluded.name, description = excluded.description,
      price = excluded.price, price_unit = excluded.price_unit, position = excluded.position,
      is_active = excluded.is_active;
