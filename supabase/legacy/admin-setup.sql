-- ============================================================
-- LE COMPOSEUR — Back-office admin (additif, ne casse rien)
-- À lancer une fois dans l'éditeur SQL de Supabase.
-- ============================================================

-- Statut "traité" par le traiteur
alter table compositions add column if not exists handled bool default false;

-- L'admin authentifié peut TOUT lire (CRM + stats) et marquer "traité".
drop policy if exists "compositions_admin_read" on compositions;
create policy "compositions_admin_read"
  on compositions for select to authenticated using (true);

drop policy if exists "compositions_admin_update" on compositions;
create policy "compositions_admin_update"
  on compositions for update to authenticated using (true);

drop policy if exists "composition_items_admin_read" on composition_items;
create policy "composition_items_admin_read"
  on composition_items for select to authenticated using (true);

drop policy if exists "composition_options_admin_read" on composition_options;
create policy "composition_options_admin_read"
  on composition_options for select to authenticated using (true);
