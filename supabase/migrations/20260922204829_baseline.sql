CREATE TABLE "public"."composition_items" (
  "composition_id" uuid    NOT NULL,
  "item_id"        uuid    NOT NULL,
  "quantity"       integer NOT NULL DEFAULT 1,
  CONSTRAINT "composition_items_pkey" PRIMARY KEY (composition_id, item_id)
);

ALTER TABLE "public"."composition_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."composition_options" (
  "composition_id" uuid NOT NULL,
  "option_id"      uuid NOT NULL,
  CONSTRAINT "composition_options_pkey" PRIMARY KEY (composition_id, option_id)
);

ALTER TABLE "public"."composition_options"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."compositions" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "formule_id"     uuid,
  "couple_names"   text,
  "email"          text,
  "phone"          text,
  "wedding_date"   date,
  "guest_count"    integer,
  "status"         text                     NOT NULL DEFAULT 'draft'::text,
  "total_estimate" numeric(10,2),
  "share_token"    text                     DEFAULT (gen_random_uuid())::text,
  "handled"        boolean                  DEFAULT false,
  CONSTRAINT "compositions_pkey" PRIMARY KEY (id),
  CONSTRAINT "compositions_share_token_key" UNIQUE (share_token),
  CONSTRAINT "compositions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text])))
);

ALTER TABLE "public"."compositions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."formules" (
  "id"               uuid          NOT NULL DEFAULT gen_random_uuid(),
  "slug"             text          NOT NULL,
  "name"             text          NOT NULL,
  "subtitle"         text,
  "price_per_person" numeric(10,2) NOT NULL DEFAULT 0,
  "included_steps"   text[]        DEFAULT '{}'::text[],
  "highlights"       text[]        DEFAULT '{}'::text[],
  "position"         integer       NOT NULL DEFAULT 0,
  "is_active"        boolean       DEFAULT true,
  "step_rules"       jsonb         NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "formules_pkey" PRIMARY KEY (id),
  CONSTRAINT "formules_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."formules"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inclusions" (
  "id"          uuid    NOT NULL DEFAULT gen_random_uuid(),
  "group_label" text    NOT NULL,
  "label"       text    NOT NULL,
  "position"    integer NOT NULL DEFAULT 0,
  "is_active"   boolean DEFAULT true,
  CONSTRAINT "inclusions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."inclusions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."items" (
  "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
  "step_id"     uuid          NOT NULL,
  "name"        text          NOT NULL,
  "description" text,
  "photo_url"   text,
  "price"       numeric(10,2) NOT NULL DEFAULT 0,
  "price_unit"  text          NOT NULL DEFAULT 'par_personne'::text,
  "supplement"  numeric(10,2) NOT NULL DEFAULT 0,
  "labels"      text[]        DEFAULT '{}'::text[],
  "category"    text,
  "allergens"   text[]        DEFAULT '{}'::text[],
  "is_seasonal" boolean       DEFAULT false,
  "season_note" text,
  "is_active"   boolean       DEFAULT true,
  "position"    integer       DEFAULT 0,
  CONSTRAINT "items_pkey" PRIMARY KEY (id),
  CONSTRAINT "items_price_unit_check" CHECK ((price_unit = ANY (ARRAY['par_piece'::text, 'par_personne'::text, 'forfait'::text])))
);

ALTER TABLE "public"."items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."options" (
  "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
  "slug"        text          NOT NULL,
  "category"    text          NOT NULL,
  "name"        text          NOT NULL,
  "description" text,
  "price"       numeric(10,2) NOT NULL DEFAULT 0,
  "price_unit"  text          NOT NULL DEFAULT 'par_personne'::text,
  "position"    integer       NOT NULL DEFAULT 0,
  "is_active"   boolean       DEFAULT true,
  CONSTRAINT "options_pkey" PRIMARY KEY (id),
  CONSTRAINT "options_price_unit_check" CHECK ((price_unit = ANY (ARRAY['par_personne'::text, 'forfait'::text]))),
  CONSTRAINT "options_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."options"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."steps" (
  "id"         uuid    NOT NULL DEFAULT gen_random_uuid(),
  "slug"       text    NOT NULL,
  "title"      text    NOT NULL,
  "subtitle"   text,
  "position"   integer NOT NULL,
  "rule_type"  text    NOT NULL,
  "rule_min"   integer,
  "rule_max"   integer,
  "unit_label" text,
  CONSTRAINT "steps_pkey" PRIMARY KEY (id),
  CONSTRAINT "steps_rule_type_check" CHECK ((rule_type = ANY (ARRAY['exact_count'::text, 'pick_one'::text, 'pick_range'::text, 'free'::text]))),
  CONSTRAINT "steps_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."steps"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."composition_items"
  ADD CONSTRAINT "composition_items_composition_id_fkey" FOREIGN KEY (composition_id) REFERENCES public.compositions(id) ON DELETE CASCADE;

ALTER TABLE "public"."composition_options"
  ADD CONSTRAINT "composition_options_composition_id_fkey" FOREIGN KEY (composition_id) REFERENCES public.compositions(id) ON DELETE CASCADE;

ALTER TABLE "public"."compositions"
  ADD CONSTRAINT "compositions_formule_id_fkey" FOREIGN KEY (formule_id) REFERENCES public.formules(id);

ALTER TABLE "public"."composition_items"
  ADD CONSTRAINT "composition_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE "public"."composition_options"
  ADD CONSTRAINT "composition_options_option_id_fkey" FOREIGN KEY (option_id) REFERENCES public.options(id) ON DELETE CASCADE;

ALTER TABLE "public"."items"
  ADD CONSTRAINT "items_step_id_fkey" FOREIGN KEY (step_id) REFERENCES public.steps(id) ON DELETE CASCADE;

CREATE POLICY "composition_items_admin_read" ON "public"."composition_items"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "composition_items_public_insert" ON "public"."composition_items"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "composition_items_token_read" ON "public"."composition_items"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.compositions c
  WHERE ((c.id = composition_items.composition_id) AND (c.share_token = current_setting('app.share_token'::text, true))))));

