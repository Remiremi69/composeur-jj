# Le Composeur — J&J Traiteur

Configurateur de menus de mariage. Les couples composent leur menu étape par
étape à partir du catalogue du traiteur (formules, plats, options), puis
l'envoient : la demande est enregistrée, le traiteur la retrouve dans son
back-office, et le couple comme le traiteur reçoivent un récapitulatif par
email (avec PDF).

**Principe directeur : tout est piloté par les données.** Aucun plat, prix ou
règle n'est codé en dur. Le même code servirait un autre traiteur en changeant
seulement le contenu de la base et les couleurs du thème (`src/index.css`).

---

## Architecture

| Couche | Technologie | Rôle |
|---|---|---|
| Front | React 18, Vite 5, Tailwind 3, framer-motion | Parcours du couple + back-office `/admin` |
| Base | Supabase (Postgres + RLS) | Catalogue, compositions, administrateurs |
| Serveur | Edge Functions (Deno) | Envoi du menu, brouillons, reprise, relances, désinscription |
| Emails | Resend | Notification traiteur + récapitulatif couple (PDF joint) |
| Hébergement | Vercel (front), Supabase (base + fonction) | |

### Arborescence utile

```
src/                              Front React
  routes/                         Pages : accueil, formules, composition, options, récap, confirmation, admin
  lib/                            Client Supabase, soumission, formatage ; rules.ts et pricing.ts ré-exportent le noyau
supabase/
  functions/
    _shared/core/                 NOYAU MÉTIER PARTAGÉ (TypeScript pur) : types, règles, prix,
                                  validation, brouillons, formatage
    _shared/guard.ts              Protections communes : CORS, taille, piège, limite de débit, Turnstile
    _shared/recap.ts, html.ts,    Récapitulatif, échappement HTML, envoi Resend
      resend.ts
    submit-composition/           Envoi du menu : validation, prix serveur, enregistrement atomique, emails, PDF
    save-draft/                   Création et sauvegarde automatique des brouillons
    get-draft/                    Reprise d'un brouillon / menu envoyé en lecture seule
    send-draft-reminders/         Relance des menus abandonnés (appelée par pg_cron)
    draft-opt-out/                Désinscription des relances
    public-config/                Réglages publics lus par le front (téléphone de J&J)
  migrations/                     Schéma de la base (source de vérité), migrations horodatées
  cron/                           Tâche horaire de relance, à activer à la main (contient le secret)
  seed.sql                        Catalogue de référence (sans aucune composition) pour le local
  legacy/                         Anciens scripts SQL — archives, NE PAS EXÉCUTER
tests/                            Tests vitest (noyau, emails, contrastes ; tests/ui : parcours sous jsdom)
docs/DEPLOY.md                    Actions manuelles de mise en production, lot par lot
docs/BACKLOG.md                   Points à traiter dans un lot ultérieur
```

### Le noyau métier partagé

`supabase/functions/_shared/core/` contient la logique qui doit être identique
côté navigateur et côté serveur :

- `rules.ts` : règles des étapes (`pick_one`, `pick_range`, `exact_count`, `free`)
  et surcharges par formule (`formules.step_rules`, ex. 4 pièces pour Signature) ;
- `pricing.ts` : `computeEstimate()` — le prix par personne tout compris
  (`perPersonAllIn`) et le total ;
- `journey.ts` : le parcours — écrans (étapes regroupées par `group_slug`,
  étapes `free` retirées), étapes accessibles, redirections ;
- `validation.ts` : `validateComposition()` — tout ce que le serveur vérifie
  avant d'enregistrer (formule active, plats autorisés, règles, 20 à 400
  convives, email, date…), avec des messages en français.

Le front l'importe via l'alias `@core/*` (voir `tsconfig.app.json` et
`vite.config.ts`) ; l'Edge Function l'importe par chemin relatif.

### Sécurité (lot 1)

- Le front **n'écrit jamais** directement dans les tables : il appelle
  l'Edge Function, qui valide, **recalcule le prix** (le total du navigateur est
  ignoré) et enregistre atomiquement via `create_composition()` (service_role).
- Anti-spam : CORS limité à `ALLOWED_ORIGINS`, corps ≤ 50 ko, champ piège,
  délai minimal de 5 s, 5 envois par heure et par IP (hachée), Cloudflare
  Turnstile optionnel.
- Emails : toute valeur injectée est échappée (`escapeHtml`) ; envoi unique par
  composition (`emails_sent_at`).
- Back-office : réservé aux comptes déclarés dans la table `admins`
  (`is_admin()`), inscriptions fermées.

### Conversion (lot 2)

- **Brouillons côté serveur** : dès l'accueil validé, le menu est enregistré
  (`status = 'draft'`) puis sauvegardé automatiquement 2 s après chaque
  changement (indicateur « Menu enregistré ✓ »). L'envoi transforme le
  brouillon en demande (même id) via `submit_composition()`.
