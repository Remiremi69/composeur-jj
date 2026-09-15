-- ============================================================
-- LE COMPOSEUR — Lot D : format de réception (banquet / buffet)
-- Additif & idempotent : à lancer une fois.
-- ============================================================

-- 1. Étape "format", tout au début du parcours (position 0)
insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('format', 'Format de réception', 'Comment souhaitez-vous accueillir et servir vos invités ?', 0, 'pick_one', 1, 1, 'format')
on conflict (slug) do update set
  title = excluded.title, subtitle = excluded.subtitle, position = excluded.position,
  rule_type = excluded.rule_type, rule_min = excluded.rule_min, rule_max = excluded.rule_max,
  unit_label = excluded.unit_label;

-- 2. Les trois formats (idempotent)
delete from items where step_id = (select id from steps where slug = 'format');
insert into items (step_id, name, description, labels, position) values
((select id from steps where slug = 'format'), 'Service à table', 'Vos convives sont assis. Chaque assiette est dressée en cuisine et servie individuellement par notre équipe. L''expérience la plus raffinée.', array[]::text[], 1),
((select id from steps where slug = 'format'), 'Banquet — service au plat', 'Vos convives sont assis. De grands plats généreux sont déposés sur chaque table : chacun se sert et partage, dans un esprit convivial.', array[]::text[], 2),
((select id from steps where slug = 'format'), 'Buffet convivial', 'Buffets en libre accès, avec mange-debout et places assises — pour un moment plus décontracté.', array[]::text[], 3);

-- 3. Ajouter l'étape format à toutes les formules (en tête)
update formules set included_steps = array_prepend('format', included_steps)
where not ('format' = any (included_steps));
