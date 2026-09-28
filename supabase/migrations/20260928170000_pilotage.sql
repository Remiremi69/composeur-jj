-- ============================================================
-- LOT 5 — PILOTAGE
-- • Suivi commercial (CRM) : statut, motif de perte, date de premier contact
-- • Historique : notes internes + changements de statut enregistrés
--   automatiquement (colonnes structurées from_status / to_status)
-- • Détail du prix figé à l'envoi (estimate), compositions de test (is_test)
-- • Preuve sociale : popular_items(), popular_formule() (seuil de 10 menus)
-- • formules.audience (« pour qui »)
-- Idempotente : peut être relancée sans effet de bord.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Colonnes de suivi sur compositions
-- ------------------------------------------------------------
alter table public.compositions add column if not exists crm_status text not null default 'nouveau';
alter table public.compositions add column if not exists lost_reason text;
alter table public.compositions add column if not exists contacted_at timestamptz;  -- premier contact
alter table public.compositions add column if not exists estimate jsonb;            -- détail du prix à l'envoi
alter table public.compositions add column if not exists is_test boolean not null default false;

alter table public.compositions drop constraint if exists compositions_crm_status_check;
alter table public.compositions add constraint compositions_crm_status_check
  check (crm_status in ('nouveau', 'contacte', 'degustation', 'devis_envoye', 'signe', 'perdu'));

alter table public.compositions drop constraint if exists compositions_lost_reason_check;
alter table public.compositions add constraint compositions_lost_reason_check
  check (lost_reason is null
         or lost_reason in ('prix', 'date_indisponible', 'autre_traiteur', 'sans_reponse', 'autre'));

-- Une demande perdue a toujours un motif.
alter table public.compositions drop constraint if exists compositions_perdu_motif_check;
alter table public.compositions add constraint compositions_perdu_motif_check
  check (crm_status <> 'perdu' or lost_reason is not null);

create index if not exists compositions_status_crm_idx
  on public.compositions (status, crm_status) where not is_test;


-- ------------------------------------------------------------
-- 2. Reprise de l'ancien booléen « traité » (AVANT la création des
--    déclencheurs : pas d'historique ni de date de contact inventés)
-- ------------------------------------------------------------
update public.compositions
   set crm_status = 'contacte'
 where handled is true
   and crm_status = 'nouveau';


-- ------------------------------------------------------------
-- 3. Notes internes et historique des statuts
-- ------------------------------------------------------------
create table if not exists public.composition_notes (
  id             uuid primary key default gen_random_uuid(),
  composition_id uuid not null references public.compositions (id) on delete cascade,
  author_id      uuid default auth.uid() references auth.users (id) on delete set null,
  author_email   text default (auth.jwt() ->> 'email'),  -- affichage de l'auteur
  kind           text not null default 'note',
  body           text,
  from_status    text,
  to_status      text,
  created_at     timestamptz not null default now(),
  constraint composition_notes_kind_check check (kind in ('note', 'statut')),
  -- une note a un texte ; un changement de statut a un statut d'arrivée
  constraint composition_notes_content_check check (
    (kind = 'note' and body is not null and length(btrim(body)) between 1 and 5000)
    or (kind = 'statut' and to_status is not null)
  )
);

create index if not exists composition_notes_composition_idx
  on public.composition_notes (composition_id, created_at);

alter table public.composition_notes enable row level security;

-- Lecture et ajout réservés aux admins. Pas de modification ni de
-- suppression : l'historique ne se réécrit pas. Les lignes « statut » ne sont
-- écrites que par le déclencheur ci-dessous.
drop policy if exists composition_notes_admin_select on public.composition_notes;
create policy composition_notes_admin_select on public.composition_notes
  for select to authenticated
  using (public.is_admin());

drop policy if exists composition_notes_admin_insert on public.composition_notes;
create policy composition_notes_admin_insert on public.composition_notes
  for insert to authenticated
  with check (public.is_admin() and kind = 'note' and author_id = auth.uid()
              and author_email is not distinct from (auth.jwt() ->> 'email'));

revoke all on table public.composition_notes from anon;