- **Reprise** : `/reprendre/:token` restaure le menu à la dernière étape ;
  `/menu/:token` affiche un menu envoyé en lecture seule (sans données de
  contact) ; `/desinscription/:token` arrête les relances.
- **Relance** : une seule fois par brouillon, entre 24 h et 7 jours
  d'inactivité, par `send-draft-reminders` (pg_cron toutes les heures,
  protégée par `CRON_SECRET`). `updated_at` ne bouge qu'en cas de vraie
  activité, pas sur les colonnes de suivi technique.
- **Recontact** : téléphone (normalisé +33), lieu, allergies, message et
  consentement à l'envoi ; provenance (`?source=`, `utm_*`) capturée à
  l'arrivée.

### Parcours (lot 3)

- **Une route par écran** : `/composer/:slug` (slug d'étape, ou `group_slug`
  pour un écran groupé comme `assiette`). `/composer` renvoie à la dernière
  étape atteinte. Une étape pas encore accessible redirige vers la première
  étape à compléter.
- Tout est piloté par les données : `steps.nav_title` (frise),
  `group_slug` / `group_title` / `group_nav_title` (écran partagé). Aucun slug
  n'est écrit en dur dans les composants.
- Les étapes `free` ne sont pas des écrans : leur contenu est affiché dans
  « Déjà compris dans votre formule ».
- Catalogue chargé une seule fois (`src/context/CatalogContext.tsx`).
- Accessibilité : contrastes ≥ 4,5:1 vérifiés par `tests/contrast.test.ts`,
  focus visible, animations réduites si le système le demande.

---

## Lancer en local

Prérequis : Node 22 (le projet est figé sur Vite 5 / Tailwind 3), Docker
Desktop (pour la base locale).

```bash
npm install
npm run dev          # front sur http://localhost:5173
```

Par défaut le front utilise le projet Supabase défini dans `.env.local`
(voir `.env.example`).

### Base et fonction en local (sans toucher à la prod)

```bash
npx supabase start                     # base locale : applique migrations + seed.sql
npx supabase functions serve submit-composition --env-file <fichier.env>
```

Le fichier `.env` de la fonction contient au minimum
`ALLOWED_ORIGINS=http://localhost:5173` et `RATE_LIMIT_SALT=...`. Sans
`RESEND_API_KEY`, aucun email n'est envoyé (la demande est tout de même
enregistrée). Pour faire pointer le front sur la base locale, créez un
`.env.development.local` avec l'URL et la clé anon affichées par
`supabase start`.

---

## Tests

```bash
npm test             # vitest : règles, prix, validation, parcours, emails, contrastes, navigation (jsdom)
npm run build        # vérification TypeScript + build de production
```

---

## Déploiement

Rien n'est déployé automatiquement par les outils : **toutes les actions de
mise en production sont listées, dans l'ordre, dans [`docs/DEPLOY.md`](docs/DEPLOY.md)**
(migrations, secrets, déploiement de la fonction, réglages du dashboard,
checklist de tests).

- Front : Vercel déploie la branche `master`.
- Base : `npx supabase db push` applique les migrations de `supabase/migrations/`.
- Fonction : `npx supabase functions deploy submit-composition`.

---

## Variables d'environnement

### Front (Vite — publiques, dans `.env.local` et sur Vercel)

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anon (publique, protégée par RLS) |
| `VITE_TURNSTILE_SITE_KEY` | Clé publique Cloudflare Turnstile (facultative, fortement recommandée) |
| `VITE_PRIVACY_URL` | Politique de confidentialité, liée sous le bouton d'envoi |
| `VITE_TRAITEUR_SITE_URL` | Site vitrine de J&J (logo, page menu) |

### Edge Functions (secrets Supabase — jamais dans le front)

| Secret | Rôle |
|---|---|
| `ALLOWED_ORIGINS` | Origines autorisées, séparées par des virgules (ex. `https://composeur-jj.vercel.app`) |
| `RATE_LIMIT_SALT` | Sel aléatoire pour hacher les IP de la limite de débit |
| `TURNSTILE_SECRET_KEY` | Clé secrète Turnstile (facultative : vérification ignorée si absente) |
| `RESEND_API_KEY` | Clé API Resend |
| `FROM_EMAIL` | Expéditeur, ex. `Le Composeur — J&J <menu@j-jtraiteur.fr>` |
| `REPLY_TO_EMAIL` | Adresse de réponse pour l'email envoyé au couple |
| `TRAITEUR_EMAIL` | Destinataire(s) traiteur, séparés par des virgules |
| `SITE_URL` | Adresse du Composeur, pour les liens des emails de relance |
| `TRAITEUR_PHONE` | Téléphone de J&J affiché dans les relances (ex. `+33 6 71 17 06 73`) |
| `CRON_SECRET` | Secret partagé avec la tâche pg_cron qui déclenche les relances |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par
Supabase à la fonction.
