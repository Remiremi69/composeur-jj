SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict ogQgRFGGGIa9Bng6fAHH8oXrLhH2RFLft3dRORKG6OefGw2zbC6iUX5dJv6ONcc

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: formules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."formules" ("id", "slug", "name", "subtitle", "price_per_person", "included_steps", "highlights", "position", "is_active", "step_rules") VALUES
	('ba357ba5-bc47-41e0-a01b-4052a451b16e', 'harmonie', 'Harmonie', 'Le cocktail à l''honneur : plus de pièces et d''animations, plus de temps pour trinquer', 110.00, '{format,boissons-vh,cocktail,pieces-cocktail,grignotage,animation,plat,feculent,legume,fromage,dessert,cafe}', '{"Vin d''honneur","· Citronnade, pièce chaude & feuilleté",—,Cocktail,"· 8 pièces au choix","· 2 planchas au choix",—,"Plat & accompagnement au choix",Fromage,—,Dessert,Café}', 1, true, '{"animation": {"max": 2, "min": 2}, "pieces-cocktail": {"max": 8, "min": 8}}'),
	('ef063861-ce5a-4f0a-a2ff-97dd64425130', 'emotion', 'Émotion', 'L''entre-deux : un cocktail plus fourni, un amuse-bouche, un repas resserré', 120.00, '{format,boissons-vh,cocktail,pieces-cocktail,grignotage,animation,plat,feculent,legume,fromage,dessert,cafe}', '{"Vin d''honneur","· Citronnade, pièce chaude & feuilleté",—,Cocktail,"· 6 pièces au choix","· 1 plancha au choix",—,"Amuse-bouche au choix",Fromage,—,Dessert,Café}', 2, true, '{"animation": {"max": 1, "min": 1}, "pieces-cocktail": {"max": 6, "min": 6}}'),
	('6de9c37f-4ccc-4d44-b633-54fa3ab4a3fa', 'signature', 'Signature', 'L''expérience à table : un cocktail, puis un repas complet, entrée comprise', 130.00, '{format,boissons-vh,cocktail,pieces-cocktail,grignotage,animation,plat,feculent,legume,fromage,dessert,cafe}', '{"Vin d''honneur","· Citronnade, pièce chaude & feuilleté",—,Cocktail,"· 4 pièces au choix","· 1 plancha au choix",—,"Entrée au choix","Plat & accompagnement au choix",Fromage,—,Dessert,Café}', 3, true, '{"animation": {"max": 1, "min": 1}, "pieces-cocktail": {"max": 4, "min": 4}}');


--
-- Data for Name: inclusions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inclusions" ("id", "group_label", "label", "position", "is_active") VALUES
	('778cf7ea-8b47-44a3-a459-96c163edbfeb', 'Vaisselle & verrerie', '5 verres par personne', 1, true),
	('ce592da6-7bdb-48dc-9f1a-daadb5a46f72', 'Vaisselle & verrerie', '3 couverts par personne', 2, true),
	('df20cdd3-194a-4b3b-9df3-6a2abc679b66', 'Vaisselle & verrerie', '3 assiettes par personne', 3, true),
	('1b572620-0be7-4a38-a894-3f0bedfd2db7', 'Vaisselle & verrerie', 'Verrines en porcelaine ou en verre', 4, true),
	('f509eeca-1cad-4799-89bc-cd2638b9b50f', 'Nappage & linge', 'Nappage blanc tissé', 5, true),
	('0ca7ca20-e049-43ab-a401-3df1b63d19cd', 'Nappage & linge', 'Serviettes blanches tissées', 6, true),
	('f6947e6e-8900-4e6f-bf0f-d609d525064f', 'Nappage & linge', 'Nappage de buffet blanc tissé', 7, true),
	('2b83ff39-fcd4-43fe-b266-2f186f71e851', 'Notre équipe', '2 cuisiniers par prestation', 8, true),
	('64848206-b925-4bd4-b048-5a5d49ab8721', 'Notre équipe', '1 maître d''hôtel qualifié', 9, true),
	('5cd4a323-8aed-4857-af01-52fe34d42fe3', 'Notre équipe', '1 serveur pour 25 convives', 10, true),
	('5d3b6770-5ad0-4be7-8941-bbb505a4970f', 'Boissons & pain', 'Eaux Evian & Badoit en bouteille verre, à volonté', 11, true),
	('cb4823e5-1504-462c-b1c1-b666e265cfb9', 'Boissons & pain', 'Pain : portion individuelle + gros pain tranché', 12, true),
	('4f2a5365-1106-481c-8425-f9bdd8db37f0', 'Mise en place', 'Installation des buffets cocktail & softs, nappage compris', 13, true);


