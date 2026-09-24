-- ============================================================
-- LE COMPOSEUR — Formules présentées en "menu" (sections + traits)
-- Additif : met à jour les 3 formules sans toucher aux données.
-- Convention d'affichage des highlights :
--   '—'        => grand trait (séparateur de section)
--   '· texte'  => sous-ligne (ex : "8 pièces au choix" sous "Cocktail")
--   autre      => ligne de plat/section
-- Prix Signature = 55 € (confirmé) ; Émotion/Harmonie = à confirmer.
-- ============================================================

update formules set
  price_per_person = 95,
  subtitle = 'L''expérience à table : un cocktail, puis un repas complet, entrée comprise',
  included_steps = array['boissons-vh','cocktail','pieces-cocktail','grignotage','animation','plat','feculent','legume','fromage','dessert','cafe'],
  highlights = array[
    'Vin d''honneur',
    '· Citronnade, pièce chaude & feuilleté',
    '—',
    'Cocktail',
    '· 8 pièces au choix',
    '· 1 plancha au choix',
    '—',
    'Entrée au choix',
    'Plat & accompagnement au choix',
    'Fromage',
    '—',
    'Dessert',
    'Café'
  ]
where slug = 'signature';

update formules set
  price_per_person = 95,
  subtitle = 'L''entre-deux : un cocktail plus fourni, un amuse-bouche, un repas resserré',
  included_steps = array['boissons-vh','cocktail','pieces-cocktail','grignotage','animation','plat','feculent','legume','fromage','dessert','cafe'],
  highlights = array[
    'Vin d''honneur',
    '· Citronnade, pièce chaude & feuilleté',
    '—',
    'Cocktail',
    '· 10 pièces au choix',
    '· 1 plancha au choix',
    '—',
    'Amuse-bouche au choix',
    'Fromage',
    '—',
    'Dessert',
    'Café'
  ]
where slug = 'emotion';

update formules set
  price_per_person = 95,
  subtitle = 'Le cocktail à l''honneur : plus de pièces et d''animations, plus de temps pour trinquer',
  included_steps = array['boissons-vh','cocktail','pieces-cocktail','grignotage','animation','plat','feculent','legume','fromage','dessert','cafe'],
  highlights = array[
    'Vin d''honneur',
    '· Citronnade, pièce chaude & feuilleté',
    '—',
    'Cocktail',
    '· 12 pièces au choix',
    '· 2 planchas au choix',
    '—',
    'Plat & accompagnement au choix',
    'Fromage',
    '—',
    'Dessert',
    'Café'
  ]
where slug = 'harmonie';
