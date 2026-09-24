-- ============================================================
-- LOT 1 — SÉCURITÉ
-- • Accès back-office réservé aux administrateurs déclarés (table admins)
-- • Plus aucune écriture directe du public dans les compositions :
--   la soumission passe par l'Edge Function, qui appelle create_composition()
--   (service_role uniquement) après validation et recalcul du prix.
-- • Journal anti-spam (submission_log), accessible au service_role seulement.
-- Idempotente : peut être rejouée sans erreur.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Administrateurs
-- ------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- Aucune policy : seul le service_role (et is_admin, en security definer) y accède.
revoke all on table public.admins from anon, authenticated;

-- Vrai si l'utilisateur connecté est un administrateur déclaré.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;


-- ------------------------------------------------------------
-- 2. Compositions : on supprime TOUTES les policies existantes
--    (insertion publique, lecture/màj "to authenticated using (true)",
--    policies "token" inopérantes) puis on recrée les seules autorisées.
--    La boucle couvre aussi d'éventuelles policies aux noms inconnus.
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('compositions', 'composition_items', 'composition_options')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end
$$;

create policy compositions_admin_select on public.compositions
  for select to authenticated
  using (public.is_admin());

create policy compositions_admin_update on public.compositions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy composition_items_admin_select on public.composition_items
  for select to authenticated
  using (public.is_admin());

create policy composition_options_admin_select on public.composition_options
  for select to authenticated
  using (public.is_admin());

-- Défense en profondeur : même sans policy, on retire les droits d'écriture
-- directe. L'admin garde la lecture et la mise à jour (statut « traité »),
-- toujours filtrées par les policies ci-dessus.
revoke all on table public.compositions, public.composition_items, public.composition_options
  from anon;
revoke insert, delete, truncate, references, trigger, maintain
  on table public.compositions, public.composition_items, public.composition_options
  from authenticated;
revoke update on table public.composition_items, public.composition_options from authenticated;


-- ------------------------------------------------------------
-- 3. Catalogue : lecture admin, y compris les éléments inactifs
--    (les policies de lecture publique existantes sont conservées).
-- ------------------------------------------------------------
drop policy if exists formules_admin_select on public.formules;
create policy formules_admin_select on public.formules
  for select to authenticated using (public.is_admin());

drop policy if exists steps_admin_select on public.steps;
create policy steps_admin_select on public.steps
  for select to authenticated using (public.is_admin());

drop policy if exists items_admin_select on public.items;
create policy items_admin_select on public.items
  for select to authenticated using (public.is_admin());

drop policy if exists options_admin_select on public.options;
create policy options_admin_select on public.options
  for select to authenticated using (public.is_admin());

drop policy if exists inclusions_admin_select on public.inclusions;
create policy inclusions_admin_select on public.inclusions
  for select to authenticated using (public.is_admin());

-- Le catalogue n'est modifié que depuis le dashboard (rôle postgres) :
-- aucun droit d'écriture pour anon / authenticated.
revoke insert, update, delete, truncate
  on table public.formules, public.steps, public.items, public.options, public.inclusions
  from anon, authenticated;


-- ------------------------------------------------------------
-- 4. Suivi des compositions : emails envoyés + date de mise à jour
-- ------------------------------------------------------------
alter table public.compositions add column if not exists emails_sent_at timestamptz;
alter table public.compositions add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists compositions_set_updated_at on public.compositions;
create trigger compositions_set_updated_at
  before update on public.compositions
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 5. Création ATOMIQUE d'une composition (plats + options compris)
--    Appelée uniquement par l'Edge Function, avec des données déjà
--    validées et un prix recalculé côté serveur.
-- ------------------------------------------------------------
create or replace function public.create_composition(p jsonb)
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
  insert into public.compositions
    (formule_id, couple_names, email, phone, wedding_date, guest_count, status, total_estimate)
  values (
    (p ->> 'formule_id')::uuid,
    p ->> 'couple_names',
    p ->> 'email',
    nullif(p ->> 'phone', ''),
    nullif(p ->> 'wedding_date', '')::date,
    (p ->> 'guest_count')::integer,
    'submitted',
    (p ->> 'total_estimate')::numeric
  )
  returning compositions.id, compositions.share_token into v_id, v_token;

  insert into public.composition_items (composition_id, item_id, quantity)
  select v_id, (e ->> 'item_id')::uuid, (e ->> 'quantity')::integer
  from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) as e;

  insert into public.composition_options (composition_id, option_id)
  select v_id, o::uuid
  from jsonb_array_elements_text(coalesce(p -> 'option_ids', '[]'::jsonb)) as o;

  return query select v_id, v_token;
end;
$$;

revoke all on function public.create_composition(jsonb) from public, anon, authenticated;
grant execute on function public.create_composition(jsonb) to service_role;


-- ------------------------------------------------------------
-- 6. Journal anti-spam (limite de débit par IP hachée)
-- ------------------------------------------------------------
create table if not exists public.submission_log (
  id         bigserial primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index if not exists submission_log_ip_hash_created_at_idx
  on public.submission_log (ip_hash, created_at);

alter table public.submission_log enable row level security;
-- Aucune policy : accessible au service_role uniquement.
revoke all on table public.submission_log from anon, authenticated;
revoke all on sequence public.submission_log_id_seq from anon, authenticated;
