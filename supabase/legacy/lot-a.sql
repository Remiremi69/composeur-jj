-- ============================================================
-- LE COMPOSEUR — Lot A : transparence & inclusions
-- Additif : à lancer une fois, ne casse rien.
-- ============================================================

-- ------------------------------------------------------------
-- Table des inclusions (vaisselle, service, équipe…)
-- Éditable par le traiteur, affichée sur la page Options.
-- ------------------------------------------------------------
create table if not exists inclusions (
  id           uuid primary key default gen_random_uuid(),
  group_label  text not null,        -- ex : "Vaisselle & verrerie"
  label        text not null,        -- ex : "5 verres par personne"
  position     int not null default 0,
  is_active    bool default true
);

alter table inclusions enable row level security;
drop policy if exists "inclusions_public_read" on inclusions;
create policy "inclusions_public_read" on inclusions for select using (is_active = true);

delete from inclusions;
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


-- ------------------------------------------------------------
-- Café : détail + on retire eaux et pain (déplacés en inclusions)
-- ------------------------------------------------------------
delete from items
  where step_id = (select id from steps where slug = 'cafe')
    and name in ('Eau plate et gazeuse', 'Pain');

update items
  set name = 'Café, thé & infusions',
      description = '1 café servi à table, puis café (capsule), thé et infusions en libre-service toute la soirée. Mignardises incluses.'
  where step_id = (select id from steps where slug = 'cafe')
    and name = 'Café, thé et mignardises';
