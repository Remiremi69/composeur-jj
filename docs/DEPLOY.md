# Mise en production — actions manuelles

Chaque lot ajoute ici la liste exacte des actions à faire **à la main**, dans
l'ordre. Les outils de développement ne déploient jamais rien eux-mêmes.

Projet Supabase : `qlxswvjvorycpxbncppr` · Site : https://composeur-jj.vercel.app

---

## Lot 1 — Sécurité

### ⚠️ À lire avant de commencer

- **Coupure pendant la mise en production.** Entre l'étape 7 (migration) et la
  fin de l'étape 9 (nouveau front en ligne), le site actuellement en ligne ne
  peut plus enregistrer de menus : l'ancien front écrit directement dans les
  tables, ce que la migration interdit. **Enchaînez les étapes 7, 8 et 9 sans
  pause**, idéalement à un moment calme.
- **Ne lancez jamais `npx supabase config push`** : il enverrait en production
  toute la configuration locale de `supabase/config.toml` (URL de redirection
  `127.0.0.1`, etc.). Les réglages de production se font dans le dashboard.
- La migration de base `20260922204829_baseline.sql` est **déjà marquée comme
  appliquée** sur le projet (effet de `supabase db pull` le 22/09/2026). Seule
  la migration `20260922210237_securite.sql` sera appliquée.

---

### Étape 1 — Vérifier la CLI

Dans un terminal, depuis le dossier du projet :

```bash
cd C:\Users\mormo\Desktop\composeur-jj
```
```bash
npx supabase migration list
```

Attendu : `20260922204829` présente en **Local** et en **Remote** ;
`20260922210237` présente en **Local** uniquement.

---

### Étape 2 — Préparer les valeurs secrètes