--
-- Data for Name: steps; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."steps" ("id", "slug", "title", "subtitle", "position", "rule_type", "rule_min", "rule_max", "unit_label") VALUES
	('4b1fcd10-e9f6-457b-bcd5-467639b61783', 'boissons-vh', 'Vos boissons', 'Servies tout au long du vin d''honneur — incluses', 1, 'free', NULL, NULL, 'boissons'),
	('79478c7d-16f0-46da-b5e0-1b184b674fbb', 'cocktail', 'Votre cocktail', 'Un ou deux cocktails signature, avec ou sans alcool', 2, 'pick_range', 1, 2, 'cocktails'),
	('54c506cf-86bc-45b2-bc31-ad74f5263d1e', 'grignotage', 'Le grignotage', 'Feuilletés et douceurs salées en libre accès — inclus', 4, 'free', NULL, NULL, 'inclus'),
	('303d4f52-3527-4b54-8436-2c5f8cf97712', 'plat', 'Votre plat', 'Viande, poisson ou option végétarienne', 6, 'pick_one', 1, 1, 'plat'),
	('b777abd7-3cac-4d7c-ad3a-01f3aa7ac68b', 'feculent', 'Votre féculent', 'L''accompagnement gourmand de votre plat', 7, 'pick_one', 1, 1, 'féculent'),
	('c8a25d1f-49af-4264-a093-2800dac9209a', 'legume', 'Votre légume', 'La touche végétale de saison', 8, 'pick_one', 1, 1, 'légume'),
	('1dffbac1-1f86-4eae-917c-5cc9509d9ea7', 'fromage', 'Le fromage', 'Une sélection affinée du marché', 9, 'pick_one', 1, 1, 'choix'),
	('8460459e-65b3-40b3-a5b7-e49c7c6cde31', 'dessert', 'Votre dessert', 'Une part de gâteau au choix, servie avec coulis de fruits rouges, cascade de fruits et crème anglaise', 10, 'pick_one', 1, 1, 'dessert'),
	('09e5d868-8bea-423a-a8a1-539233def119', 'format', 'Format de réception', 'Comment souhaitez-vous accueillir et servir vos invités ?', 0, 'pick_one', 1, 1, 'format'),
	('b41a8670-080a-4879-b23a-fd99635d9a85', 'cafe', 'Café & mignardises', 'Pour clôturer en douceur — tout est inclus, rien à choisir', 12, 'free', NULL, NULL, 'inclus'),
	('b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'pieces-cocktail', 'Vos pièces cocktail', 'Composez votre assortiment de pièces cocktail', 3, 'pick_range', 12, 12, 'pièces'),
	('f532a6a6-1d67-4356-aafa-479d2d42ec0f', 'animation', 'Animation plancha', 'Vos préparations grillées minute, devant vos invités', 5, 'pick_range', 1, 2, 'plancha');


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."items" ("id", "step_id", "name", "description", "photo_url", "price", "price_unit", "supplement", "labels", "category", "allergens", "is_seasonal", "season_note", "is_active", "position") VALUES
	('d91e3434-ae35-4a0f-b648-63b75cf8d63c', '4b1fcd10-e9f6-457b-bcd5-467639b61783', 'Evian & Perrier fine bulle', 'Eaux plate et pétillante, à volonté.', NULL, 0.00, 'par_personne', 0.00, '{VG,SG}', NULL, '{}', false, NULL, true, 1),
	('5c3519c5-93d2-4ad0-8e1c-beb8b7687339', '4b1fcd10-e9f6-457b-bcd5-467639b61783', 'Citronnade maison à la menthe', 'Préparée maison, fraîche et parfumée.', NULL, 0.00, 'par_personne', 0.00, '{VG,SG}', NULL, '{}', false, NULL, true, 2),
	('459c6969-fdb0-4320-9c7a-708e9b3d9bf9', '4b1fcd10-e9f6-457b-bcd5-467639b61783', 'Eaux aromatisées', 'Concombre-coriandre, thym-citron, céleri-menthe…', NULL, 0.00, 'par_personne', 0.00, '{VG,SG}', NULL, '{}', false, NULL, true, 3),
	('9a609fe1-26f8-4b4a-b94d-12fdbfe613c6', '4b1fcd10-e9f6-457b-bcd5-467639b61783', 'Jus de fruits artisanaux', 'Pomme, poire, coing… selon la saison.', NULL, 0.00, 'par_personne', 0.00, '{VG,SG}', NULL, '{}', false, NULL, true, 4),
	('ef4382f8-c078-43b9-8d09-bec58f402573', '79478c7d-16f0-46da-b5e0-1b184b674fbb', 'Punch façon mojito', 'Rhum, citron, citron vert, gingembre, menthe, coriandre et fruits.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 1),
	('42f96d69-0b9e-484f-8155-94128fcae935', '79478c7d-16f0-46da-b5e0-1b184b674fbb', 'Mojito « J&J »', 'Le mojito signature de la maison.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 2),
	('35578328-12c7-4729-af34-cac438ee1cb2', '79478c7d-16f0-46da-b5e0-1b184b674fbb', 'Pim''s', 'Liqueur de Pim''s, limonade, fraise, concombre, citron et menthe.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 3),
	('e54967e0-5bf1-4c4a-b413-2a2ab77fbf0d', '79478c7d-16f0-46da-b5e0-1b184b674fbb', 'Spritz', 'Apérol, prosecco et tonic San Pellegrino.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 4),
	('789b2183-2856-4dbe-97e7-6ae82e21b00e', '79478c7d-16f0-46da-b5e0-1b184b674fbb', 'Bélini', 'Crème de pêche blanche et prosecco.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 5),
	('f48c344e-5845-4827-9762-e8ab78cab7bb', '79478c7d-16f0-46da-b5e0-1b184b674fbb', 'Soupe champenoise', 'Crémant de Bourgogne, sucre de canne, citron vert, Cointreau et fruits.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 6),
	('e223f36a-fd15-4349-bac5-f08ec90caddf', '79478c7d-16f0-46da-b5e0-1b184b674fbb', 'Cocktail sans alcool', 'Sur base de fruits frais, herbes et agrumes.', NULL, 0.00, 'par_personne', 0.00, '{VG}', NULL, '{}', false, NULL, true, 7),
	('9fa7974c-37c4-4b5c-bde6-725f0af8f59e', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini verrine de poulpes grillés, crème de maïs à la citronnelle', 'Fraîche et parfumée.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Verrines & gaspachos', '{}', false, NULL, true, 1),
	('a8bd8614-f36e-4779-867c-ca5b18572ad1', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Panna cotta de foie gras et chutney de fruits', 'Douceur et gourmandise.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Panna cottas', '{}', false, NULL, true, 2),
	('37aad824-a5e7-40ba-bac4-9a5b32013dff', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Escargots de ma grand-mère en persillade', 'La recette familiale, beurre persillé.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Pièces chaudes', '{}', false, NULL, true, 3),
	('985ac055-0f00-4854-aba0-f8e92648894e', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini burger de bœuf', 'Fondant et généreux.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Mini burgers', '{}', false, NULL, true, 4),
	('ee1b6971-9d71-4da8-b836-ab8c74c7e0d0', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini burger de poulet au curry', 'Doucement épicé.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Mini burgers', '{}', false, NULL, true, 5),
	('927d79d9-ccba-4149-a577-8138dddbb899', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini burger de saumon', 'Frais et iodé.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Mini burgers', '{}', false, NULL, true, 6),
	('0754adc1-97af-4f31-8a2b-78a92b338415', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini tomate cerise d''amour au sésame', 'Croquante et délicatement sucrée.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Fraîcheurs & tartares', '{}', false, NULL, true, 7),
	('e9eda135-671a-4f06-bf89-9528ffe5976a', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini verrine betterave et fromage frais', 'Douce et colorée.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Verrines & gaspachos', '{}', false, NULL, true, 8),
	('189f2659-6cbd-4557-bf57-8e636a398a52', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Verrine de cervelle de canut et tartare de légumes', 'Pain croustillant. Déclinable en végétarien.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Verrines & gaspachos', '{}', false, NULL, true, 9),
	('bf6a92a7-dfc5-4cb4-a92a-d510413d173e', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Brochette de canard, mangue et sauce miel', 'Sucré-salé.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Brochettes & sucettes', '{}', false, NULL, true, 10),
	('154cad35-6df7-4897-8160-c1d4ebdb9baa', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Tartare de tomate, féta et melon basilic', 'Fraîcheur méditerranéenne.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Fraîcheurs & tartares', '{}', false, NULL, true, 11),
	('82db347b-f5b7-41d1-b1dc-e83c6afe22c6', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Roulade d''aubergine, tomates confites et parmesan', 'Fondante et parfumée.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Fraîcheurs & tartares', '{}', false, NULL, true, 12),
	('dcce0320-d4ec-4411-a565-ee0e5d440e6b', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Sucette de saumon tataki, sauce soja et coriandre', 'Juste snacké.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Brochettes & sucettes', '{}', false, NULL, true, 13),
	('6309b45b-1323-41b9-a558-1bcc3717a436', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Wrap de saumon fumé et concombre', 'Possible sans saumon.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Fraîcheurs & tartares', '{}', false, NULL, true, 14),
	('5764bb24-9823-4bd6-8239-eea4a1f60507', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini cannelé chorizo, parmesan et crème d''aneth', 'Possible sans chorizo.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Pièces chaudes', '{}', false, NULL, true, 15),
	('a2f04680-b884-4c65-b841-60394a8a5a7a', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini pissaladière', 'Oignons confits et anchois.', NULL, 0.00, 'par_personne', 0.00, '{V}', 'Pièces chaudes', '{}', false, NULL, true, 16),
	('a4c2d432-3115-4742-9ef5-56b464ebbd31', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini verrine œuf mimosa et crevette', 'Possible sans crevette.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Verrines & gaspachos', '{}', false, NULL, true, 17),
	('b4abf077-3ce6-451a-adc3-93057dd22f9e', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Panna cotta de courgette et chèvre frais', 'Légère et végétale.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Panna cottas', '{}', false, NULL, true, 18),
	('ec7de92c-a4ed-49f4-bf6d-a3d19a960f36', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Croque-monsieur au jambon truffé', 'Ou au pain de maïs.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Pièces chaudes', '{}', false, NULL, true, 19),
	('b44404ec-4c5a-41a8-8084-e7959b9948d0', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini navette au saumon fumé et tzatziki', 'Doux et frais.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Pièces chaudes', '{}', false, NULL, true, 20),
	('2739d720-bbff-4a80-b7da-927856f14e4a', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Chouquette au comté et crème de ciboulette', 'Salée et aérienne.', NULL, 0.00, 'par_personne', 0.00, '{V}', 'Pièces chaudes', '{}', false, NULL, true, 21),
	('fdd0f494-5373-4c74-b8ba-e9ac0a1fce94', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Verrine avocat, crevette et pamplemousse', 'Possible sans crevette.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Verrines & gaspachos', '{}', false, NULL, true, 22),
	('bbc0aab3-0c3d-4373-b23d-9f1e01a7821f', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Crêpe vonnassienne, truite fumée et œufs de truite', 'Crème de Bresse.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Pièces chaudes', '{}', false, NULL, true, 23),
	('66874829-0eaa-4891-9c3e-b7e9adb4c7bb', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Mini blinis au maïs, crème de fromage et maïs grillé', 'Doux et fumé.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Pièces chaudes', '{}', false, NULL, true, 24),
	('75874150-af38-4bd3-b486-aabf4878ee9e', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Panna cotta tomate, estragon et olive noire', 'Fraîche et végétale.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Panna cottas', '{}', false, NULL, true, 25),
	('96866d2d-1339-49aa-91e6-954e467c32bc', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Gaspacho de courgette, petit pois, menthe et roquette', 'Vif et rafraîchissant.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Verrines & gaspachos', '{}', false, NULL, true, 26),
	('32f930e6-d6bb-40f5-b7b4-a09ae17126d6', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Pruneaux, cognac et magret ou lard fumé', 'Le classique sucré-fumé.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Pièces chaudes', '{}', false, NULL, true, 27),
	('ff96b829-ad40-4074-9173-3182cdad416f', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Brochette melon et jambon cru', 'Sucré-salé de saison.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Brochettes & sucettes', '{}', false, NULL, true, 28),
	('d10e7395-2595-427b-9f53-d8fc817c0fa0', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Gaspacho de tomate', 'Frais et parfumé.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Verrines & gaspachos', '{}', false, NULL, true, 29),
	('7f3afb93-1285-4601-b2fe-9f9e301ea216', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Crostini façon pan con tomate et jambon cru', 'Pain grillé frotté à la tomate.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Fraîcheurs & tartares', '{}', false, NULL, true, 30),
	('d0842169-16ad-4f61-8bd3-d9ec3b4db36b', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Sucette de fromage frais, ciboulette, épices et noisette', 'Enrobage croquant.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Brochettes & sucettes', '{}', false, NULL, true, 31),
	('a1920fbb-b1c0-48e7-aed4-cd2d9e667388', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Brochette de fromage sec et figue séchée', 'Douce et affinée.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Brochettes & sucettes', '{}', false, NULL, true, 32),
	('92e9ff5e-2c45-4f16-a926-97be5fe39ae4', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Feuille de vigne', 'Note orientale, riz parfumé.', NULL, 0.00, 'par_personne', 0.00, '{V}', 'Note orientale', '{}', false, NULL, true, 33),
	('5ff0c2ea-fa81-41ba-a22a-5be3de606f66', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Verrine houmous, pignons de pin et basilic', 'Note orientale.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Note orientale', '{}', false, NULL, true, 34),
	('fe870142-57c3-4337-a8cf-1f7538461738', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Verrine féta, citron confit, tomate et olive', 'Note orientale.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Note orientale', '{}', false, NULL, true, 35),
	('7b89af99-8ef0-4eb1-b4fb-9e07f16ffb44', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Verrine taboulé libanais', 'Note orientale, herbes fraîches.', NULL, 0.00, 'par_personne', 0.00, '{V}', 'Note orientale', '{}', false, NULL, true, 36),
	('754188e1-e4a3-4667-b95e-f098c43bb359', 'b9ed38c5-8f06-4f72-abae-8f10e361d2b8', 'Verrine tzatziki', 'Concombre, yaourt et menthe.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', 'Note orientale', '{}', false, NULL, true, 37),
	('eefa4f56-9021-43f1-975e-48af1c92092f', '54c506cf-86bc-45b2-bc31-ad74f5263d1e', 'Assortiment de feuilletés', 'Fromage, olive et anchois.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 1),
	('80878fc4-452c-4c7c-b5c7-bbe00f2079a8', '54c506cf-86bc-45b2-bc31-ad74f5263d1e', 'Quiches', 'Pâte maison, garniture de saison.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 2),
	('7a4f9375-d65b-4fd2-be2f-d8ff94f240f0', '54c506cf-86bc-45b2-bc31-ad74f5263d1e', 'Pizzas', 'Fines et croustillantes.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 3),
	('96e28ca3-6532-41c1-bd5a-7f69431c888b', '54c506cf-86bc-45b2-bc31-ad74f5263d1e', 'Pissaladière', 'Oignons confits et olives.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 4),
	('b413bd1c-b6e9-44f7-9332-c0e689d81439', 'f532a6a6-1d67-4356-aafa-479d2d42ec0f', 'Volaille grillée à la crème de Bresse bleu', 'Grillée minute devant vos invités.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 1),
	('67ddfcfa-704e-4373-86fe-344ba72cbf23', 'f532a6a6-1d67-4356-aafa-479d2d42ec0f', 'Gambas snackées, marmelade de mangue', 'Safran et piment d''Espelette.', NULL, 0.00, 'par_personne', 0.00, '{SG}', NULL, '{}', false, NULL, true, 2),
	('3c8fe840-f8a5-4509-a92a-2698c8969e5d', 'f532a6a6-1d67-4356-aafa-479d2d42ec0f', 'Brochette de volaille Teriyaki', 'Laquée à la sauce Teriyaki.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 3),
	('a699686c-c631-4c95-b58f-75defed7e1c5', 'f532a6a6-1d67-4356-aafa-479d2d42ec0f', 'Saint-Jacques snackées', 'Juste saisies à la plancha.', NULL, 0.00, 'par_personne', 1.00, '{SG}', NULL, '{}', false, NULL, true, 4),
	('8540d37a-c003-4780-9cd7-e49b5e0b92f1', 'f532a6a6-1d67-4356-aafa-479d2d42ec0f', 'Foie gras, fondue d''oignons', 'Poêlé minute.', NULL, 0.00, 'par_personne', 1.50, '{SG}', NULL, '{}', false, NULL, true, 5),
	('356eb6a5-ba7d-406b-9ba8-ca244e979ce0', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Poulet fermier au jus', 'À la crème, aux cèpes, ou aux morilles (supplément 3 €/pers).', NULL, 0.00, 'par_personne', 0.00, '{}', 'Viande', '{}', false, NULL, true, 1),
	('f32279cc-6fa5-4d7b-bf3d-31839786ec6c', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Pavé de bœuf charolais, sauce marchand de vin', 'Ou sauce bourguignonne. Morilles +3 €/pers.', NULL, 0.00, 'par_personne', 3.00, '{}', 'Viande', '{}', false, NULL, true, 2),
	('1269ba15-881d-4e2b-a446-f24493551fc6', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Poitrine de veau rôtie 7 heures au jus', 'Cèpes, citron, câpres, olive. Morilles +3 €/pers.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Viande', '{}', false, NULL, true, 3),
	('3c2e5274-ca70-4882-8c46-797a10a92643', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Blanquette de veau ou de volaille', 'Cèpes, citron, câpres, olive.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Viande', '{}', false, NULL, true, 4),
	('a6581fc1-3ce2-4911-b99e-393fbf5d8583', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Souris d''agneau confite au jus', 'Fondante, confite lentement.', NULL, 0.00, 'par_personne', 2.50, '{SG}', 'Viande', '{}', false, NULL, true, 5),
	('cd72209e-2315-4621-ab88-03df19ab5ac0', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Cochon de lait à la broche', 'Pommes de terre rôties et légumes grillés.', NULL, 0.00, 'par_personne', 3.00, '{SG}', 'Viande', '{}', false, NULL, true, 6),
	('33f1c9fb-8465-4db3-8b49-641eb0609b07', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Pavé de saumon laqué à la japonaise', 'Sauce thym et citron.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Poisson', '{}', false, NULL, true, 7),
	('628c71c0-e2bd-44e0-ac5b-849ad44ccc96', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Blanquette de poisson, moules et crevettes', 'Généreuse et parfumée.', NULL, 0.00, 'par_personne', 0.00, '{SG}', 'Poisson', '{}', false, NULL, true, 8),
	('7253a4a0-7361-483b-bdec-b6d31dd2cb7f', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Quenelle de cabillaud et Saint-Jacques', 'Façon cocon lyonnais, sauce américaine.', NULL, 0.00, 'par_personne', 0.00, '{}', 'Poisson', '{}', false, NULL, true, 9),
	('329677e8-be3d-4f94-822f-29225363d006', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Risotto aux légumes de saison et œuf', 'Option végétarienne.', NULL, 0.00, 'par_personne', 0.00, '{V}', 'Végétarien', '{}', false, NULL, true, 10),
	('8c55558f-2320-4647-bd13-e5f27f24c5d1', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Curry de légumes, riz gourmand et tofu artisanal', 'Option végétarienne.', NULL, 0.00, 'par_personne', 0.00, '{V,VG}', 'Végétarien', '{}', false, NULL, true, 11),
	('0aa187cd-a9c8-4257-9ff9-6e25ea9f37b6', '303d4f52-3527-4b54-8436-2c5f8cf97712', 'Vierge de tomates au basilic, minestrone de pâtes', 'Option végétarienne.', NULL, 0.00, 'par_personne', 0.00, '{V}', 'Végétarien', '{}', false, NULL, true, 12),
	('76927f76-3c1b-4865-9e50-5daa94c0db85', 'b777abd7-3cac-4d7c-ad3a-01f3aa7ac68b', 'Gratin dauphinois', 'Ou pomme boulangère (sans crème).', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', NULL, '{}', false, NULL, true, 1),
	('8f34302a-5f03-4f53-853f-d190fcc54dc4', 'b777abd7-3cac-4d7c-ad3a-01f3aa7ac68b', 'Pommes de terre nouvelles rôties', 'Croustillantes aux herbes.', NULL, 0.00, 'par_personne', 0.00, '{V,VG,SG}', NULL, '{}', false, NULL, true, 2),
	('18fd19db-4c88-482b-9c8c-bc54827fddf8', 'b777abd7-3cac-4d7c-ad3a-01f3aa7ac68b', 'Riz gourmand', 'Riz sauvage, blanc et rouge.', NULL, 0.00, 'par_personne', 0.00, '{V,VG,SG}', NULL, '{}', false, NULL, true, 3),
	('35143187-f25f-4fe3-a858-8ebbf1dc0a81', 'b777abd7-3cac-4d7c-ad3a-01f3aa7ac68b', 'Boulgour aux herbes et tomate', 'Parfumé et léger.', NULL, 0.00, 'par_personne', 0.00, '{V,VG}', NULL, '{}', false, NULL, true, 4),
	('f91bf596-bfb3-4e51-9861-3733220d0020', 'b777abd7-3cac-4d7c-ad3a-01f3aa7ac68b', 'Semoule aux herbes et fruits secs', 'Douce et généreuse.', NULL, 0.00, 'par_personne', 0.00, '{V,VG}', NULL, '{}', false, NULL, true, 5),
	('7ed1d627-239e-48b8-857a-ed40305a9111', 'c8a25d1f-49af-4264-a093-2800dac9209a', 'Wok de légumes verts', 'Sautés minute et croquants.', NULL, 0.00, 'par_personne', 0.00, '{V,VG,SG}', NULL, '{}', false, NULL, true, 1),
	('5343e35e-99a0-49a6-8e74-cadf9568b2e2', 'c8a25d1f-49af-4264-a093-2800dac9209a', 'Carottes glacées', 'Fondantes et brillantes.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', NULL, '{}', false, NULL, true, 2),
	('3ad7d308-321b-4c37-9d86-81d54c6c378c', 'c8a25d1f-49af-4264-a093-2800dac9209a', 'Légumes rôtis', 'Aubergines, courgettes, carottes, tomates confites.', NULL, 0.00, 'par_personne', 0.00, '{V,VG,SG}', NULL, '{}', false, NULL, true, 3),
	('561f9463-8446-446f-9fe6-3e19dddc1401', 'c8a25d1f-49af-4264-a093-2800dac9209a', 'Flan de légumes', 'Doux et fondant.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', NULL, '{}', false, NULL, true, 4),
	('02872b41-3028-4225-af84-2b86f13b8ecf', '1dffbac1-1f86-4eae-917c-5cc9509d9ea7', 'Trilogie de fromages secs du marché', 'Confiture maison et pain aux fruits secs.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 1),
	('13357c40-c579-4d52-8e21-4bc9d5aa77b5', '1dffbac1-1f86-4eae-917c-5cc9509d9ea7', 'Fromage blanc et son coulis', 'Frais et léger.', NULL, 0.00, 'par_personne', 0.00, '{V,SG}', NULL, '{}', false, NULL, true, 2),
	('c668d6bb-04f2-4234-8cea-7b8e3bd9d5f7', '8460459e-65b3-40b3-a5b7-e49c7c6cde31', 'Entremet chocolat-framboise sur biscuit breton', 'Coulis et cascade de fruits rouges, tuile à l''orange.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 1),
	('00389f38-e68f-4124-a44a-42931fd99557', '8460459e-65b3-40b3-a5b7-e49c7c6cde31', 'Fraisier citron vert, mascarpone et basilic', 'Coulis et fruits rouges, tuile à l''orange.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 2),
	('1b2e229e-8abb-46fc-824c-c3014440683a', '8460459e-65b3-40b3-a5b7-e49c7c6cde31', 'Nougat glacé au miel et pistache', 'Coulis de fruits rouges, tuile à l''orange.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 3),
	('abaa710d-097d-4777-bd9f-ebd0b7d6b762', '8460459e-65b3-40b3-a5b7-e49c7c6cde31', 'Bavarois framboise-pistache', 'Coulis et fruits rouges, tuile à l''orange.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 4),
	('e2511f5c-f549-431b-9c93-52137ccb7164', '8460459e-65b3-40b3-a5b7-e49c7c6cde31', 'Entremet tout chocolat, crème anglaise', 'Tuile à l''orange.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 5),
	('078d74f3-312c-4dc5-9b3e-f8b96a26eb74', '8460459e-65b3-40b3-a5b7-e49c7c6cde31', 'Tarte citron meringuée du Chef', 'Acidulée et gourmande.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 6),
	('7d61ba73-ddc9-4e0d-bace-b1b2cda41ef5', '8460459e-65b3-40b3-a5b7-e49c7c6cde31', 'Tatin caramélisée aux pommes, crème de Bresse', 'Le classique revisité.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 7),
	('3fcef7bf-b9e5-4997-8d6f-43f23ba2da87', '09e5d868-8bea-423a-a8a1-539233def119', 'Service à table', 'Vos convives sont assis. Chaque assiette est dressée en cuisine et servie individuellement par notre équipe. L''expérience la plus raffinée.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 1),
	('6ed3cf05-337c-41d1-ba94-dba915344fdf', '09e5d868-8bea-423a-a8a1-539233def119', 'Banquet — service au plat', 'Vos convives sont assis. De grands plats généreux sont déposés sur chaque table : chacun se sert et partage, dans un esprit convivial.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 2),
	('acb8474e-3685-49f8-86db-63bc4125f4f3', '09e5d868-8bea-423a-a8a1-539233def119', 'Buffet convivial', 'Buffets en libre accès, avec mange-debout et places assises — pour un moment plus décontracté.', NULL, 0.00, 'par_personne', 0.00, '{}', NULL, '{}', false, NULL, true, 3),
	('e89e46f7-ac2f-4b8d-94da-dc706eaccffe', 'b41a8670-080a-4879-b23a-fd99635d9a85', 'Café, thé & infusions', '1 café servi à table, puis café (capsule), thé et infusions en libre-service toute la soirée.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 1),
	('4276ecc9-2c54-4367-bcf4-2d2d22f8dd82', 'b41a8670-080a-4879-b23a-fd99635d9a85', 'Nos mignardises maison', 'Un assortiment de petites douceurs préparées par nos soins et servies avec le café : choux vanille, tartelettes, macarons, cannelés… selon l''inspiration du chef.', NULL, 0.00, 'par_personne', 0.00, '{V}', NULL, '{}', false, NULL, true, 2);


--
-- Data for Name: options; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."options" ("id", "slug", "category", "name", "description", "price", "price_unit", "position", "is_active") VALUES
	('f489fea1-8d6e-4fe4-9cf1-80edd803e470', 'fromage-plateau', 'fromage', 'Plateau de fromages prédécoupé sur table', 'Présenté et prédécoupé, servi directement sur les tables.', 1.50, 'par_personne', 1, true),
	('9c43145d-fab3-4de8-9f84-bb65451649df', 'fromage-pyramide', 'fromage', 'Pyramide de fromages au buffet', 'Présentée et servie en buffet.', 2.00, 'par_personne', 2, true),
	('89ebd9be-b0c5-4589-9c30-addf42459f0e', 'piece-montee-choux', 'dessert', 'Pièce montée de choux', 'Un chou par personne, crème pâtissière vanille, caramel et nougatine.', 2.00, 'par_personne', 3, true),
	('ff3be942-3f02-4888-91c7-6d8c5dabf856', 'piece-montee-macarons', 'dessert', 'Pièce montée de macarons', 'Un macaron par personne, 3 parfums au choix.', 2.00, 'par_personne', 4, true),
	('1bdd3de8-02b0-4c77-b0af-46f010f77946', 'wedding-cake', 'dessert', 'Wedding cake', 'Gâteau à étages, décor personnalisé (sur devis).', 350.00, 'forfait', 5, true),
	('97eed751-d843-4aae-a410-8da48780c0ec', 'bar-de-nuit', 'bar-de-nuit', 'Bar de nuit (service 2h)', 'Notre équipe assure le service pendant 2h. Les alcools ne sont pas compris — vous les fournissez, nous servons.', 250.00, 'forfait', 6, true),
	('1f8d403a-e8cb-41ad-929c-a79074982b25', 'soupe-oignon', 'en-cas', 'Soupe à l''oignon', 'Préparée et tenue au chaud, en libre-service en fin de soirée.', 4.50, 'par_personne', 7, true),
	('865c71b1-529d-4b8a-82af-bad5fb8a69c8', 'croque-monsieur', 'en-cas', 'Croque-monsieur', 'Préparés et tenus au chaud, en libre-service en fin de soirée.', 4.50, 'par_personne', 8, true),
	('2c92285d-0eb6-40fa-a4e9-34a139ed7901', 'fut-biere-kachmar', 'boissons', 'Fût de bière artisanale Kachmar', 'Blonde de Villefranche, 20 L. Machine et gobelets fournis.', 160.00, 'forfait', 9, true),
	('61b4350e-10b1-4927-9d55-c2d977e38a05', 'fut-biere-belge', 'boissons', 'Fût de bière blonde belge (Pils)', '30 L. Machine offerte, livraison 120 €.', 110.00, 'forfait', 10, true),
	('92b9e8bd-cbaa-4df1-aa7a-7dd9b4dffd83', 'fontaine-champagne', 'boissons', 'Fontaine à champagne', 'Location, verrerie, installation et service.', 150.00, 'forfait', 11, true),
	('9bfe278e-d2d9-42ba-8219-2c3711e874c6', 'service-vins', 'services', 'Service de vos vins', 'Rafraîchissement et service de vos bouteilles sur la soirée.', 200.00, 'forfait', 12, true),
	('65ff2e15-2460-4e80-8392-88a8a05e684c', 'service-petillant', 'services', 'Service de vos pétillants', 'Service dédié de vos vins effervescents.', 50.00, 'forfait', 13, true),
	('59e22632-0857-4c5d-8684-bc88b1d6850e', 'brunch-classique', 'brunch', 'Brunch du lendemain — Buffet classique', 'Thé, café, jus pressés, pain, viennoiseries, salade composée, charcuterie, touche fromagère et fruits frais. Buffet sans service, livraison offerte.', 22.00, 'par_personne', 14, true),
	('f1662a0b-f85c-4921-b952-0e8dd2196739', 'brunch-burger', 'brunch', 'Brunch du lendemain — Burger / Fish & Chips', 'Burger ou Fish & Chips party, 1 boisson/pers, verrine sucrée ou pâtisserie ou salade de fruits.', 25.00, 'par_personne', 15, true),
	('b4822f68-c5be-4fe8-8f36-3564a06b2bdd', 'brunch-grand', 'brunch', 'Brunch du lendemain — Grand buffet', 'Le buffet complet : viennoiseries, saumon gravlax, viandes froides, charcuterie, fromages, fruits… Installation et vaisselle comprises.', 37.00, 'par_personne', 16, true),
	('2899c8aa-6d86-4b45-869d-c9193c31f562', 'dessert-buffet-gateaux', 'dessert', 'Présentation en buffet des gâteaux, avec les mariés', 'Tous les gâteaux dressés en buffet et dévoilés avec les mariés.', NULL, 'par_personne', 7, true),
	('f727d576-9e3c-4238-9e21-c6f097f56679', 'anim-huitres', 'animation', 'Bar à huîtres', 'Un écailler sur place, huîtres ouvertes minute pendant le cocktail.', 6.00, 'par_personne', 20, true),
	('487daeaa-1f40-4994-9c76-00a41c884470', 'anim-serrano', 'animation', 'Bar à jambon serrano', 'Jambon serrano tranché à la découpe devant vos invités.', 5.00, 'par_personne', 21, true),
	('f6b67253-e591-4509-a932-ee2dce704580', 'anim-brasero-cochon', 'animation', 'Brasero — cochon à la broche', 'Cochon rôti à la broche, découpé devant les invités. Location du bois et chef supplémentaire inclus.', 8.00, 'par_personne', 22, true),
	('77a9b727-c2a0-4767-896d-56772d65fa3b', 'anim-brasero-broche', 'animation', 'Brasero — broche (viande au choix)', 'Bœuf, veau ou agneau à la broche, viande au choix. Location du bois et chef supplémentaire inclus.', 10.00, 'par_personne', 23, true),
	('72493398-3d44-4aaf-87c4-678f5f52f379', 'anim-brasero-bbq', 'animation', 'Brasero — barbecue', 'Grillades au feu de bois. Location du bois et chef supplémentaire inclus.', 7.00, 'par_personne', 24, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict ogQgRFGGGIa9Bng6fAHH8oXrLhH2RFLft3dRORKG6OefGw2zbC6iUX5dJv6ONcc

RESET ALL;
