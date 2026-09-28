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
    _shared/brand.ts              Identité J&J côté serveur : couleurs (hex de la charte), SIRET, coordonnées
    _shared/brand-logo.ts         Logo encodé pour le PDF — GÉNÉRÉ par `npm run brand:sync`
    _shared/pdf.ts                PDF du menu (joint aux emails : complet ; menu-pdf : sans coordonnées)
    _shared/email-layout.ts       Gabarit commun des emails (logo, bouton, pied de page)
    _shared/menu.ts               Menu envoyé en lecture seule (sans coordonnées)
    _shared/webhook.ts            Notification instantanée (n8n) : résumé du lead, non bloquant, 3 s max
    submit-composition/           Envoi du menu : validation, prix serveur, enregistrement atomique, emails, PDF
    save-draft/                   Création et sauvegarde automatique des brouillons
    get-draft/                    Reprise d'un brouillon / menu envoyé en lecture seule
    send-draft-reminders/         Relance des menus abandonnés (appelée par pg_cron)
    draft-opt-out/                Désinscription des relances
    public-config/                Réglages publics lus par le front (téléphone de J&J)
    menu-pdf/                     PDF d'un menu envoyé, SANS coordonnées (page de confirmation)
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

### Identité et après-envoi (lot 4)

- **Charte J&J** dans `src/index.css` : couleurs en composantes oklch
  (`--color-slate: 0.438 0.034 247`), utilisées par Tailwind sous la forme
  `oklch(var(--x) / <alpha-value>)` (les opacités `bg-fond/95` fonctionnent).
  Le bronze est décoratif uniquement (contraste 2,8:1 sur fond clair) ;
  `tests/contrast.test.ts` le vérifie, ainsi que la concordance des couleurs
  des emails et du PDF avec la charte.
- Polices Playfair Display (titres) et Lato (texte) **auto-hébergées**
  (`@fontsource`), aucun appel à Google Fonts. Rayons de 4 px.
- **En-tête de marque** sur toutes les pages publiques (`BrandHeader`), avec la
  place du téléphone réservée pour qu'aucun élément ne bouge à son arrivée.
- **Confirmation** : prochaine étape (dégustation, prise de rendez-vous),
  partage du menu (copie, WhatsApp, partage natif), PDF via `menu-pdf`.
  Textes modifiables dans `src/config/brand.ts`.
- **Fichiers de marque** attendus dans `public/brand/` : `jj-logo-slate.png`,
  `favicon.ico` + `favicon-48.png` (48 × 48), `apple-touch-icon.png` (180 × 180),
  `og-image.jpg` (1200 × 630). Après tout changement du logo :
  `npm run brand:sync` (recopie le logo dans le code des fonctions, pour le
  PDF), puis redéployer les fonctions. Un test échoue si le logo de
  `public/brand/` et celui des fonctions ne concordent pas.

### Pilotage (lot 5)

- **CRM** : `compositions.crm_status` (nouveau → contacté → dégustation →
  devis envoyé → signé, ou perdu avec `lost_reason`), `contacted_at` rempli
  par la base au premier contact. Chaque changement de statut est écrit par un
  déclencheur dans `composition_notes` (`kind = 'statut'`, colonnes
  structurées `from_status` / `to_status`, auteur, date) ; les notes internes
  y sont aussi (`kind = 'note'`), sans modification ni suppression possibles.
- **Statistiques** (`src/lib/crm.ts`, testées) : l'entonnoir compte l'étape
  la plus avancée **jamais atteinte**, lue dans cet historique. Les
  compositions `is_test` sont exclues partout (statistiques, badges).
