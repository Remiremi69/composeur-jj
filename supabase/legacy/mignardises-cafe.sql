-- ============================================================
-- LE COMPOSEUR — Retrait de l'étape « mignardises »
-- Les mignardises sont imposées par le traiteur et servies avec le café :
-- on supprime l'étape de choix et on les met en valeur dans l'étape café.
-- Additif & idempotent : à lancer une fois.
-- ============================================================

-- 1. Retirer l'étape 'mignardises' de toutes les formules
update formules
  set included_steps = array_remove(included_steps, 'mignardises')
where 'mignardises' = any (included_steps);

-- 2. Supprimer les items puis l'étape 'mignardises'
delete from items where step_id = (select id from steps where slug = 'mignardises');
delete from steps where slug = 'mignardises';

-- 3. Mettre en valeur les mignardises dans l'étape 'café'
update steps
  set title = 'Café & mignardises',
      subtitle = 'Pour clôturer en douceur — tout est inclus, rien à choisir'
where slug = 'cafe';

-- 4. Réécrire les items de l'étape café (idempotent)
delete from items where step_id = (select id from steps where slug = 'cafe');
insert into items (step_id, name, description, labels, position) values
((select id from steps where slug = 'cafe'), 'Café, thé & infusions', '1 café servi à table, puis café (capsule), thé et infusions en libre-service toute la soirée.', array['V'], 1),
((select id from steps where slug = 'cafe'), 'Nos mignardises maison', 'Un assortiment de petites douceurs préparées par nos soins et servies avec le café : choux vanille, tartelettes, macarons, cannelés… selon l''inspiration du chef.', array['V'], 2);
