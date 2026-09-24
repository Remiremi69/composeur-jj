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
| Serveur | Edge Function `submit-composition` (Deno) | Seul point d'entrée de la soumission |
| Emails | Resend | Notification traiteur + récapitulatif couple (PDF joint) |
| Hébergement | Vercel (front), Supabase (base + fonction) | |

### Arborescence utile

```
src/                              Front React
  routes/                         Pages : accueil, formules, composition, options, récap, confirmation, admin
  lib/                            Client Supabase, soumission, formatage ; rules.ts et pricing.ts ré-exportent le noyau
supabase/
  functions/
    _shared/core/                 NOYAU MÉTIER PARTAGÉ (TypeScript pur) : types, règles, prix, validation
    _shared/html.ts               Échappement HTML des emails
    submit-composition/           Edge Function : CORS, anti-spam, validation, enregistrement, emails, PDF
  migrations/                     Schéma de la base (source de vérité), migrations horodatées
  seed.sql                        Catalogue de référence (sans aucune composition) pour le local
  legacy/                         Anciens scripts SQL — archives, NE PAS EXÉCUTER
tests/                            Tests vitest (noyau + emails)
docs/DEPLOY.md                    Actions manuelles de mise en production, lot par lot
```

### Le noyau métier partagé

`supabase/functions/_shared/core/` contient la logique qui doit être identique
côté navigateur et côté serveur :

- `rules.ts` : règles des étapes (`pick_one`, `pick_range`, `exact_count`, `free`)
  et surcharges par formule (`formules.step_rules`, ex. 4 pièces pour Signature) ;
- `pricing.ts` : `computeEstimate()` — le prix par personne tout compris
  (`perPersonAllIn`) et le total ;
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
npm test             # vitest : règles, prix, validation, échappement des emails
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
| `VITE_TURNSTILE_SITE_KEY` | Clé publique Cloudflare Turnstile (facultative) |

### Edge Function `submit-composition` (secrets Supabase — jamais dans le front)

| Secret | Rôle |
|---|---|
| `ALLOWED_ORIGINS` | Origines autorisées, séparées par des virgules (ex. `https://composeur-jj.vercel.app`) |
| `RATE_LIMIT_SALT` | Sel aléatoire pour hacher les IP de la limite de débit |
| `TURNSTILE_SECRET_KEY` | Clé secrète Turnstile (facultative : vérification ignorée si absente) |
| `RESEND_API_KEY` | Clé API Resend |
| `FROM_EMAIL` | Expéditeur, ex. `Le Composeur — J&J <menu@j-jtraiteur.fr>` |
| `REPLY_TO_EMAIL` | Adresse de réponse pour l'email envoyé au couple |
| `TRAITEUR_EMAIL` | Destinataire(s) traiteur, séparés par des virgules |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par
Supabase à la fonction.
