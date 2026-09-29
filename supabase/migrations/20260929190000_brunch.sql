-- ============================================================
-- Brunch du lendemain : une étape à part entière (facultative).
-- • Schéma : options.exclusive_group (options qui s'excluent entre elles)
-- • Étape « brunch » (0 ou 1 format), 7 formats, dans les 3 formules
-- • Mise en place : buffet livré (inclus), + installation (150 €),
--   + installation et service (300 €) — options exclusives
-- • Les 3 anciennes options brunch de « Les petits plus » sont désactivées
-- Prix par personne, calculés sur le nombre de convives du mariage.
-- Idempotente.
-- ============================================================

-- 1. Options exclusives -------------------------------------------------
alter table public.options add column if not exists exclusive_group text;

-- 2. Étape ---------------------------------------------------------------
insert into public.steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label, nav_title)
values (
  'brunch',
  'Brunch du lendemain',
  'Facultatif : prolongez la fête le lendemain. Prix par personne, estimé sur le nombre de convives du mariage : J&J l’ajuste avec vous. Buffet livré compris ; installation et service en supplément.',
  13, 'pick_range', 0, 1, 'brunch', 'Brunch'
)
on conflict (slug) do update
  set title = excluded.title, subtitle = excluded.subtitle, position = excluded.position,
      rule_type = excluded.rule_type, rule_min = excluded.rule_min, rule_max = excluded.rule_max,
      unit_label = excluded.unit_label, nav_title = excluded.nav_title;

-- 3. Formats (prix par personne dans « supplement ») ------------------------
insert into public.items (step_id, name, description, price, price_unit, supplement, labels, allergens, is_active, position)
select s.id, v.name, v.description, 0, 'par_personne', v.prix, v.labels, '{}', true, v.pos
  from public.steps s,
       (values
         (1, 'Le Petit déj', 'Café, thé, lait, infusions, cappuccino, beurre, pain, croissants, pains au chocolat et jus d’orange pressé.', 20.00, '{V}'::text[]),
         (2, 'Le Mâchon', 'Le Petit déj, avec charcuterie et fromage : le brunch à la lyonnaise.', 35.00, '{}'::text[]),
         (3, 'Le Bord de mer', 'Le Petit déj, avec saumon gravlax, crevettes, huîtres, tzatziki de concombre, penne au crabe, fromage et salade de fruits frais.', 35.00, '{}'::text[]),
         (4, 'Un Mâchon au bord de mer', 'Le Petit déj, le Mâchon et le Bord de mer réunis.', 35.00, '{}'::text[]),
         (5, 'L’Italien', 'Penne au parmesan et coppa (dans la meule), salade tomate-mozzarella, légumes grillés, crostini tapenade et anchoïade, tiramisu (café, pistache ou fruits rouges).', 35.00, '{}'::text[]),
         (6, 'L’Anglais', 'Le Petit déj, avec fish & chips.', 35.00, '{}'::text[]),
         (7, 'L’Américain', 'Le Petit déj, avec burger et cheesecake.', 35.00, '{}'::text[])
       ) as v (pos, name, description, prix, labels)
 where s.slug = 'brunch'
   and not exists (select 1 from public.items i where i.step_id = s.id and i.name = v.name);

-- 4. Mise en place (options rattachées à l'étape, exclusives) ---------------
insert into public.options (slug, category, name, description, price, price_unit, position, is_active, exclusive_group)
values
  ('brunch-installation', 'brunch', 'Installation : nappage, tables et chaises',
   'Nous installons le buffet, le nappage, les tables et les chaises. Sans cette option, le buffet est livré.',
   150.00, 'forfait', 1, true, 'brunch-mise-en-place'),
  ('brunch-installation-service', 'brunch', 'Installation et service par notre équipe',
   'L’installation complète, plus le service assuré par notre équipe pendant le brunch.',
   300.00, 'forfait', 2, true, 'brunch-mise-en-place')
on conflict (slug) do update
  set category = excluded.category, name = excluded.name, description = excluded.description,
      price = excluded.price, price_unit = excluded.price_unit, position = excluded.position,
      is_active = excluded.is_active, exclusive_group = excluded.exclusive_group;

-- 5. Anciennes options brunch (page « Les petits plus ») : désactivées --------
update public.options set is_active = false
 where slug in ('brunch-classique', 'brunch-burger', 'brunch-grand');

-- 6. Étape proposée dans les 3 formules ------------------------------------
update public.formules
   set included_steps = array_append(included_steps, 'brunch')
 where not ('brunch' = any (included_steps));
