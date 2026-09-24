-- ============================================================
-- LE COMPOSEUR — Lot B : le dessert (assiette gourmande)
-- Additif & idempotent : à lancer une fois.
-- ============================================================

-- 1. Le café passe après les mignardises
update steps set position = 12 where slug = 'cafe';

-- 2. Dessert : rappel de la trilogie servie avec
update steps
  set title = 'Votre dessert',
      subtitle = 'Une part de gâteau au choix, servie avec coulis de fruits rouges, cascade de fruits et crème anglaise'
  where slug = 'dessert';

-- 3. Nouvelle étape "mignardises" (2 au choix), juste après le dessert
insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('mignardises', 'Vos mignardises', 'Deux petites douceurs au choix, servies avec le dessert', 11, 'pick_range', 2, 2, 'mignardises')
on conflict (slug) do update set
  title = excluded.title, subtitle = excluded.subtitle, position = excluded.position,
  rule_type = excluded.rule_type, rule_min = excluded.rule_min, rule_max = excluded.rule_max,
  unit_label = excluded.unit_label;

-- 4. Les mignardises (idempotent)
delete from items where step_id = (select id from steps where slug = 'mignardises');
insert into items (step_id, name, description, labels, position) values
((select id from steps where slug = 'mignardises'), 'Choux pâtissier à la vanille', 'Crème vanille onctueuse.', array['V'], 1),
((select id from steps where slug = 'mignardises'), 'Tartelette pralines', 'La spécialité rose lyonnaise.', array['V'], 2),
((select id from steps where slug = 'mignardises'), 'Tartelette framboise', 'Fraîche et fruitée.', array['V'], 3),
((select id from steps where slug = 'mignardises'), 'Tartelette citron meringuée', 'Acidulée et gourmande.', array['V'], 4),
((select id from steps where slug = 'mignardises'), 'Tartelette chocolat-noisette', 'Intense et croquante.', array['V'], 5),
((select id from steps where slug = 'mignardises'), 'Macaron', 'Assortiment de parfums.', array['V','SG'], 6),
((select id from steps where slug = 'mignardises'), 'Verrine façon tiramisù', 'Café et mascarpone.', array['V'], 7),
((select id from steps where slug = 'mignardises'), 'Cannelé bordelais', 'Croustillant dehors, moelleux dedans.', array['V'], 8),
((select id from steps where slug = 'mignardises'), 'Mini salade de fruits frais', 'De saison.', array['V','VG','SG'], 9);

-- 5. Option "présentation buffet des gâteaux" (catégorie dessert)
insert into options (slug, category, name, description, price, price_unit, position) values
('dessert-buffet-gateaux', 'dessert', 'Présentation en buffet des gâteaux, avec les mariés', 'Tous les gâteaux dressés en buffet et dévoilés avec les mariés.', 0, 'par_personne', 7)
on conflict (slug) do nothing;

-- 6. Ajouter l'étape mignardises à toutes les formules
update formules set included_steps = array_append(included_steps, 'mignardises')
where not ('mignardises' = any (included_steps));
