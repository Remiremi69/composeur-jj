-- ============================================================
-- LE COMPOSEUR — Formules v2
-- Nouveaux prix + nb de pièces/planchas propre à chaque formule.
--   Signature : 4 pièces, 1 plancha  → 130 €
--   Émotion   : 6 pièces, 1 plancha  → 120 € (+ amuse-bouche)
--   Harmonie  : 8 pièces, 2 planchas → 110 €
-- Additif & idempotent : à lancer une fois.
-- ============================================================

-- 1. Colonne de surcharge de règles par formule (si absente)
alter table formules
  add column if not exists step_rules jsonb not null default '{}'::jsonb;

-- 2. Sous-titres d'étapes : on retire le nombre (désormais propre à la formule)
update steps set subtitle = 'Composez votre assortiment de pièces cocktail'
  where slug = 'pieces-cocktail';
update steps set subtitle = 'Vos préparations grillées minute, devant vos invités', unit_label = 'plancha'
  where slug = 'animation';

-- 3. Formules : prix, highlights (nb de pièces) et règles par étape
update formules set
  price_per_person = 130,
  highlights = array['Vin d''honneur','· Citronnade, pièce chaude & feuilleté','—','Cocktail','· 4 pièces au choix','· 1 plancha au choix','—','Entrée au choix','Plat & accompagnement au choix','Fromage','—','Dessert','Café'],
  step_rules = '{"pieces-cocktail":{"min":4,"max":4},"animation":{"min":1,"max":1}}'::jsonb
where slug = 'signature';

update formules set
  price_per_person = 120,
  highlights = array['Vin d''honneur','· Citronnade, pièce chaude & feuilleté','—','Cocktail','· 6 pièces au choix','· 1 plancha au choix','—','Amuse-bouche au choix','Fromage','—','Dessert','Café'],
  step_rules = '{"pieces-cocktail":{"min":6,"max":6},"animation":{"min":1,"max":1}}'::jsonb
where slug = 'emotion';

update formules set
  price_per_person = 110,
  highlights = array['Vin d''honneur','· Citronnade, pièce chaude & feuilleté','—','Cocktail','· 8 pièces au choix','· 2 planchas au choix','—','Plat & accompagnement au choix','Fromage','—','Dessert','Café'],
  step_rules = '{"pieces-cocktail":{"min":8,"max":8},"animation":{"min":2,"max":2}}'::jsonb
where slug = 'harmonie';
