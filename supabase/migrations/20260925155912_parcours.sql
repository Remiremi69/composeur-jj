-- ============================================================
-- LOT 3 — PARCOURS
-- • Noms courts pour la frise d'étapes (nav_title).
-- • Regroupement de plusieurs étapes sur un seul écran (group_slug,
--   group_title, group_nav_title) : plat + féculent + légume = « Votre
--   assiette ». Chaque étape garde sa propre règle.
-- Tout reste piloté par les données : le front ne contient aucun slug.
-- Purement additive : l'ancien front ignore ces colonnes.
-- Idempotente : peut être rejouée sans erreur.
-- ============================================================

alter table public.steps add column if not exists nav_title text;        -- nom court (frise)
alter table public.steps add column if not exists group_slug text;       -- écran partagé (route)
alter table public.steps add column if not exists group_title text;      -- titre de l'écran partagé
alter table public.steps add column if not exists group_nav_title text;  -- nom court de l'écran partagé

-- Noms courts de la frise (repli sur le titre complet s'ils sont vides).
update public.steps set nav_title = v.nav_title
from (values
  ('format', 'Format'),
  ('boissons-vh', 'Boissons'),
  ('cocktail', 'Cocktail'),
  ('pieces-cocktail', 'Pièces'),
  ('grignotage', 'Grignotage'),
  ('animation', 'Plancha'),
  ('plat', 'Plat'),
  ('feculent', 'Féculent'),
  ('legume', 'Légume'),
  ('fromage', 'Fromage'),
  ('dessert', 'Dessert'),
  ('cafe', 'Café')
) as v(slug, nav_title)
where public.steps.slug = v.slug;

-- « Votre assiette » : plat, féculent et légume sur un seul écran.
update public.steps
set group_slug = 'assiette', group_title = 'Votre assiette', group_nav_title = 'Assiette'
where slug in ('plat', 'feculent', 'legume');