- **Prix figé** : `compositions.estimate` (détail du prix au moment de
  l'envoi) ; pour les demandes antérieures, la fiche recalcule aux prix
  actuels et le signale.
- **Preuve sociale** : `popular_items()` et `popular_formule()` (security
  definer, lisibles par le site) ne renvoient que des identifiants, et rien
  sous 10 menus envoyés hors tests.
- **Mesure d'audience** (`src/lib/tracking.ts`) : Plausible sans cookie,
  pages vues envoyées à la main avec les jetons masqués, aucun champ
  personnel dans les événements.
- Lien direct vers une fiche : `/admin?demande=<id>`.

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
| `VITE_TRAITEUR_SITE_URL` | Site vitrine de J&J (en-tête : lien « ← j-jtraiteur.fr » et logo) |
| `VITE_APP_URL` | Adresse publique du Composeur (balises de partage, liens partagés) |
| `VITE_BOOKING_URL` | Prise de rendez-vous en ligne (« Réserver un appel ») ; vide = « Nous appeler » |
| `VITE_PLAUSIBLE_DOMAIN` | Domaine déclaré dans Plausible ; vide = aucune mesure d'audience (et jamais hors production) |

### Edge Functions (secrets Supabase — jamais dans le front)

| Secret | Rôle |
|---|---|
| `ALLOWED_ORIGINS` | Origines autorisées, séparées par des virgules (ex. `https://composeur-jj.vercel.app`) |
| `RATE_LIMIT_SALT` | Sel aléatoire pour hacher les IP de la limite de débit |
| `TURNSTILE_SECRET_KEY` | Clé secrète Turnstile (facultative : vérification ignorée si absente) |
| `RESEND_API_KEY` | Clé API Resend |
| `FROM_EMAIL` | Expéditeur, ex. `Le Composeur — J&J <menu@j-jtraiteur.fr>` |
| `REPLY_TO_EMAIL` | Adresse de réponse pour l'email envoyé au couple ; affichée dans le pied des emails et du PDF |
| `TRAITEUR_EMAIL` | Destinataire(s) traiteur, séparés par des virgules |
| `SITE_URL` | Adresse du Composeur : liens des emails (reprise, menu en ligne), logo des emails |
| `TRAITEUR_PHONE` | Téléphone de J&J — **source unique** : en-tête du site, confirmation, alerte « date proche » (via `public-config`), emails, PDF |
| `CRON_SECRET` | Secret partagé avec la tâche pg_cron qui déclenche les relances |
| `N8N_WEBHOOK_URL` | Notification instantanée d'un nouveau lead (facultatif : vide = rien n'est envoyé) |
| `N8N_WEBHOOK_SECRET` | Envoyé dans l'en-tête `X-Webhook-Secret`, à vérifier côté n8n |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par
Supabase à la fonction.

### Toutes les adresses, en un coup d'œil

À relire à chaque changement de domaine (voir « Bascule vers
composer.j-jtraiteur.fr » dans `docs/DEPLOY.md`).

| Réglage | Ce qu'il désigne | Valeur actuelle | Où il se règle |
|---|---|---|---|
| `VITE_APP_URL` | Le Composeur (image et lien de partage, liens copiés / WhatsApp) | `https://composeur-jj.vercel.app` | Vercel (variable d'environnement) |
| `SITE_URL` | Le Composeur (liens et logo des emails) | `https://composeur-jj.vercel.app` | Secret Supabase (Edge Functions) |
| `ALLOWED_ORIGINS` | Adresses autorisées à appeler les fonctions (CORS) | `https://composeur-jj.vercel.app` | Secret Supabase (Edge Functions) |
| Hostnames Turnstile | Domaines où le widget anti-robot fonctionne | `composeur-jj.vercel.app` | Tableau de bord Cloudflare (widget Turnstile) |
| `VITE_TRAITEUR_SITE_URL` | Le site vitrine de J&J | `https://j-jtraiteur.fr` | Vercel (variable d'environnement) |
| `VITE_PRIVACY_URL` | Politique de confidentialité (site vitrine) | `https://j-jtraiteur.fr/confidentialite` | Vercel (variable d'environnement) |
| `VITE_BOOKING_URL` | Prise de rendez-vous en ligne | *(vide)* | Vercel (variable d'environnement) |
| `VITE_SUPABASE_URL` | Le projet Supabase | `https://qlxswvjvorycpxbncppr.supabase.co` | Vercel (variable d'environnement) |
| `BRAND.siteUrl` | Le site vitrine, dans le pied des emails et du PDF | `https://j-jtraiteur.fr` | Code : `supabase/functions/_shared/brand.ts` |
| Redirection d'hôte | `composeur-jj.vercel.app` → `composer.j-jtraiteur.fr` (chemin et paramètres conservés) | active après la bascule | Code : `vercel.json` |
| Domaines Vercel | Adresses qui servent le site | `composeur-jj.vercel.app` | Vercel → Settings → Domains |

Une variable `VITE_…` modifiée sur Vercel n'est prise en compte qu'au
**déploiement suivant** ; un secret Supabase est pris en compte
immédiatement par les fonctions.
