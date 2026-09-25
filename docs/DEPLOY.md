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

> ✅ **Lot 1 déployé en production le 24/09/2026.**

---

## Lot 2 — Conversion

Brouillons côté serveur (sauvegarde automatique, reprise, relance des
abandons), informations de recontact, provenance, prix cohérent partout.

### Ce qui change par rapport au lot 1

- **Pas de coupure cette fois**, à condition de respecter l'ordre :
  migration → **front** → fonctions. Le nouveau front fonctionne avec
  l'ancienne fonction d'envoi (seule la sauvegarde automatique échoue, en
  silence, en attendant). L'ordre inverse bloquerait les couples : la
  nouvelle fonction exige un téléphone que l'ancien front ne demande pas.
- **Cinq Edge Functions** au lieu d'une : `submit-composition` (mise à jour),
  `save-draft`, `get-draft`, `draft-opt-out`, `send-draft-reminders`.
- **Deux fonctions sans jeton Supabase** (`verify_jwt = false`, déclaré dans
  `supabase/config.toml`) : `send-draft-reminders` (protégée par
  `CRON_SECRET`) et `draft-opt-out` (désinscription « un clic » depuis la
  messagerie ; le jeton de partage fait foi).
- **Turnstile est désormais aussi sur l'accueil** (création du brouillon).
  ⚠️ **Fortement recommandé** : chaque brouillon peut déclencher un email de
  relance 24 h plus tard ; sans Turnstile, un robot pourrait créer des
  brouillons au nom de n'importe qui et faire partir des relances depuis
  `j-jtraiteur.fr`. Il est déjà configuré depuis le lot 1
  (`TURNSTILE_SECRET_KEY` + `VITE_TURNSTILE_SITE_KEY`) : **ne le retirez pas**.

---

### Étape 1 — Vérifier la CLI

```bash
cd C:\Users\mormo\Desktop\composeur-jj
```
```bash
npx supabase migration list
```

Attendu : `20260922204829` et `20260922210237` en **Local** et **Remote** ;
`20260924154221` en **Local** uniquement.

---

### Étape 2 — Générer le secret des relances

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Gardez cette valeur de côté : c'est `CRON_SECRET` (étapes 3 et 9).

---

### Étape 3 — Nouveaux secrets de l'Edge Function

Dashboard Supabase → **Edge Functions** → **Secrets** :

| Secret | Valeur | État |
|---|---|---|
| `SITE_URL` | `https://composeur-jj.vercel.app` (sans `/` final) | **à créer** |
| `TRAITEUR_PHONE` | `+33 6 71 17 06 73` | **à créer** |
| `CRON_SECRET` | la valeur de l'étape 2 | **à créer** |
| `ALLOWED_ORIGINS`, `RATE_LIMIT_SALT`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`, `REPLY_TO_EMAIL`, `TRAITEUR_EMAIL` | inchangés | déjà en place |

> `SITE_URL` sert à construire les liens des emails de relance
> (`/reprendre/…`, `/desinscription/…`). **Pensez à la mettre à jour** le jour
> où le sous-domaine définitif remplacera `composeur-jj.vercel.app` (en même
> temps que `ALLOWED_ORIGINS` et les *Hostnames* du widget Turnstile).

---

### Étape 4 — Variables du front sur Vercel

Vercel → **composeur-jj** → **Settings** → **Environment Variables**, type
**Configuration** (valeurs publiques), environnement **Production** :

| Variable | Valeur |
|---|---|
| `VITE_PRIVACY_URL` | `https://j-jtraiteur.fr/confidentialite` |
| `VITE_TRAITEUR_SITE_URL` | `https://j-jtraiteur.fr` |

Ne redéployez pas tout de suite : elles seront prises en compte à l'étape 7.

---

### Étape 5 — Logo (facultatif, avant l'étape 7)

Déposez le fichier **`public/brand/jj-logo-slate.png`** dans le projet et
commitez-le. Sans lui, la page menu et la page de désinscription affichent
« J&J Traiteur » en typographie (repli prévu).

---

### Étape 6 — Appliquer la migration

```bash
npx supabase db push --dry-run
```

Attendu : seule `20260924154221_conversion.sql`. Puis :

```bash
npx supabase db push
```

