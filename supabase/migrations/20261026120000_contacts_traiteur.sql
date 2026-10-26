-- ============================================================
-- LE COMPOSEUR — Lot 7 : contacts ajoutés par le traiteur
--
-- • Un contact ajouté à la main (appel, salon, bouche-à-oreille…) est une
--   fiche ordinaire de compositions, marquée ajout_manuel, SANS menu :
--   pas de formule, pas de date d'envoi par le couple (consent_at vide).
-- • « Envoyer le configurateur » donne au couple le lien de reprise de
--   CETTE fiche : quand il envoie son menu, la même fiche se remplit
--   (une seule fiche par couple, historique et statut conservés).
-- • Règle à retenir partout : une fiche « sans menu » est
--       ajout_manuel and consent_at is null
--   Elle ne compte ni dans les menus envoyés, ni dans la preuve sociale.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Colonne
-- ------------------------------------------------------------
alter table public.compositions add column if not exists ajout_manuel boolean not null default false;

-- Recherche de doublons (téléphone, email) et liste « à rappeler ».
create index if not exists compositions_phone_idx on public.compositions (phone) where phone is not null;
create index if not exists compositions_email_lower_idx on public.compositions (lower(email)) where email is not null;


-- ------------------------------------------------------------
-- 2. Ajout d'un contact (réservé aux admins)
--    Les admins n'ont toujours aucun droit d'écriture directe : la fiche
--    et sa note sont écrites ici, en une fois.
--    Le téléphone arrive déjà normalisé (+33…) par l'interface.
-- ------------------------------------------------------------
create or replace function public.ajouter_contact(
  p_couple_names text,
  p_phone        text,
  p_email        text,
  p_wedding_date date,
  p_guest_count  integer,
  p_source       text,
  p_note         text,
  p_deja_appele  boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_names text := btrim(coalesce(p_couple_names, ''));
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'acces refuse' using errcode = '42501';
  end if;
  if length(v_names) not between 1 and 120 then
    raise exception 'prenoms invalides' using errcode = '22023';
  end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'telephone invalide' using errcode = '22023';
  end if;
  if p_email is not null and (length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'email invalide' using errcode = '22023';
  end if;
  if p_guest_count is not null and p_guest_count not between 1 and 2000 then
    raise exception 'convives invalides' using errcode = '22023';
  end if;
  if p_source not in ('telephone', 'bouche-a-oreille', 'instagram', 'salon', 'collectivite', 'autre') then
    raise exception 'origine invalide' using errcode = '22023';
  end if;
  if v_note is not null and length(v_note) > 5000 then
    raise exception 'note trop longue' using errcode = '22023';
  end if;

  insert into public.compositions
    (status, ajout_manuel, couple_names, phone, email, wedding_date, guest_count,
     source, crm_status, contacted_at, reminders_opt_out)
  values
    ('submitted', true, v_names, p_phone, nullif(btrim(coalesce(p_email, '')), ''), p_wedding_date, p_guest_count,
     p_source,
     case when p_deja_appele then 'contacte' else 'nouveau' end,
     case when p_deja_appele then now() end,
     true) -- relation gérée par J&J : aucun rappel automatique
  returning id into v_id;

  if v_note is not null then
    insert into public.composition_notes (composition_id, author_id, author_email, kind, body)
    values (v_id, auth.uid(), auth.jwt() ->> 'email', 'note', v_note);
  end if;

  return v_id;
end;
$$;

revoke all on function public.ajouter_contact(text, text, text, date, integer, text, text, boolean) from public, anon;
grant execute on function public.ajouter_contact(text, text, text, date, integer, text, text, boolean) to authenticated;


-- ------------------------------------------------------------
-- 3. Envoi d'un menu : accepte aussi une fiche « sans menu »
--    (contact ajouté à la main). Seule la condition WHERE change par
--    rapport au lot 2. La source déjà enregistrée n'est JAMAIS écrasée
--    (coalesce) : le ?source= d'un lien de reprise ne sert qu'à l'audience.
--    Le statut commercial (crm_status) n'est pas touché.
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
      and (c.status = 'draft' or (c.ajout_manuel and c.consent_at is null))
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


-- ------------------------------------------------------------
-- 4. Preuve sociale : les fiches sans menu ne comptent pas dans le seuil
--    des 10 menus envoyés (seule la CTE « envoyes » change).
-- ------------------------------------------------------------
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
       and not (c.ajout_manuel and c.consent_at is null)
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
       and not (c.ajout_manuel and c.consent_at is null)
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


-- ------------------------------------------------------------
-- 5. Résumé hebdomadaire (send-weekly-digest, lundi 8 h)
--    La programmation pg_cron n'est PAS dans cette migration : elle
--    contient le secret CRON_SECRET, qui ne doit jamais être commité.
--    Elle est prête, en commentaire, dans supabase/cron/weekly-digest.sql
--    (même principe que les relances, cf. docs/DEPLOY.md, lot 7).
-- ------------------------------------------------------------
