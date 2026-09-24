-- ============================================================
-- LE COMPOSEUR — Données de démonstration (6 demandes fictives)
-- À lancer APRÈS schema.sql + seed.sql + admin-setup.sql.
-- Sert à montrer le CRM et les stats déjà remplis.
-- (Supprimable plus tard : delete from compositions;)
-- ============================================================

-- Corrige le défaut de share_token ('base64url' n'est pas supporté par Postgres)
alter table compositions alter column share_token set default gen_random_uuid()::text;

do $$
declare
  f_signature uuid;
  f_emotion   uuid;
  f_harmonie  uuid;
  c uuid;
begin
  select id into f_signature from formules where slug = 'signature';
  select id into f_emotion   from formules where slug = 'emotion';
  select id into f_harmonie  from formules where slug = 'harmonie';

  -- 1. Camille & Alex — Signature — 120 conv.
  c := gen_random_uuid();
  insert into compositions (id, formule_id, couple_names, email, wedding_date, guest_count, status, total_estimate, handled, created_at)
  values (c, f_signature, 'Camille & Alex', 'camille.alex@exemple.fr', '2027-06-12', 120, 'submitted', 10560, false, now() - interval '2 days');
  insert into composition_items (composition_id, item_id, quantity)
  select c, id, 1 from items where name in (
    'Spritz','Bélini',
    'Escargots de ma grand-mère en persillade','Mini burger de bœuf','Panna cotta de foie gras et chutney de fruits',
    'Verrine tzatziki','Brochette de canard, mangue et sauce miel','Mini pissaladière','Gaspacho de tomate','Crostini façon pan con tomate et jambon cru',
    'Volaille grillée à la crème de Bresse bleu','Gambas snackées, marmelade de mangue',
    'Pavé de bœuf charolais, sauce marchand de vin','Gratin dauphinois','Wok de légumes verts',
    'Trilogie de fromages secs du marché','Entremet chocolat-framboise sur biscuit breton');

  -- 2. Léa & Thomas — Émotion — 90 conv. (traité)
  c := gen_random_uuid();
  insert into compositions (id, formule_id, couple_names, email, wedding_date, guest_count, status, total_estimate, handled, created_at)
  values (c, f_emotion, 'Léa & Thomas', 'lea.thomas@exemple.fr', '2027-07-04', 90, 'submitted', 6300, true, now() - interval '6 days');
  insert into composition_items (composition_id, item_id, quantity)
  select c, id, 1 from items where name in (
    'Punch façon mojito',
    'Escargots de ma grand-mère en persillade','Mini burger de bœuf','Mini burger de saumon',
    'Verrine houmous, pignons de pin et basilic','Sucette de saumon tataki, sauce soja et coriandre','Chouquette au comté et crème de ciboulette','Mini blinis au maïs, crème de fromage et maïs grillé','Tartare de tomate, féta et melon basilic',
    'Brochette de volaille Teriyaki',
    'Poulet fermier au jus','Gratin dauphinois','Wok de légumes verts',
    'Entremet chocolat-framboise sur biscuit breton');

  -- 3. Marie & Julien — Signature — 150 conv.
  c := gen_random_uuid();
  insert into compositions (id, formule_id, couple_names, email, wedding_date, guest_count, status, total_estimate, handled, created_at)
  values (c, f_signature, 'Marie & Julien', 'marie.julien@exemple.fr', '2027-09-20', 150, 'submitted', 12900, false, now() - interval '11 days');
  insert into composition_items (composition_id, item_id, quantity)
  select c, id, 1 from items where name in (
    'Spritz','Soupe champenoise',
    'Escargots de ma grand-mère en persillade','Panna cotta de foie gras et chutney de fruits','Mini burger de bœuf','Brochette melon et jambon cru',
    'Verrine tzatziki','Roulade d''aubergine, tomates confites et parmesan','Crêpe vonnassienne, truite fumée et œufs de truite','Mini cannelé chorizo, parmesan et crème d''aneth',
    'Saint-Jacques snackées','Foie gras, fondue d''oignons',
    'Poulet fermier au jus','Riz gourmand','Légumes rôtis',
    'Trilogie de fromages secs du marché','Nougat glacé au miel et pistache');

  -- 4. Sarah & Kevin — Harmonie — 80 conv.
  c := gen_random_uuid();
  insert into compositions (id, formule_id, couple_names, email, wedding_date, guest_count, status, total_estimate, handled, created_at)
  values (c, f_harmonie, 'Sarah & Kevin', 'sarah.kevin@exemple.fr', '2027-05-30', 80, 'submitted', 3200, false, now() - interval '18 days');
  insert into composition_items (composition_id, item_id, quantity)
  select c, id, 1 from items where name in (
    'Mojito « J&J »','Cocktail sans alcool',
    'Mini burger de bœuf','Mini burger de poulet au curry','Escargots de ma grand-mère en persillade','Verrine féta, citron confit, tomate et olive',
    'Gaspacho de courgette, petit pois, menthe et roquette','Mini tomate cerise d''amour au sésame','Brochette de fromage sec et figue séchée','Sucette de fromage frais, ciboulette, épices et noisette',
    'Volaille grillée à la crème de Bresse bleu');

  -- 5. Emma & Lucas — Émotion — 110 conv. (traité)
  c := gen_random_uuid();
  insert into compositions (id, formule_id, couple_names, email, wedding_date, guest_count, status, total_estimate, handled, created_at)
  values (c, f_emotion, 'Emma & Lucas', 'emma.lucas@exemple.fr', '2027-08-15', 110, 'submitted', 7975, true, now() - interval '26 days');
  insert into composition_items (composition_id, item_id, quantity)
  select c, id, 1 from items where name in (
    'Pim''s','Bélini',
    'Mini burger de bœuf','Escargots de ma grand-mère en persillade','Verrine tzatziki','Panna cotta de courgette et chèvre frais',
    'Wrap de saumon fumé et concombre','Mini navette au saumon fumé et tzatziki','Gaspacho de tomate','Brochette de canard, mangue et sauce miel',
    'Gambas snackées, marmelade de mangue',
    'Souris d''agneau confite au jus','Gratin dauphinois','Carottes glacées',
    'Fraisier citron vert, mascarpone et basilic');

  -- 6. Chloé & Maxime — Signature — 100 conv.
  c := gen_random_uuid();
  insert into compositions (id, formule_id, couple_names, email, wedding_date, guest_count, status, total_estimate, handled, created_at)
  values (c, f_signature, 'Chloé & Maxime', 'chloe.maxime@exemple.fr', '2027-10-03', 100, 'submitted', 8500, false, now() - interval '40 days');
  insert into composition_items (composition_id, item_id, quantity)
  select c, id, 1 from items where name in (
    'Spritz',
    'Escargots de ma grand-mère en persillade','Mini burger de bœuf','Verrine taboulé libanais','Feuille de vigne',
    'Tartare de tomate, féta et melon basilic','Panna cotta de foie gras et chutney de fruits','Pruneaux, cognac et magret ou lard fumé','Crostini façon pan con tomate et jambon cru',
    'Brochette de volaille Teriyaki','Volaille grillée à la crème de Bresse bleu',
    'Pavé de saumon laqué à la japonaise','Gratin dauphinois','Wok de légumes verts',
    'Fromage blanc et son coulis','Entremet chocolat-framboise sur biscuit breton');

end $$;
