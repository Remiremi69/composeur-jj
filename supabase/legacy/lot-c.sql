-- ============================================================
-- LE COMPOSEUR — Lot C : animations (cocktail + brasero)
-- Additif & idempotent : à lancer une fois.
-- Prix d'exemple à confirmer avec le traiteur.
-- ============================================================

insert into options (slug, category, name, description, price, price_unit, position) values
('anim-huitres', 'animation', 'Bar à huîtres',
  'Un écailler sur place, huîtres ouvertes minute pendant le cocktail.', 6, 'par_personne', 20),
('anim-serrano', 'animation', 'Bar à jambon serrano',
  'Jambon serrano tranché à la découpe devant vos invités.', 5, 'par_personne', 21),
('anim-brasero-cochon', 'animation', 'Brasero — cochon à la broche',
  'Cochon rôti à la broche, découpé devant les invités. Location du bois et chef supplémentaire inclus.', 8, 'par_personne', 22),
('anim-brasero-broche', 'animation', 'Brasero — broche (viande au choix)',
  'Bœuf, veau ou agneau à la broche, viande au choix. Location du bois et chef supplémentaire inclus.', 10, 'par_personne', 23),
('anim-brasero-bbq', 'animation', 'Brasero — barbecue',
  'Grillades au feu de bois. Location du bois et chef supplémentaire inclus.', 7, 'par_personne', 24)
on conflict (slug) do nothing;
