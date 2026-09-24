-- ============================================================
-- LE COMPOSEUR — Schéma Supabase v3 (catalogue complet J&J)
-- À exécuter dans l'éditeur SQL de Supabase, PUIS seed.sql
-- Reconstruction propre (aucune vraie composition à ce stade).
-- ============================================================

drop table if exists composition_options cascade;
drop table if exists composition_items cascade;
drop table if exists compositions cascade;
drop table if exists options cascade;
drop table if exists items cascade;
drop table if exists steps cascade;
drop table if exists formules cascade;

create extension if not exists "pgcrypto";


-- ------------------------------------------------------------
-- FORMULES — les 3 packs présentés au départ (prix par personne)
-- ------------------------------------------------------------
create table formules (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  subtitle          text,
  price_per_person  numeric(10,2) not null default 0,
  included_steps    text[] default '{}',   -- slugs des étapes incluses
  highlights        text[] default '{}',   -- lignes "ce qui est inclus" (affichage carte)
  step_rules        jsonb not null default '{}'::jsonb,  -- surcharges de règles par étape (ex : {"pieces-cocktail":{"min":4,"max":4}})
  position          int not null default 0,
  is_active         bool default true
);


-- ------------------------------------------------------------
-- STEPS — Étapes du parcours (ordre du repas)
-- ------------------------------------------------------------
create table steps (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  subtitle     text,
  position     int not null,
  rule_type    text not null check (rule_type in ('exact_count','pick_one','pick_range','free')),
  rule_min     int,
  rule_max     int,
  unit_label   text
);


-- ------------------------------------------------------------
-- ITEMS — Plats du catalogue (inclus dans la formule + supplément)
-- ------------------------------------------------------------
create table items (
  id           uuid primary key default gen_random_uuid(),
  step_id      uuid not null references steps(id) on delete cascade,
  name         text not null,
  description  text,
  photo_url    text,
  price        numeric(10,2) not null default 0,
  price_unit   text not null default 'par_personne'
               check (price_unit in ('par_piece','par_personne','forfait')),
  supplement   numeric(10,2) not null default 0,   -- +X € / personne
  labels       text[] default '{}',                -- régime : V, VG, SG
  category     text,                               -- sous-type dans l'étape (ex : "Verrines", "Viande")
  allergens    text[] default '{}',
  is_seasonal  bool default false,
  season_note  text,
  is_active    bool default true,
  position     int default 0
);


-- ------------------------------------------------------------
-- OPTIONS — Extras (présentation fromage, suppléments dessert,
-- bar de nuit, en-cas, boissons, services, brunch…)
-- ------------------------------------------------------------
create table options (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  category     text not null,          -- 'fromage' | 'dessert' | 'bar-de-nuit' | 'en-cas' | 'boissons' | 'services' | 'brunch'
  name         text not null,
  description  text,
  price        numeric(10,2) not null default 0,
  price_unit   text not null default 'par_personne'
               check (price_unit in ('par_personne','forfait')),
  position     int not null default 0,
  is_active    bool default true
);


-- ------------------------------------------------------------
-- INCLUSIONS — Ce qui est toujours compris (vaisselle, service, équipe…)
-- ------------------------------------------------------------
create table inclusions (
  id           uuid primary key default gen_random_uuid(),
  group_label  text not null,
  label        text not null,
  position     int not null default 0,
  is_active    bool default true
);


-- ------------------------------------------------------------
-- COMPOSITIONS — Une composition par couple
-- ------------------------------------------------------------
create table compositions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  formule_id      uuid references formules(id),
  couple_names    text,
  email           text,
  phone           text,
  wedding_date    date,
  guest_count     int,
  status          text not null default 'draft' check (status in ('draft','submitted')),
  total_estimate  numeric(10,2),
  handled         bool default false,   -- marqué "traité" par le traiteur
  share_token     text unique default gen_random_uuid()::text
);

create table composition_items (
  composition_id  uuid not null references compositions(id) on delete cascade,
  item_id         uuid not null references items(id) on delete cascade,
  quantity        int not null default 1,
  primary key (composition_id, item_id)
);

create table composition_options (
  composition_id  uuid not null references compositions(id) on delete cascade,
  option_id       uuid not null references options(id) on delete cascade,
  primary key (composition_id, option_id)
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table formules            enable row level security;
alter table steps               enable row level security;
alter table items               enable row level security;
alter table options             enable row level security;
alter table inclusions          enable row level security;
alter table compositions        enable row level security;
alter table composition_items   enable row level security;
alter table composition_options enable row level security;

-- Lecture publique du catalogue
create policy "formules_public_read" on formules for select using (is_active = true);
create policy "steps_public_read"    on steps    for select using (true);
create policy "items_public_read"    on items    for select using (is_active = true);
create policy "options_public_read"  on options  for select using (is_active = true);
create policy "inclusions_public_read" on inclusions for select using (is_active = true);

-- Compositions : insertion publique
create policy "compositions_public_insert" on compositions for insert with check (true);
create policy "composition_items_public_insert" on composition_items for insert with check (true);
create policy "composition_options_public_insert" on composition_options for insert with check (true);

-- Lecture / mise à jour via le lien magique (share_token)
create policy "compositions_token_read" on compositions for select
  using (share_token = current_setting('app.share_token', true));
create policy "compositions_token_update" on compositions for update
  using (share_token = current_setting('app.share_token', true));
create policy "composition_items_token_read" on composition_items for select
  using (exists (select 1 from compositions c
    where c.id = composition_id and c.share_token = current_setting('app.share_token', true)));
create policy "composition_options_token_read" on composition_options for select
  using (exists (select 1 from compositions c
    where c.id = composition_id and c.share_token = current_setting('app.share_token', true)));

-- Back-office : l'admin authentifié lit tout et met à jour le statut.
create policy "compositions_admin_read" on compositions for select to authenticated using (true);
create policy "compositions_admin_update" on compositions for update to authenticated using (true);
create policy "composition_items_admin_read" on composition_items for select to authenticated using (true);
create policy "composition_options_admin_read" on composition_options for select to authenticated using (true);
