-- ============================================================
-- LOT 2 — CONVERSION
-- • Brouillons côté serveur (status = 'draft') pour reprendre un menu
--   et relancer les couples qui abandonnent.
-- • Informations de recontact (téléphone, lieu, allergies, message),
--   attribution (source), consentement.
-- • Prix d'option vide = « Sur demande », 0 € = « Offert ».
-- • submit_composition() : envoi atomique, qui transforme le brouillon
--   en demande envoyée (même id) ou crée une nouvelle composition.
-- Purement additive : l'ancien front continue de fonctionner.
-- Idempotente : peut être rejouée sans erreur.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Compositions : nouvelles colonnes
-- ------------------------------------------------------------
alter table public.compositions add column if not exists venue text;              -- lieu de réception
alter table public.compositions add column if not exists dietary_notes text;      -- allergies et régimes
alter table public.compositions add column if not exists message text;
alter table public.compositions add column if not exists source text;             -- attribution (source ou utm_source)
alter table public.compositions add column if not exists landing_params jsonb;    -- paramètres d'arrivée (utm_*…)
alter table public.compositions add column if not exists last_step text;          -- dernière étape atteinte
alter table public.compositions add column if not exists reminder_sent_at timestamptz;
alter table public.compositions add column if not exists reminders_opt_out boolean not null default false;
alter table public.compositions add column if not exists consent_at timestamptz;  -- acceptation de la mention à l'envoi
alter table public.compositions add column if not exists client_state jsonb;      -- sélections, options, étape (brouillon)

-- Recherche des brouillons à relancer / des demandes récentes.
create index if not exists compositions_status_updated_at_idx
  on public.compositions (status, updated_at);

-- updated_at date la dernière ACTIVITÉ (du couple ou du traiteur) : c'est
-- lui qui fixe la fenêtre de relance (24 h à 7 jours d'inactivité). Les
-- colonnes de suivi technique (relance, désinscription, emails envoyés) ne
-- doivent donc pas le décaler : sinon un échec d'envoi repousserait la
-- relance de 24 h au lieu de la retenter à l'heure suivante.
create or replace function public.compositions_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  suivi text[] := array['updated_at', 'reminder_sent_at', 'reminders_opt_out', 'emails_sent_at'];
begin
  if (to_jsonb(new) - suivi) is not distinct from (to_jsonb(old) - suivi) then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.compositions_set_updated_at() from public, anon, authenticated;

drop trigger if exists compositions_set_updated_at on public.compositions;
create trigger compositions_set_updated_at
  before update on public.compositions
  for each row execute function public.compositions_set_updated_at();


-- ------------------------------------------------------------
-- 2. Journal anti-spam : compteurs séparés brouillons / envois
--    (un couple qui recommence ne doit pas se bloquer pour l'envoi)
-- ------------------------------------------------------------
alter table public.submission_log add column if not exists kind text not null default 'submit';

create index if not exists submission_log_ip_hash_kind_created_at_idx
  on public.submission_log (ip_hash, kind, created_at);


-- ------------------------------------------------------------
-- 3. Options : prix vide = « Sur demande », 0 € = « Offert »
-- ------------------------------------------------------------
alter table public.options alter column price drop not null;
-- Une option créée sans prix s'affiche « Sur demande » (et non « Offert »).
alter table public.options alter column price drop default;

-- Présentation des gâteaux en buffet : prix à chiffrer avec J&J.
update public.options set price = null
where slug = 'dessert-buffet-gateaux' and price = 0;


-- ------------------------------------------------------------
-- 4. Envoi ATOMIQUE d'une composition
--    • share_token d'un brouillon → ce brouillon passe en 'submitted'
--      (même id), ses plats et options sont remplacés ;
--    • sinon (pas de jeton, jeton inconnu ou déjà envoyé) → nouvelle
--      composition.
--    Appelée uniquement par l'Edge Function, avec des données validées
--    et un prix recalculé côté serveur.
-- ------------------------------------------------------------
create or replace function public.submit_composition(p jsonb)
returns table (id uuid, share_token text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_id    uuid;
  v_token text;
begin
  if nullif(p ->> 'share_token', '') is not null then
    update public.compositions c
    set formule_id     = (p ->> 'formule_id')::uuid,
        couple_names   = p ->> 'couple_names',
        email          = p ->> 'email',
        phone          = nullif(p ->> 'phone', ''),
        wedding_date   = nullif(p ->> 'wedding_date', '')::date,
        guest_count    = (p ->> 'guest_count')::integer,
        venue          = nullif(p ->> 'venue', ''),
        dietary_notes  = nullif(p ->> 'dietary_notes', ''),
        message        = nullif(p ->> 'message', ''),
        source         = coalesce(c.source, nullif(p ->> 'source', '')),
        landing_params = coalesce(c.landing_params, p -> 'landing_params'),
        total_estimate = (p ->> 'total_estimate')::numeric,
        status         = 'submitted',
        last_step      = 'envoye',
        consent_at     = now()
    where c.share_token = p ->> 'share_token'
      and c.status = 'draft'
    returning c.id, c.share_token into v_id, v_token;
  end if;

  if v_id is null then
    insert into public.compositions
      (formule_id, couple_names, email, phone, wedding_date, guest_count,
       venue, dietary_notes, message, source, landing_params,
       status, total_estimate, last_step, consent_at)
    values (
      (p ->> 'formule_id')::uuid,
      p ->> 'couple_names',
      p ->> 'email',
      nullif(p ->> 'phone', ''),
      nullif(p ->> 'wedding_date', '')::date,
      (p ->> 'guest_count')::integer,
      nullif(p ->> 'venue', ''),
      nullif(p ->> 'dietary_notes', ''),
      nullif(p ->> 'message', ''),
      nullif(p ->> 'source', ''),
      p -> 'landing_params',
      'submitted',
      (p ->> 'total_estimate')::numeric,
      'envoye',
      now()
    )
    returning compositions.id, compositions.share_token into v_id, v_token;
  else
    -- Le brouillon n'a normalement ni plats ni options enregistrés ;
    -- on repart de zéro par sécurité.
    delete from public.composition_items where composition_id = v_id;
    delete from public.composition_options where composition_id = v_id;
  end if;

  insert into public.composition_items (composition_id, item_id, quantity)
  select v_id, (e ->> 'item_id')::uuid, (e ->> 'quantity')::integer
  from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) as e;

  insert into public.composition_options (composition_id, option_id)
  select v_id, o::uuid
  from jsonb_array_elements_text(coalesce(p -> 'option_ids', '[]'::jsonb)) as o;

  return query select v_id, v_token;
end;
$$;

revoke all on function public.submit_composition(jsonb) from public, anon, authenticated;
grant execute on function public.submit_composition(jsonb) to service_role;

-- Note : create_composition() (lot 1) est conservée pour que l'ancienne
-- version de la fonction reste opérationnelle pendant la mise en production.
-- À supprimer dans un lot ultérieur.