> Effet à connaître : la **« Présentation en buffet des gâteaux »** passe en
> prix vide et s'affiche désormais **« Sur demande »**. Si J&J confirme qu'elle
> est **offerte**, dans le SQL Editor :
> `update public.options set price = 0 where slug = 'dessert-buffet-gateaux';`
> (elle s'affichera alors « Offert »).

---

### Étape 7 — Déployer le front

Commitez puis poussez la branche `master` ; attendez **Ready** sur Vercel.

---

### Étape 8 — Déployer les fonctions

```bash
npx supabase functions deploy submit-composition
```
```bash
npx supabase functions deploy save-draft
```
```bash
npx supabase functions deploy get-draft
```
```bash
npx supabase functions deploy draft-opt-out --no-verify-jwt
```
```bash
npx supabase functions deploy send-draft-reminders --no-verify-jwt
```

Chaque commande doit afficher « Deployed Functions ». Le `--no-verify-jwt`
confirme le réglage de `config.toml` pour les deux fonctions appelées sans
jeton Supabase.

---

### Étape 9 — Activer la relance horaire (après les tests de l'étape 10)

Ouvrez **`supabase/cron/draft-reminders.sql`**, copiez-le dans le **SQL
Editor**, **retirez les `--`** devant les blocs 1, 2 et 3, remplacez
`COLLEZ_ICI_LE_CRON_SECRET` par la valeur de l'étape 2, puis **Run**.
Vérification :

```sql
select jobname, schedule, active from cron.job;
```

Attendu : `composeur-relances | 17 * * * * | t`. Le lendemain, contrôlez les
exécutions :

```sql
select status, return_message, start_time from cron.job_run_details
order by start_time desc limit 10;
```

> ⚠️ Ne commitez jamais ce fichier avec le vrai secret dedans.

---

### Étape 10 — Checklist de tests en production

Utilisez **votre propre email** pour ces tests.

**Brouillon et provenance**
- [ ] Ouvrir `https://composeur-jj.vercel.app/?utm_source=test-deploiement` en
  navigation privée. Sous le champ email : « Pour enregistrer votre menu, vous
  l'envoyer, et vous le rappeler si vous ne l'avez pas terminé. Pas de
  publicité. »
- [ ] Valider l'accueil, choisir une formule : en bas à droite,
  **« ≈ … € / pers. »** puis **« Menu enregistré ✓ »**.
- [ ] Dans le SQL Editor :
  ```sql
  select status, couple_names, source, last_step, share_token
  from public.compositions order by created_at desc limit 1;
  ```
  Attendu : `draft`, `test-deploiement`, la dernière étape atteinte.

**Reprise**
- [ ] Dans une **autre** fenêtre privée, ouvrir
  `https://composeur-jj.vercel.app/reprendre/<share_token>` → retour
  direct à la dernière étape, avec la sélection.

**Récap, envoi, emails**
- [ ] Récap : le prix par personne est en grand ; « Voir le détail » montre
  formule, suppléments, options et le **total pour N convives**.
- [ ] Cliquer « Envoyer » sans téléphone ni lieu → messages d'erreur.
  Saisir `06 12 34 56 78` puis quitter le champ → `+33 6 12 34 56 78`.
- [ ] Le lien « Politique de confidentialité » ouvre
  `https://j-jtraiteur.fr/confidentialite`.
- [ ] Envoyer → confirmation avec **« Voir notre menu en ligne »**.
- [ ] Emails (traiteur et couple) : prix par personne en avant, total en
  dessous ; téléphone **cliquable** chez le traiteur ; lieu, allergies,
  message ; PDF avec « Vos informations ».
- [ ] La même ligne est passée en « envoyée » (pas de doublon) :
  ```sql
  select status, phone, venue, consent_at is not null as consentement
  from public.compositions where share_token = '<share_token>';
  ```
- [ ] `/menu/<share_token>` : menu complet, **sans** email, téléphone ni lieu,
  sans bouton d'édition, avec le logo (ou « J&J Traiteur ») et le lien vers
  `j-jtraiteur.fr`.

**Back-office**
- [ ] `/admin` : la liste ne montre que les menus **envoyés** ; en haut à
  droite, **« Menus en cours : N »**.
- [ ] Fiche : téléphone cliquable, lieu, allergies, message, provenance.

**Options**
- [ ] « Présentation en buffet des gâteaux » affiche **« Sur demande »**.

**Relance et désinscription** (avant l'étape 9)
- [ ] Créer un brouillon avec votre email (accueil + une formule), puis le
  « vieillir » de 25 h dans le SQL Editor :
  ```sql
  alter table public.compositions disable trigger compositions_set_updated_at;
  update public.compositions set updated_at = now() - interval '25 hours'
  where status = 'draft' and email = 'VOTRE_EMAIL';
  alter table public.compositions enable trigger compositions_set_updated_at;
  ```
- [ ] Déclencher la relance à la main (remplacez `VOTRE_CRON_SECRET`) :
  ```bash
  curl -X POST https://qlxswvjvorycpxbncppr.supabase.co/functions/v1/send-draft-reminders -H "x-cron-secret: VOTRE_CRON_SECRET"
  ```
  Attendu : `{"ok":true,"sent":1,"failed":0}`. L'email « Votre menu de mariage
  vous attend » contient le bouton **Reprendre mon menu**, l'étape, le
  téléphone de J&J et le lien de désinscription. Dans Gmail, un lien
  « Se désabonner » apparaît en haut.
- [ ] Relancer la même commande → `"sent":0` (une seule relance par brouillon).
- [ ] La même commande **sans** l'en-tête `x-cron-secret` → `Non autorisé.`
- [ ] Cliquer « Ne plus recevoir de rappel » dans l'email → page du Composeur
  → **Confirmer** → « C'est noté ». Vérifier :
  ```sql
  select reminders_opt_out from public.compositions
  where status = 'draft' and email = 'VOTRE_EMAIL';
  ```

### Étape 11 — Nettoyage

```sql
delete from public.compositions where email = 'VOTRE_EMAIL';
delete from public.submission_log;
```

---

## Lot 3 — Parcours

### Ce qui change

- **Une adresse par écran** (`/composer/format`, `/composer/assiette`…) : le
  bouton retour du navigateur revient à l'écran précédent, un rafraîchissement
  garde l'écran, et une frise d'étapes permet de revenir en arrière.
- **Plat, féculent et légume sur un seul écran** « Votre assiette ».
- Les étapes **sans choix** (boissons, grignotage, café…) ne sont plus des
  écrans : leur contenu apparaît dans « Déjà compris dans votre formule »
  (page des formules, récapitulatif, emails, PDF, page menu).
- Récapitulatif : un lien **« Modifier »** par section.
- Accueil : erreurs sous chaque champ, alerte « Date proche » avec le
  téléphone de J&J.

**Aucun nouveau secret, aucune nouvelle variable Vercel.** Le téléphone
affiché à l'accueil est le secret `TRAITEUR_PHONE` du lot 2 (lu par la
nouvelle fonction `public-config`).

---

### Étape 1 — Vérifier la CLI

```bash
cd C:\Users\mormo\Desktop\composeur-jj
```
```bash
npx supabase migration list
```

Attendu : les trois premières migrations en **Local** et **Remote** ;
`20260925155912` en **Local** uniquement.

---

### Étape 2 — Appliquer la migration

```bash
npx supabase db push --dry-run
```

Attendu : seule `20260925155912_parcours.sql`. Puis :

```bash
npx supabase db push
```

La migration ajoute 4 colonnes facultatives à `steps` (noms courts de la
frise, regroupement « assiette ») : l'ancien site continue de fonctionner.

---

### Étape 3 — Déployer les fonctions (après l'étape 2, obligatoirement)

```bash
npx supabase functions deploy public-config
```
```bash
npx supabase functions deploy submit-composition
```
```bash
npx supabase functions deploy get-draft
```
```bash
npx supabase functions deploy send-draft-reminders --no-verify-jwt
```

Chaque commande doit afficher « Deployed Functions ».

> `send-draft-reminders` lit les nouvelles colonnes : ne la déployez **pas
> avant** la migration, sinon la relance horaire échouerait.

---

### Étape 4 — Déployer le front

Commitez puis poussez la branche `master` ; attendez **Ready** sur Vercel.

---

### Étape 5 — Checklist de tests en production

Dans une fenêtre de navigation privée, sur https://composeur-jj.vercel.app :

**Accueil**
- [ ] Cliquer « Composer notre menu » sans rien remplir → un message rouge
  **sous chaque champ**, le curseur va au premier champ en erreur.
- [ ] Choisir une date dans moins de 3 mois → « Date proche : appelez-nous
  pour vérifier nos disponibilités au +33 6 71 17 06 73 » (numéro cliquable
  sur téléphone). Une date lointaine → pas de message.
- [ ] Sur téléphone, le champ « Nombre de convives » ouvre le pavé numérique.

**Formules**
- [ ] Chaque formule a un encart dépliable « Déjà compris dans votre
  formule » (boissons, grignotage, café… selon la formule).

**Composition**
- [ ] L'adresse change à chaque écran (`/composer/format`, …).
- [ ] **Bouton retour du navigateur** → écran précédent (on ne sort plus
  du parcours). Rafraîchir la page → on reste sur le même écran.
- [ ] La frise en haut montre les étapes faites (✓), l'étape en cours et les
  suivantes ; sur téléphone elle défile et reste centrée sur l'étape en cours.
- [ ] « Votre assiette » : plat, féculent et légume sur le même écran ;
  « Étape suivante » ne s'active qu'une fois les trois choisis.
- [ ] Choisir plus que le maximum → message « Vous avez atteint vos … Retirez
  un choix pour en sélectionner un autre. »,
  la carte n'est pas grisée.
- [ ] Bouton « i » d'une carte → fiche détaillée (photo, description,
  allergènes) ; « Choisir » depuis la fiche.
- [ ] Coller directement `/composer/dessert` dans un nouvel onglet sans avoir
  composé → retour à la première étape à compléter.

**Récapitulatif**
- [ ] Encart « Déjà compris dans votre formule ».
- [ ] « Modifier » à côté d'une section → l'écran concerné, avec un bouton
  « Revenir au récapitulatif ».
- [ ] Envoyer sans téléphone ni lieu → message rouge sous chacun des deux
  champs.
- [ ] Envoyer → les emails (traiteur et couple) et le PDF contiennent
  « Déjà compris dans votre formule » ; la page `/menu/…` aussi.

**Reprise**
- [ ] Composer jusqu'à « Votre assiette », fermer l'onglet, rouvrir le lien
  `/reprendre/…` (depuis la table `compositions` ou un email de relance) →
  retour sur « Votre assiette ».

---

### Étape 6 — Nettoyage

```sql
delete from public.compositions where email = 'VOTRE_EMAIL';
delete from public.submission_log;
```
