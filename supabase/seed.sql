-- ============================================================
-- LE COMPOSEUR — Seed : catalogue complet J&J
-- À exécuter APRÈS schema.sql
-- Prix des formules Émotion/Harmonie = EXEMPLES (à confirmer).
-- Étiquettes : V (végétarien), VG (végétalien), SG (sans gluten).
-- ============================================================

do $$
declare
  s_format    uuid;
  s_boissons  uuid;
  s_cocktail  uuid;
  s_pieces    uuid;
  s_grign     uuid;
  s_anim      uuid;
  s_plat      uuid;
  s_feculent  uuid;
  s_legume    uuid;
  s_fromage   uuid;
  s_dessert   uuid;
  s_cafe      uuid;
begin

-- ============================================================
-- ÉTAPES (ordre du repas)
-- ============================================================
insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('format', 'Format de réception', 'Comment souhaitez-vous accueillir et servir vos invités ?', 0, 'pick_one', 1, 1, 'format')
returning id into s_format;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('boissons-vh', 'Vos boissons', 'Servies tout au long du vin d''honneur — incluses', 1, 'free', null, null, 'boissons')
returning id into s_boissons;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('cocktail', 'Votre cocktail', 'Un ou deux cocktails signature, avec ou sans alcool', 2, 'pick_range', 1, 2, 'cocktails')
returning id into s_cocktail;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('pieces-cocktail', 'Vos pièces cocktail', 'Composez votre assortiment — 12 pièces au choix', 3, 'pick_range', 12, 12, 'pièces')
returning id into s_pieces;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('grignotage', 'Le grignotage', 'Feuilletés et douceurs salées en libre accès — inclus', 4, 'free', null, null, 'inclus')
returning id into s_grign;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('animation', 'Animation plancha', 'Une ou deux préparations grillées minute devant vos invités', 5, 'pick_range', 1, 2, 'plats')
returning id into s_anim;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('plat', 'Votre plat', 'Viande, poisson ou option végétarienne', 6, 'pick_one', 1, 1, 'plat')
returning id into s_plat;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('feculent', 'Votre féculent', 'L''accompagnement gourmand de votre plat', 7, 'pick_one', 1, 1, 'féculent')
returning id into s_feculent;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('legume', 'Votre légume', 'La touche végétale de saison', 8, 'pick_one', 1, 1, 'légume')
returning id into s_legume;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('fromage', 'Le fromage', 'Une sélection affinée du marché', 9, 'pick_one', 1, 1, 'choix')
returning id into s_fromage;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('dessert', 'Votre dessert', 'Une part de gâteau au choix, servie avec coulis de fruits rouges, cascade de fruits et crème anglaise', 10, 'pick_one', 1, 1, 'dessert')
returning id into s_dessert;

insert into steps (slug, title, subtitle, position, rule_type, rule_min, rule_max, unit_label)
values ('cafe', 'Café & mignardises', 'Pour clôturer en douceur — tout est inclus, rien à choisir', 12, 'free', null, null, 'inclus')
returning id into s_cafe;


-- ============================================================
-- FORMULES (Signature confirmée à 85 € ; Émotion/Harmonie = exemples)
-- ============================================================
insert into formules (slug, name, subtitle, price_per_person, included_steps, highlights, position) values
('signature', 'Signature', 'L''expérience à table : un cocktail, puis un repas complet, entrée comprise', 95,
  array['format','boissons-vh','cocktail','pieces-cocktail','grignotage','animation','plat','feculent','legume','fromage','dessert','cafe'],
  array['Vin d''honneur','· Citronnade, pièce chaude & feuilleté','—','Cocktail','· 8 pièces au choix','· 1 plancha au choix','—','Entrée au choix','Plat & accompagnement au choix','Fromage','—','Dessert','Café'], 1),

('emotion', 'Émotion', 'L''entre-deux : un cocktail plus fourni, un amuse-bouche, un repas resserré', 95,
  array['format','boissons-vh','cocktail','pieces-cocktail','grignotage','animation','plat','feculent','legume','fromage','dessert','cafe'],
  array['Vin d''honneur','· Citronnade, pièce chaude & feuilleté','—','Cocktail','· 10 pièces au choix','· 1 plancha au choix','—','Amuse-bouche au choix','Fromage','—','Dessert','Café'], 2),