**a) Sel de la limite de débit** — générez une valeur aléatoire et gardez-la de côté :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**b) Cloudflare Turnstile (fortement recommandé avant l'arrivée de vrais couples)**

1. Sur https://dash.cloudflare.com → **Turnstile** → **Add widget**.
2. Nom : `Le Composeur` · Domaine : `composeur-jj.vercel.app` · Mode : **Managed**.
3. Notez la **Site Key** (publique) et la **Secret Key** (secrète).

> Sans Turnstile, la fonction reste protégée par le champ piège, le délai
> minimal et la limite de 5 envois par heure — mais un script peut encore
> imiter un navigateur. Turnstile est le vrai verrou anti-robot.

---

### Étape 3 — Secrets de l'Edge Function

Dashboard Supabase → **Edge Functions** → **Secrets** (passer par le dashboard
évite les problèmes de guillemets avec `FROM_EMAIL`).

| Secret | Valeur | État |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://composeur-jj.vercel.app` | **à créer** |
| `RATE_LIMIT_SALT` | la valeur générée à l'étape 2a | **à créer** |
| `TURNSTILE_SECRET_KEY` | la Secret Key de l'étape 2b | **à créer** (si Turnstile) |
| `REPLY_TO_EMAIL` | `j.jtraiteur@hotmail.com` (ou `contact@j-jtraiteur.fr` une fois la boîte créée) | **à créer** |
| `RESEND_API_KEY` | clé Resend | déjà en place — vérifier |
| `FROM_EMAIL` | `Le Composeur — J&J <menu@j-jtraiteur.fr>` | déjà en place — vérifier |
| `TRAITEUR_EMAIL` | `j.jtraiteur@hotmail.com` (plusieurs adresses : séparées par des virgules) | déjà en place — vérifier |

> ⚠️ Si `ALLOWED_ORIGINS` est vide ou absent, **toutes** les soumissions sont
> refusées (sécurité par défaut). Pas de `/` final dans l'URL.

---

### Étape 4 — Variable du front sur Vercel (si Turnstile)

Vercel → projet **composeur-jj** → **Settings** → **Environment Variables** :

- `VITE_TURNSTILE_SITE_KEY` = la **Site Key** de l'étape 2b, environnement **Production**.

(Elle sera prise en compte au déploiement de l'étape 9.)

---

### Étape 5 — Fermer les inscriptions

Dashboard Supabase → **Authentication** → **Sign In / Providers** (ou
**Settings**) → désactiver **« Allow new users to sign up »** → **Save**.

---

### Étape 6 — Compte de connexion du traiteur

Si le compte n'existe pas encore : **Authentication** → **Users** → **Add user**
→ **Create new user** : email du traiteur, mot de passe choisi par lui, cocher
**Auto Confirm User**. (La création par le dashboard fonctionne même avec les
inscriptions fermées.)

---

### ⏱️ Étapes 7 à 9 : à enchaîner sans pause

### Étape 7 — Appliquer la migration

Vérification à blanc (n'applique rien) :

```bash
npx supabase db push --dry-run
```

Attendu : seule `20260922210237_securite.sql` est listée. Puis :

```bash
npx supabase db push
```

Ensuite, **déclarez l'administrateur** — Dashboard → **SQL Editor** (adaptez
l'email si le compte traiteur en utilise un autre) :

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'j.jtraiteur@hotmail.com'
on conflict (user_id) do nothing;

-- Vérification : doit afficher le compte du traiteur
select a.user_id, u.email, a.created_at
from public.admins a join auth.users u on u.id = a.user_id;
```

> Tout compte connecté qui n'est **pas** dans cette table ne voit plus aucune
> demande (y compris vos anciens comptes de test).

### Étape 8 — Déployer l'Edge Function

```bash
npx supabase functions deploy submit-composition
```

### Étape 9 — Déployer le front

Commitez puis poussez la branche `master` : Vercel déploie automatiquement.
Attendez le statut **Ready** dans Vercel.

---

### Étape 10 — Checklist de tests en production

Récupérez la clé anon (publique) dans `.env.local` (`VITE_SUPABASE_ANON_KEY`)
et remplacez `CLE_ANON` ci-dessous.

- [ ] **Parcours normal** : composer un menu sur le site et l'envoyer →
  confirmation « Votre menu a bien été envoyé… », l'email arrive **chez le
  couple** et **chez le traiteur**. Depuis la boîte du traiteur, cliquer
  « Répondre » → le destinataire proposé est **l'email du couple**.
- [ ] **Origine non autorisée → refus** :
  ```bash
  curl -i -X POST https://qlxswvjvorycpxbncppr.supabase.co/functions/v1/submit-composition -H "Authorization: Bearer CLE_ANON" -H "Content-Type: application/json" -H "Origin: https://exemple.com" -d "{}"
  ```
  Attendu : `HTTP 403` et `Origine non autorisée.`
- [ ] **En-tête CORS exact** : même commande avec
  `-H "Origin: https://composeur-jj.vercel.app"` → l'en-tête
  `access-control-allow-origin` doit valoir `https://composeur-jj.vercel.app`
  (et non `*`). *En local, la passerelle de développement force `*` : à
  confirmer en production.*
- [ ] **HTML dans les prénoms → texte échappé** : à l'accueil, saisir comme
  prénoms `<b>Test</b> & <a href="https://exemple.com">lien</a>`, envoyer le
  menu → dans les emails, le texte apparaît tel quel (ni gras, ni lien).
- [ ] **6 soumissions en une heure → la 6ᵉ est refusée** : envoyer 6 menus
  depuis la même connexion → la 6ᵉ affiche « Vous avez envoyé plusieurs menus
  en peu de temps. Merci de réessayer dans une heure. » (chaque tentative
  compte, même refusée).
- [ ] **Création de compte via l'API → impossible** :
  ```bash
  curl -X POST https://qlxswvjvorycpxbncppr.supabase.co/auth/v1/signup -H "apikey: CLE_ANON" -H "Content-Type: application/json" -d "{\"email\":\"test@exemple.com\",\"password\":\"MotDePasse123!\"}"
  ```
  Attendu : `Signups not allowed for this instance`.
- [ ] **Compte non admin → aucune donnée** : créer un utilisateur de test
  (Authentication → Users → Add user), se connecter avec lui sur
  `/admin` → écran **« Accès réservé »** avec un bouton de déconnexion.
  Supprimer ensuite cet utilisateur de test.
- [ ] **Compte admin du traiteur** : se connecter sur `/admin` → les demandes
  s'affichent, le bouton « traité » fonctionne.

### Étape 11 — Nettoyage après les tests

Dans le **SQL Editor** (adaptez l'email utilisé pour vos tests) :

```sql
-- Supprime les menus de test (les plats et options suivent automatiquement)
delete from public.compositions where email = 'votre-email-de-test@exemple.fr';
-- Remet à zéro la limite de débit
delete from public.submission_log;
```

Enfin, **changez le mot de passe de la base** (il a été affiché dans une
capture d'écran) : **Project Settings** → **Database** → **Reset database
password**. Sans impact sur le site, qui ne l'utilise pas.

### En cas de problème après l'étape 7

Revenir à une ancienne version du front sur Vercel **ne suffit pas** : l'ancien
front écrit directement dans les tables, ce que la migration interdit. Terminez
plutôt les étapes 8 et 9. Les erreurs de la fonction sont visibles dans
Dashboard → **Edge Functions** → `submit-composition` → **Logs**.
