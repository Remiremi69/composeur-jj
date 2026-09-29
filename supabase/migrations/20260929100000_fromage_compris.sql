-- ============================================================
-- Fromage compris : les deux fromages sont servis à chaque mariage.
-- L'étape « Le fromage » n'est plus un choix (rule_type = 'free').
-- Elle garde son écran parce que des options lui sont rattachées
-- (présentation en plateau ou en pyramide) : cf. buildScreens().
-- Données uniquement, aucun changement de schéma. Idempotente.
-- ============================================================
update public.steps
   set rule_type = 'free',
       rule_min  = null,
       rule_max  = null,
       subtitle  = 'Deux fromages servis à tous vos convives : rien à choisir. Choisissez seulement, si vous le souhaitez, leur présentation.'
 where slug = 'fromage';