('harmonie', 'Harmonie', 'Le cocktail à l''honneur : plus de pièces et d''animations, plus de temps pour trinquer', 95,
  array['format','boissons-vh','cocktail','pieces-cocktail','grignotage','animation','plat','feculent','legume','fromage','dessert','cafe'],
  array['Vin d''honneur','· Citronnade, pièce chaude & feuilleté','—','Cocktail','· 12 pièces au choix','· 2 planchas au choix','—','Plat & accompagnement au choix','Fromage','—','Dessert','Café'], 3);


-- ============================================================
-- FORMAT DE RÉCEPTION (service à table / banquet / buffet)
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_format, 'Service à table', 'Vos convives sont assis. Chaque assiette est dressée en cuisine et servie individuellement par notre équipe. L''expérience la plus raffinée.', array[]::text[], 1),
(s_format, 'Banquet — service au plat', 'Vos convives sont assis. De grands plats généreux sont déposés sur chaque table : chacun se sert et partage, dans un esprit convivial.', array[]::text[], 2),
(s_format, 'Buffet convivial', 'Buffets en libre accès, avec mange-debout et places assises — pour un moment plus décontracté.', array[]::text[], 3);


-- ============================================================
-- BOISSONS DU VIN D'HONNEUR (incluses)
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_boissons, 'Evian & Perrier fine bulle', 'Eaux plate et pétillante, à volonté.', array['VG','SG'], 1),
(s_boissons, 'Citronnade maison à la menthe', 'Préparée maison, fraîche et parfumée.', array['VG','SG'], 2),
(s_boissons, 'Eaux aromatisées', 'Concombre-coriandre, thym-citron, céleri-menthe…', array['VG','SG'], 3),
(s_boissons, 'Jus de fruits artisanaux', 'Pomme, poire, coing… selon la saison.', array['VG','SG'], 4);


-- ============================================================
-- COCKTAILS (1 ou 2 au choix)
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_cocktail, 'Punch façon mojito', 'Rhum, citron, citron vert, gingembre, menthe, coriandre et fruits.', array[]::text[], 1),
(s_cocktail, 'Mojito « J&J »', 'Le mojito signature de la maison.', array[]::text[], 2),
(s_cocktail, 'Pim''s', 'Liqueur de Pim''s, limonade, fraise, concombre, citron et menthe.', array[]::text[], 3),
(s_cocktail, 'Spritz', 'Apérol, prosecco et tonic San Pellegrino.', array[]::text[], 4),
(s_cocktail, 'Bélini', 'Crème de pêche blanche et prosecco.', array[]::text[], 5),
(s_cocktail, 'Soupe champenoise', 'Crémant de Bourgogne, sucre de canne, citron vert, Cointreau et fruits.', array[]::text[], 6),
(s_cocktail, 'Cocktail sans alcool', 'Sur base de fruits frais, herbes et agrumes.', array['VG'], 7);