-- ------------------------------------------------------------
-- 4. Déclencheurs du statut
-- ------------------------------------------------------------
-- Avant : date de premier contact, motif de perte effacé si on sort de « perdu ».
create or replace function public.compositions_crm_before()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.crm_status is distinct from old.crm_status then
    if new.crm_status <> 'perdu' then
      new.lost_reason := null;
    end if;
    -- Premier contact : en sortant de « nouveau » vers une étape active.
    if old.crm_status = 'nouveau'
       and new.crm_status in ('contacte', 'degustation', 'devis_envoye', 'signe')
       and new.contacted_at is null then
      new.contacted_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- Après : historique structuré (from_status → to_status, auteur, date).
create or replace function public.compositions_crm_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.crm_status is distinct from old.crm_status then
    insert into public.composition_notes (composition_id, author_id, author_email, kind, from_status, to_status, body)
    values (new.id, auth.uid(), auth.jwt() ->> 'email', 'statut', old.crm_status, new.crm_status,
            case when new.crm_status = 'perdu' then new.lost_reason end);
  end if;
  return new;
end;
$$;

revoke all on function public.compositions_crm_before() from public, anon, authenticated;
revoke all on function public.compositions_crm_history() from public, anon, authenticated;

drop trigger if exists compositions_crm_before on public.compositions;
create trigger compositions_crm_before
  before update of crm_status on public.compositions
  for each row execute function public.compositions_crm_before();

drop trigger if exists compositions_crm_history on public.compositions;
create trigger compositions_crm_history
  after update of crm_status on public.compositions
  for each row execute function public.compositions_crm_history();


-- ------------------------------------------------------------
-- 5. updated_at : le suivi commercial n'est pas une activité du couple
--    (sinon marquer un brouillon « test » retarderait sa relance)
-- ------------------------------------------------------------
create or replace function public.compositions_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  suivi text[] := array['updated_at', 'reminder_sent_at', 'reminders_opt_out', 'emails_sent_at',
                        'handled', 'crm_status', 'lost_reason', 'contacted_at', 'estimate', 'is_test'];
begin
  if (to_jsonb(new) - suivi) is not distinct from (to_jsonb(old) - suivi) then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;


-- ------------------------------------------------------------
-- 6. Formules : la ligne « pour qui »
-- ------------------------------------------------------------
alter table public.formules add column if not exists audience text;


-- ------------------------------------------------------------
-- 7. Preuve sociale (lisible par le site public)
--    Ne renvoie que des identifiants, jamais de compteurs, et RIEN tant
--    qu'il y a moins de 10 menus envoyés (hors tests).
-- ------------------------------------------------------------
-- Les 3 plats les plus choisis de chaque étape (étapes de plus de 3 plats :
-- sinon tous les plats seraient « très demandés »).
create or replace function public.popular_items()
returns table (step_id uuid, item_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with envoyes as (
    select c.id from public.compositions c
     where c.status = 'submitted' and not c.is_test
  ),
  seuil as (
    select count(*) >= 10 as atteint from envoyes
  ),
  etapes as (
    select i.step_id from public.items i
     where i.is_active is not false
     group by i.step_id
    having count(*) > 3
  ),
  comptes as (
    select i.step_id, ci.item_id, count(*) as n
      from public.composition_items ci
      join envoyes e on e.id = ci.composition_id
      join public.items i on i.id = ci.item_id and i.is_active is not false
      join etapes s on s.step_id = i.step_id
     group by i.step_id, ci.item_id
  ),
  classes as (
    select step_id, item_id,
           row_number() over (partition by step_id order by n desc, item_id) as rang
      from comptes
  )
  select k.step_id, k.item_id
    from classes k, seuil
   where seuil.atteint and k.rang <= 3;
$$;

-- La formule la plus choisie, seulement si elle est seule en tête.
create or replace function public.popular_formule()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with envoyes as (
    select c.formule_id from public.compositions c
     where c.status = 'submitted' and not c.is_test
  ),
  comptes as (
    select f.id, count(*) as n
      from envoyes e
      join public.formules f on f.id = e.formule_id and f.is_active is not false
     group by f.id
  ),
  classes as (
    select id, n, lead(n) over (order by n desc) as suivant
      from comptes
     order by n desc
     limit 1
  )
  select k.id
    from classes k
   where (select count(*) from envoyes) >= 10
     and (k.suivant is null or k.n > k.suivant);
$$;

revoke all on function public.popular_items() from public;
revoke all on function public.popular_formule() from public;
grant execute on function public.popular_items() to anon, authenticated, service_role;
grant execute on function public.popular_formule() to anon, authenticated, service_role;
