-- ============================================================
-- Photos des étapes Format et Cocktail (fichiers dans public/plats/,
-- servis par le site). Photos Unsplash, licence libre : cf. docs/PHOTOS.md.
-- Données uniquement, aucun changement de schéma. Idempotente.
-- ============================================================
update public.items i
   set photo_url = v.url
  from (values
    ('format',   'Service à table',            '/plats/service-a-table.webp'),
    ('format',   'Banquet — service au plat',  '/plats/banquet.webp'),
    ('format',   'Buffet convivial',           '/plats/buffet.webp'),
    ('cocktail', 'Punch façon mojito',         '/plats/punch-mojito.webp'),
    ('cocktail', 'Mojito « J&J »',             '/plats/mojito.webp'),
    ('cocktail', 'Pim''s',                     '/plats/pimms.webp'),
    ('cocktail', 'Spritz',                     '/plats/spritz.webp'),
    ('cocktail', 'Bélini',                     '/plats/bellini.webp'),
    ('cocktail', 'Soupe champenoise',          '/plats/soupe-champenoise.webp'),
    ('cocktail', 'Cocktail sans alcool',       '/plats/sans-alcool.webp')
  ) as v (step_slug, item_name, url)
  join public.steps s on s.slug = v.step_slug
 where i.step_id = s.id
   and i.name = v.item_name;