-- ============================================================
-- PIÈCES COCKTAIL (12 au choix)
-- ============================================================
insert into items (step_id, name, description, labels, category, position) values
(s_pieces, 'Mini verrine de poulpes grillés, crème de maïs à la citronnelle', 'Fraîche et parfumée.', array['SG'], 'Verrines & gaspachos', 1),
(s_pieces, 'Panna cotta de foie gras et chutney de fruits', 'Douceur et gourmandise.', array['SG'], 'Panna cottas', 2),
(s_pieces, 'Escargots de ma grand-mère en persillade', 'La recette familiale, beurre persillé.', array['SG'], 'Pièces chaudes', 3),
(s_pieces, 'Mini burger de bœuf', 'Fondant et généreux.', array[]::text[], 'Mini burgers', 4),
(s_pieces, 'Mini burger de poulet au curry', 'Doucement épicé.', array[]::text[], 'Mini burgers', 5),
(s_pieces, 'Mini burger de saumon', 'Frais et iodé.', array[]::text[], 'Mini burgers', 6),
(s_pieces, 'Mini tomate cerise d''amour au sésame', 'Croquante et délicatement sucrée.', array['V','SG'], 'Fraîcheurs & tartares', 7),
(s_pieces, 'Mini verrine betterave et fromage frais', 'Douce et colorée.', array['V','SG'], 'Verrines & gaspachos', 8),
(s_pieces, 'Verrine de cervelle de canut et tartare de légumes', 'Pain croustillant. Déclinable en végétarien.', array['V','SG'], 'Verrines & gaspachos', 9),
(s_pieces, 'Brochette de canard, mangue et sauce miel', 'Sucré-salé.', array['SG'], 'Brochettes & sucettes', 10),
(s_pieces, 'Tartare de tomate, féta et melon basilic', 'Fraîcheur méditerranéenne.', array['V','SG'], 'Fraîcheurs & tartares', 11),
(s_pieces, 'Roulade d''aubergine, tomates confites et parmesan', 'Fondante et parfumée.', array['V','SG'], 'Fraîcheurs & tartares', 12),
(s_pieces, 'Sucette de saumon tataki, sauce soja et coriandre', 'Juste snacké.', array['SG'], 'Brochettes & sucettes', 13),
(s_pieces, 'Wrap de saumon fumé et concombre', 'Possible sans saumon.', array[]::text[], 'Fraîcheurs & tartares', 14),
(s_pieces, 'Mini cannelé chorizo, parmesan et crème d''aneth', 'Possible sans chorizo.', array['SG'], 'Pièces chaudes', 15),
(s_pieces, 'Mini pissaladière', 'Oignons confits et anchois.', array['V'], 'Pièces chaudes', 16),
(s_pieces, 'Mini verrine œuf mimosa et crevette', 'Possible sans crevette.', array['SG'], 'Verrines & gaspachos', 17),
(s_pieces, 'Panna cotta de courgette et chèvre frais', 'Légère et végétale.', array['V','SG'], 'Panna cottas', 18),
(s_pieces, 'Croque-monsieur au jambon truffé', 'Ou au pain de maïs.', array[]::text[], 'Pièces chaudes', 19),
(s_pieces, 'Mini navette au saumon fumé et tzatziki', 'Doux et frais.', array[]::text[], 'Pièces chaudes', 20),
(s_pieces, 'Chouquette au comté et crème de ciboulette', 'Salée et aérienne.', array['V'], 'Pièces chaudes', 21),
(s_pieces, 'Verrine avocat, crevette et pamplemousse', 'Possible sans crevette.', array['SG'], 'Verrines & gaspachos', 22),
(s_pieces, 'Crêpe vonnassienne, truite fumée et œufs de truite', 'Crème de Bresse.', array['SG'], 'Pièces chaudes', 23),
(s_pieces, 'Mini blinis au maïs, crème de fromage et maïs grillé', 'Doux et fumé.', array['V','SG'], 'Pièces chaudes', 24),
(s_pieces, 'Panna cotta tomate, estragon et olive noire', 'Fraîche et végétale.', array['V','SG'], 'Panna cottas', 25),
(s_pieces, 'Gaspacho de courgette, petit pois, menthe et roquette', 'Vif et rafraîchissant.', array['V','SG'], 'Verrines & gaspachos', 26),
(s_pieces, 'Pruneaux, cognac et magret ou lard fumé', 'Le classique sucré-fumé.', array['SG'], 'Pièces chaudes', 27),
(s_pieces, 'Brochette melon et jambon cru', 'Sucré-salé de saison.', array['SG'], 'Brochettes & sucettes', 28),
(s_pieces, 'Gaspacho de tomate', 'Frais et parfumé.', array['V','SG'], 'Verrines & gaspachos', 29),
(s_pieces, 'Crostini façon pan con tomate et jambon cru', 'Pain grillé frotté à la tomate.', array[]::text[], 'Fraîcheurs & tartares', 30),
(s_pieces, 'Sucette de fromage frais, ciboulette, épices et noisette', 'Enrobage croquant.', array['V','SG'], 'Brochettes & sucettes', 31),
(s_pieces, 'Brochette de fromage sec et figue séchée', 'Douce et affinée.', array['V','SG'], 'Brochettes & sucettes', 32),
(s_pieces, 'Feuille de vigne', 'Note orientale, riz parfumé.', array['V'], 'Note orientale', 33),
(s_pieces, 'Verrine houmous, pignons de pin et basilic', 'Note orientale.', array['SG'], 'Note orientale', 34),
(s_pieces, 'Verrine féta, citron confit, tomate et olive', 'Note orientale.', array['V','SG'], 'Note orientale', 35),
(s_pieces, 'Verrine taboulé libanais', 'Note orientale, herbes fraîches.', array['V'], 'Note orientale', 36),
(s_pieces, 'Verrine tzatziki', 'Concombre, yaourt et menthe.', array['V','SG'], 'Note orientale', 37);