CREATE POLICY "composition_options_admin_read" ON "public"."composition_options"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "composition_options_public_insert" ON "public"."composition_options"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "composition_options_token_read" ON "public"."composition_options"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.compositions c
  WHERE ((c.id = composition_options.composition_id) AND (c.share_token = current_setting('app.share_token'::text, true))))));

CREATE POLICY "compositions_admin_read" ON "public"."compositions"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "compositions_admin_update" ON "public"."compositions"
  FOR UPDATE
  TO "authenticated"
  USING (true);

CREATE POLICY "compositions_public_insert" ON "public"."compositions"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "compositions_token_read" ON "public"."compositions"
  FOR SELECT
  TO PUBLIC
  USING ((share_token = current_setting('app.share_token'::text, true)));

CREATE POLICY "compositions_token_update" ON "public"."compositions"
  FOR UPDATE
  TO PUBLIC
  USING ((share_token = current_setting('app.share_token'::text, true)));

CREATE POLICY "formules_public_read" ON "public"."formules"
  FOR SELECT
  TO PUBLIC
  USING ((is_active = true));

CREATE POLICY "inclusions_public_read" ON "public"."inclusions"
  FOR SELECT
  TO PUBLIC
  USING ((is_active = true));

CREATE POLICY "items_public_read" ON "public"."items"
  FOR SELECT
  TO PUBLIC
  USING ((is_active = true));

CREATE POLICY "options_public_read" ON "public"."options"
  FOR SELECT
  TO PUBLIC
  USING ((is_active = true));

CREATE POLICY "steps_public_read" ON "public"."steps"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."composition_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."composition_options" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."compositions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."formules" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inclusions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."options" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."steps" TO "anon", "authenticated", "postgres", "service_role";