-- ============================================================
-- GRIGNOTAGE (inclus)
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_grign, 'Assortiment de feuilletés', 'Fromage, olive et anchois.', array[]::text[], 1),
(s_grign, 'Quiches', 'Pâte maison, garniture de saison.', array['V'], 2),
(s_grign, 'Pizzas', 'Fines et croustillantes.', array['V'], 3),
(s_grign, 'Pissaladière', 'Oignons confits et olives.', array['V'], 4);


-- ============================================================
-- ANIMATION PLANCHA (1 ou 2 au choix)
-- ============================================================
insert into items (step_id, name, description, supplement, labels, position) values
(s_anim, 'Volaille grillée à la crème de Bresse bleu', 'Grillée minute devant vos invités.', 0, array[]::text[], 1),
(s_anim, 'Gambas snackées, marmelade de mangue', 'Safran et piment d''Espelette.', 0, array['SG'], 2),
(s_anim, 'Brochette de volaille Teriyaki', 'Laquée à la sauce Teriyaki.', 0, array[]::text[], 3),
(s_anim, 'Saint-Jacques snackées', 'Juste saisies à la plancha.', 1.00, array['SG'], 4),
(s_anim, 'Foie gras, fondue d''oignons', 'Poêlé minute.', 1.50, array['SG'], 5);


-- ============================================================
-- PLAT (1 au choix — viande / poisson / végétarien)
-- ============================================================
insert into items (step_id, name, description, supplement, labels, category, position) values
(s_plat, 'Poulet fermier au jus', 'À la crème, aux cèpes, ou aux morilles (supplément 3 €/pers).', 0, array[]::text[], 'Viande', 1),
(s_plat, 'Pavé de bœuf charolais, sauce marchand de vin', 'Ou sauce bourguignonne. Morilles +3 €/pers.', 3.00, array[]::text[], 'Viande', 2),
(s_plat, 'Poitrine de veau rôtie 7 heures au jus', 'Cèpes, citron, câpres, olive. Morilles +3 €/pers.', 0, array[]::text[], 'Viande', 3),
(s_plat, 'Blanquette de veau ou de volaille', 'Cèpes, citron, câpres, olive.', 0, array[]::text[], 'Viande', 4),
(s_plat, 'Souris d''agneau confite au jus', 'Fondante, confite lentement.', 2.50, array['SG'], 'Viande', 5),
(s_plat, 'Cochon de lait à la broche', 'Pommes de terre rôties et légumes grillés.', 3.00, array['SG'], 'Viande', 6),
(s_plat, 'Pavé de saumon laqué à la japonaise', 'Sauce thym et citron.', 0, array['SG'], 'Poisson', 7),
(s_plat, 'Blanquette de poisson, moules et crevettes', 'Généreuse et parfumée.', 0, array['SG'], 'Poisson', 8),
(s_plat, 'Quenelle de cabillaud et Saint-Jacques', 'Façon cocon lyonnais, sauce américaine.', 0, array[]::text[], 'Poisson', 9),
(s_plat, 'Risotto aux légumes de saison et œuf', 'Option végétarienne.', 0, array['V'], 'Végétarien', 10),
(s_plat, 'Curry de légumes, riz gourmand et tofu artisanal', 'Option végétarienne.', 0, array['V','VG'], 'Végétarien', 11),
(s_plat, 'Vierge de tomates au basilic, minestrone de pâtes', 'Option végétarienne.', 0, array['V'], 'Végétarien', 12);


-- ============================================================
-- FÉCULENT (1 au choix)
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_feculent, 'Gratin dauphinois', 'Ou pomme boulangère (sans crème).', array['V','SG'], 1),
(s_feculent, 'Pommes de terre nouvelles rôties', 'Croustillantes aux herbes.', array['V','VG','SG'], 2),
(s_feculent, 'Riz gourmand', 'Riz sauvage, blanc et rouge.', array['V','VG','SG'], 3),
(s_feculent, 'Boulgour aux herbes et tomate', 'Parfumé et léger.', array['V','VG'], 4),
(s_feculent, 'Semoule aux herbes et fruits secs', 'Douce et généreuse.', array['V','VG'], 5);


-- ============================================================
-- LÉGUME (1 au choix)
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_legume, 'Wok de légumes verts', 'Sautés minute et croquants.', array['V','VG','SG'], 1),
(s_legume, 'Carottes glacées', 'Fondantes et brillantes.', array['V','SG'], 2),
(s_legume, 'Légumes rôtis', 'Aubergines, courgettes, carottes, tomates confites.', array['V','VG','SG'], 3),
(s_legume, 'Flan de légumes', 'Doux et fondant.', array['V','SG'], 4);


-- ============================================================
-- FROMAGE (1 au choix)
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_fromage, 'Trilogie de fromages secs du marché', 'Confiture maison et pain aux fruits secs.', array['V'], 1),
(s_fromage, 'Fromage blanc et son coulis', 'Frais et léger.', array['V','SG'], 2);


-- ============================================================
-- DESSERT (1 au choix)
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_dessert, 'Entremet chocolat-framboise sur biscuit breton', 'Coulis et cascade de fruits rouges, tuile à l''orange.', array['V'], 1),
(s_dessert, 'Fraisier citron vert, mascarpone et basilic', 'Coulis et fruits rouges, tuile à l''orange.', array['V'], 2),
(s_dessert, 'Nougat glacé au miel et pistache', 'Coulis de fruits rouges, tuile à l''orange.', array['V'], 3),
(s_dessert, 'Bavarois framboise-pistache', 'Coulis et fruits rouges, tuile à l''orange.', array['V'], 4),
(s_dessert, 'Entremet tout chocolat, crème anglaise', 'Tuile à l''orange.', array['V'], 5),
(s_dessert, 'Tarte citron meringuée du Chef', 'Acidulée et gourmande.', array['V'], 6),
(s_dessert, 'Tatin caramélisée aux pommes, crème de Bresse', 'Le classique revisité.', array['V'], 7);


-- ============================================================
-- CAFÉ & MIGNARDISES (inclus — rien à choisir)
-- Les mignardises sont un assortiment maison servi avec le café.
-- ============================================================
insert into items (step_id, name, description, labels, position) values
(s_cafe, 'Café, thé & infusions', '1 café servi à table, puis café (capsule), thé et infusions en libre-service toute la soirée.', array['V'], 1),
(s_cafe, 'Nos mignardises maison', 'Un assortiment de petites douceurs préparées par nos soins et servies avec le café : choux vanille, tartelettes, macarons, cannelés… selon l''inspiration du chef.', array['V'], 2);

end $$;


-- ============================================================
-- OPTIONS (présentation fromage, suppléments dessert, bar, en-cas,
-- boissons, services, brunch). Prix d'exemple à affiner.
-- ============================================================
insert into options (slug, category, name, description, price, price_unit, position) values
-- Présentation du fromage
('fromage-plateau', 'fromage', 'Plateau de fromages prédécoupé sur table', 'Présenté et prédécoupé, servi directement sur les tables.', 1.50, 'par_personne', 1),
('fromage-pyramide', 'fromage', 'Pyramide de fromages au buffet', 'Présentée et servie en buffet.', 2.00, 'par_personne', 2),

-- Suppléments dessert
('piece-montee-choux', 'dessert', 'Pièce montée de choux', 'Un chou par personne, crème pâtissière vanille, caramel et nougatine.', 2.00, 'par_personne', 3),
('piece-montee-macarons', 'dessert', 'Pièce montée de macarons', 'Un macaron par personne, 3 parfums au choix.', 2.00, 'par_personne', 4),
('wedding-cake', 'dessert', 'Wedding cake', 'Gâteau à étages, décor personnalisé (sur devis).', 350, 'forfait', 5),
('dessert-buffet-gateaux', 'dessert', 'Présentation en buffet des gâteaux, avec les mariés', 'Tous les gâteaux dressés en buffet et dévoilés avec les mariés.', 0, 'par_personne', 6),

-- Animations (cocktail + brasero) — prix d'exemple
('anim-huitres', 'animation', 'Bar à huîtres', 'Un écailler sur place, huîtres ouvertes minute pendant le cocktail.', 6, 'par_personne', 20),
('anim-serrano', 'animation', 'Bar à jambon serrano', 'Jambon serrano tranché à la découpe devant vos invités.', 5, 'par_personne', 21),
('anim-brasero-cochon', 'animation', 'Brasero — cochon à la broche', 'Cochon rôti à la broche, découpé devant les invités. Location du bois et chef supplémentaire inclus.', 8, 'par_personne', 22),
('anim-brasero-broche', 'animation', 'Brasero — broche (viande au choix)', 'Bœuf, veau ou agneau à la broche, viande au choix. Location du bois et chef supplémentaire inclus.', 10, 'par_personne', 23),
('anim-brasero-bbq', 'animation', 'Brasero — barbecue', 'Grillades au feu de bois. Location du bois et chef supplémentaire inclus.', 7, 'par_personne', 24),

-- Bar de nuit
('bar-de-nuit', 'bar-de-nuit', 'Bar de nuit (service 2h)', 'Notre équipe assure le service pendant 2h. Les alcools ne sont pas compris — vous les fournissez, nous servons.', 250, 'forfait', 6),

-- En-cas de fin de soirée
('soupe-oignon', 'en-cas', 'Soupe à l''oignon', 'Préparée et tenue au chaud, en libre-service en fin de soirée.', 4.50, 'par_personne', 7),
('croque-monsieur', 'en-cas', 'Croque-monsieur', 'Préparés et tenus au chaud, en libre-service en fin de soirée.', 4.50, 'par_personne', 8),

-- Boissons
('fut-biere-kachmar', 'boissons', 'Fût de bière artisanale Kachmar', 'Blonde de Villefranche, 20 L. Machine et gobelets fournis.', 160, 'forfait', 9),
('fut-biere-belge', 'boissons', 'Fût de bière blonde belge (Pils)', '30 L. Machine offerte, livraison 120 €.', 110, 'forfait', 10),
('fontaine-champagne', 'boissons', 'Fontaine à champagne', 'Location, verrerie, installation et service.', 150, 'forfait', 11),

-- Services
('service-vins', 'services', 'Service de vos vins', 'Rafraîchissement et service de vos bouteilles sur la soirée.', 200, 'forfait', 12),
('service-petillant', 'services', 'Service de vos pétillants', 'Service dédié de vos vins effervescents.', 50, 'forfait', 13),

-- Brunch du lendemain
('brunch-classique', 'brunch', 'Brunch du lendemain — Buffet classique', 'Thé, café, jus pressés, pain, viennoiseries, salade composée, charcuterie, touche fromagère et fruits frais. Buffet sans service, livraison offerte.', 22, 'par_personne', 14),
('brunch-burger', 'brunch', 'Brunch du lendemain — Burger / Fish & Chips', 'Burger ou Fish & Chips party, 1 boisson/pers, verrine sucrée ou pâtisserie ou salade de fruits.', 25, 'par_personne', 15),
('brunch-grand', 'brunch', 'Brunch du lendemain — Grand buffet', 'Le buffet complet : viennoiseries, saumon gravlax, viandes froides, charcuterie, fromages, fruits… Installation et vaisselle comprises.', 37, 'par_personne', 16);


-- ============================================================
-- INCLUSIONS (toujours comprises dans la prestation)
-- ============================================================
insert into inclusions (group_label, label, position) values
('Vaisselle & verrerie', '5 verres par personne', 1),
('Vaisselle & verrerie', '3 couverts par personne', 2),
('Vaisselle & verrerie', '3 assiettes par personne', 3),
('Vaisselle & verrerie', 'Verrines en porcelaine ou en verre', 4),
('Nappage & linge', 'Nappage blanc tissé', 5),
('Nappage & linge', 'Serviettes blanches tissées', 6),
('Nappage & linge', 'Nappage de buffet blanc tissé', 7),
('Notre équipe', '2 cuisiniers par prestation', 8),
('Notre équipe', '1 maître d''hôtel qualifié', 9),
('Notre équipe', '1 serveur pour 25 convives', 10),
('Boissons & pain', 'Eaux Evian & Badoit en bouteille verre, à volonté', 11),
('Boissons & pain', 'Pain : portion individuelle + gros pain tranché', 12),
('Mise en place', 'Installation des buffets cocktail & softs, nappage compris', 13);
