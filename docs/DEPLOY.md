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

---

## Lot 4 — Identité et après-envoi

### Ce qui change

- Le site prend la **charte de j-jtraiteur.fr** : ardoise, lin, bronze,
  polices Playfair Display et Lato (hébergées avec le site), rayons sobres.
- **En-tête de marque** sur toutes les pages : lien « ← j-jtraiteur.fr »,
  logo, téléphone cliquable.
- **Page de confirmation** : « Jessica et Jérôme vous appellent sous 48 h »,
  prochaine étape (dégustation), partage du menu (lien, WhatsApp), PDF.
- **PDF et emails** aux couleurs de J&J : logo, pied de page avec téléphone,
  email, site et SIRET ; bouton « Voir mon menu en ligne » pour le couple.
- Nouvelle fonction **`menu-pdf`** : PDF du menu **sans** les coordonnées
  du couple (le lien du menu peut circuler).
- `/admin` n'est plus indexé par les moteurs de recherche ; `robots.txt`
  ajouté.

**Pas de migration. Pas de nouveau secret.** Deux variables Vercel.

> ⚠️ Le commit du lot 4 est suivi d'un **second commit** qui contient la
> redirection vers `composer.j-jtraiteur.fr` (fichier `vercel.json`). Il ne
> doit partir **qu'au moment de la bascule** (section suivante) : envoyé trop
> tôt, il redirigerait tous les visiteurs vers une adresse qui ne fonctionne
> pas encore. D'où la commande particulière de l'étape 5.

---

### Étape 1 — Fichiers de marque

Déposez dans `public/brand/` :

| Fichier | Format | Sert à |
|---|---|---|
| `jj-logo-slate.png` | PNG, fond transparent, logo ardoise (actuel : rond, 320 × 320), < 100 ko | en-tête du site, des emails et du PDF |
| `favicon.ico` et `favicon-48.png` | ICO, et PNG 48 × 48 | icône de l'onglet |
| `apple-touch-icon.png` | PNG 180 × 180 | icône sur l'écran d'accueil d'un iPhone |
| `og-image.jpg` | JPG 1200 × 630 | image affichée quand on partage le lien (WhatsApp, Facebook) |

Puis synchronisez le logo avec le code des fonctions :

```bash
npm run brand:sync
```

Attendu : `Logo synchronisé (… ko) → supabase/functions/_shared/brand-logo.ts`.
Commitez les fichiers (je peux le faire pour vous).

> **Pourquoi ce script ?** Le site (Vercel) sert directement les fichiers de
> `public/brand/` : le logo de l'en-tête et celui des emails (chargé depuis
> l'adresse du site) apparaissent dès le déploiement du front. Mais les
> **fonctions** (Supabase), qui fabriquent le PDF, ne voient pas ce dossier :
> le logo du PDF est donc recopié dans leur code (`_shared/brand-logo.ts`,
> en base64) par `npm run brand:sync`, et n'arrive dans le PDF qu'une fois
> les fonctions **redéployées** (étape 3). Si le script a été oublié,
> `npm test` échoue avec le message « lancez npm run brand:sync ».

> Sans ces fichiers, tout fonctionne : « J&J Traiteur » en texte à la place
> du logo, pas d'icône d'onglet ni d'image de partage.

---

### Étape 2 — Variables du front sur Vercel

Vercel → **composeur-jj** → **Settings** → **Environment Variables**,
environnement **Production** :

| Variable | Valeur |
|---|---|
| `VITE_APP_URL` | `https://composeur-jj.vercel.app` (sera changée à la bascule) |
| `VITE_BOOKING_URL` | lien de prise de rendez-vous (Calendly…), **ou rien** : le bouton devient alors « Nous appeler » |

Ne redéployez pas : elles seront prises en compte à l'étape 4.

---

### Étape 3 — Déployer les fonctions (avant le front)

Pas de migration pour ce lot.

```bash
npx supabase functions deploy menu-pdf
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

Chaque commande doit afficher « Deployed Functions ». Les fonctions d'abord :
ainsi le bouton « Télécharger le PDF » marche dès l'arrivée du nouveau site.
Les nouvelles fonctions restent compatibles avec l'ancien site.

> Logo déposé ou changé plus tard : voir « Ajouter ou changer le logo »
> ci-dessous.

---

### Étape 4 — Déployer le front (SANS la redirection)

Envoyez tout **sauf** le dernier commit (celui de la redirection) :

```bash
git push origin HEAD~1:master
```

Attendez **Ready** sur Vercel. https://composeur-jj.vercel.app doit s'ouvrir
normalement (pas de redirection).

---

### Étape 5 — Checklist de tests en production

Fenêtre de navigation privée sur https://composeur-jj.vercel.app :

**Charte et en-tête**
- [ ] Couleurs ardoise / lin, titres en Playfair Display, texte en Lato,
  coins peu arrondis (boutons rectangulaires).
- [ ] En-tête : « ← j-jtraiteur.fr » (lien vers le site), logo au centre,
  téléphone à droite. En rechargeant la page, **rien ne bouge** quand le
  numéro apparaît. Sur téléphone : « ← Le site » et une icône de téléphone.
- [ ] L'onglet affiche l'icône J&J.

**Confirmation** (composer et envoyer un menu avec votre email)
- [ ] « Merci … ! » et « Jessica et Jérôme ont reçu votre menu et vous
  appellent sous 48 h. »
- [ ] Bloc « Prochaine étape : la dégustation » : « Réserver un appel » ouvre
  votre lien dans un nouvel onglet — ou, sans lien, « Nous appeler » lance
  l'appel sur téléphone.
- [ ] « Copier le lien » → « Lien copié ✓ » ; le lien collé est
  `https://composeur-jj.vercel.app/menu/…`.
- [ ] « WhatsApp » ouvre WhatsApp avec le texte prérempli et le lien.
- [ ] Sur téléphone : un bouton « Partager… » ouvre le partage du téléphone.
- [ ] « Télécharger le PDF » : le PDF contient le menu, le logo, le pied de
  page (téléphone, email, site, SIRET 815 186 382 00017) et **aucune** de vos
  coordonnées (ni téléphone, ni lieu, ni allergies, ni message).
- [ ] « Recommencer une composition » est un petit lien en bas de page.

**Emails**
- [ ] Email du couple : logo, couleurs, bouton **« Voir mon menu en ligne »**
  qui ouvre `/menu/…`, pied de page avec les coordonnées et le SIRET.
- [ ] Email de J&J : même habillage ; le PDF joint contient bien
  « Vos informations » (téléphone, lieu, allergies, message).
- [ ] Accents corrects dans le PDF (« définitif », « Déjà compris »…).

**Référencement**
- [ ] https://composeur-jj.vercel.app/robots.txt affiche les trois lignes
  `Disallow`.
- [ ] Partagez le lien du site dans une conversation WhatsApp avec vous-même :
  l'aperçu montre le titre et l'image (si `og-image.jpg` est déposé).

### Étape 6 — Nettoyage

```sql
delete from public.compositions where email = 'VOTRE_EMAIL';
delete from public.submission_log;
```

---

## Lot 5 — Pilotage

### Ce qui change

- **Back-office** : onglets Nouveaux / En cours / Signés / Perdus / Menus en
  cours, recherche, tri, export CSV. Fiche : appel, WhatsApp, détail du prix,
  **statut** (motif obligatoire pour « Perdu »), **notes internes** et
  historique, bouton « Marquer comme test ».
- **Statistiques** : entonnoir 30 / 90 jours, délai de premier contact,
  conversion par source, panier des signés, motifs de perte, plats.
- **Notification instantanée** (n8n) à chaque menu envoyé et chaque menu
  commencé — facultative.
- **Mesure d'audience** Plausible, sans cookie — facultative.
- **Preuve sociale** : « ★ Très demandé » et « La plus choisie » (à partir de
  10 menus envoyés, hors tests), « ≈ total pour N convives » sous chaque
  formule.

Ancien bouton « traité » : les demandes « traitées » deviennent
**« Contacté »** (sans date de premier contact : elles sont ignorées dans le
délai moyen).

---

### Étape 1 — Vérifier la CLI

```bash
cd C:\Users\mormo\Desktop\composeur-jj
```
```bash
npx supabase migration list
```

Attendu : `20260928170000` en **Local** uniquement, les autres dans les
deux colonnes.

---

### Étape 2 — Appliquer la migration

```bash
npx supabase db push --dry-run
```

Attendu : seule `20260928170000_pilotage.sql`. Puis :

```bash
npx supabase db push
```

La migration ne fait qu'**ajouter** (colonnes, table des notes, fonctions) :
le site actuel continue de fonctionner.

---

### Étape 3 — Déployer les fonctions

```bash
npx supabase functions deploy submit-composition
```
```bash
npx supabase functions deploy save-draft
```

---

### Étape 4 — Déployer le front

**Avant la bascule de domaine**, comme au lot 4, sans la redirection :

```bash
git push origin HEAD~1:master
```

Attendez **Ready** sur Vercel.

---

### Étape 5 — Marquer vos envois de test

Dans `/admin`, ouvrez chacune de vos demandes de test et cliquez **« Marquer
comme test »**. Pour les marquer toutes d'un coup (SQL Editor) — **vérifiez
d'abord** la liste :

```sql
select id, couple_names, email, created_at, status
from public.compositions
where email = 'mormontremi@gmail.com'
order by created_at;
```

Puis, si la liste ne contient que vos tests :

```sql
update public.compositions set is_test = true
where email = 'mormontremi@gmail.com';
```

Les tests restent en base, mais disparaissent de la liste (case « Afficher
les tests »), des statistiques et du calcul des badges.

---

### Étape 6 — Données de démonstration (si elles sont en production)

Les 6 demandes fictives de l'ancien fichier `supabase/legacy/demo-data.sql`
(Camille & Alex, Léa & Thomas, Marie & Julien, Sarah & Kevin, Emma & Lucas…)
ont des emails en `@exemple.fr`. **À lancer vous-même, après vérification.**

1. Vérifier ce qui serait supprimé :
   ```sql
   select id, couple_names, email, created_at, status
   from public.compositions
   where email like '%@exemple.fr'
   order by created_at;
   ```
2. Si — et seulement si — la liste ne contient que ces demandes fictives :
   ```sql
   delete from public.compositions
   where email like '%@exemple.fr';
   ```
   Les plats, options et notes de ces demandes sont supprimés avec elles.

---

### Étape 7 — Notification instantanée n8n (facultatif)

1. Dans n8n, créez un workflow avec un nœud **Webhook** (méthode `POST`).
   Ajoutez un contrôle de l'en-tête `X-Webhook-Secret` (nœud **IF** : la
   valeur doit être égale à votre secret), puis l'action voulue (SMS,
   Telegram, email…).
2. Générez un secret :
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
3. Supabase → **Edge Functions** → **Secrets** :

   | Secret | Valeur |
   |---|---|
   | `N8N_WEBHOOK_URL` | l'adresse de **production** du nœud Webhook n8n |
   | `N8N_WEBHOOK_SECRET` | la valeur de l'étape 2 |

   Pris en compte immédiatement, sans redéploiement.

Contenu envoyé (JSON) : `event` (`submitted` ou `draft_created`), `id`,
`prenoms`, `telephone`, `email`, `date_mariage`, `convives`, `lieu`,
`formule`, `estimation_par_personne`, `estimation_totale`, `source`,
`lien_admin`, `recu_le`. Pour un menu commencé, téléphone, lieu, formule et
estimation sont vides. Si n8n ne répond pas en 3 secondes, l'envoi est
abandonné : le couple n'est jamais ralenti.

> Les coordonnées des couples transitent par n8n : c'est un sous-traitant à
> mentionner dans la politique de confidentialité.

---

### Étape 8 — Mesure d'audience Plausible (facultatif)

1. Créez le site dans Plausible avec le domaine du Composeur
   (`composeur-jj.vercel.app`, puis `composer.j-jtraiteur.fr` après la
   bascule).
2. Plausible → **Site settings** → **Goals** → **Add goal** → **Custom
   event**, un par événement : `Accueil vu`, `Accueil validé`, `Formule
   choisie`, `Étape validée`, `Options vues`, `Récap vu`, `Envoi`, `Erreur
   envoi`, `Reprise brouillon`, `Réservation appel cliquée`, `Menu partagé`,
   `PDF téléchargé`. Pour voir les détails (formule, étape, canal, source…),
   ajoutez aussi les **Custom properties** `source`, `formule`, `étape`,
   `numéro`, `convives`, `canal`, `type`.
3. Vercel → **Environment Variables** (Production) :
   `VITE_PLAUSIBLE_DOMAIN` = le domaine déclaré à l'étape 1. Puis
   redéployez (Deployments → ⋯ → **Redeploy**).

Aucune donnée personnelle n'est envoyée : les adresses `/reprendre/…`,
`/menu/…` et `/desinscription/…` partent masquées (`/menu/:token`). Plausible
n'utilise pas de cookie : pas de bandeau de consentement ; ajoutez une ligne
dans la politique de confidentialité.

---

### Étape 9 — Checklist de tests en production

**Parcours**
- [ ] Page des formules : sous chaque prix, « ≈ … € pour N convives ».
- [ ] Avec au moins 10 menus envoyés hors tests : badge « La plus choisie »
  sur une formule (si elle est seule en tête) et « ★ Très demandé » sur
  quelques plats. En dessous de 10 : aucun badge (c'est voulu).

**Back-office** (après avoir envoyé un menu de test, puis l'avoir marqué
comme test à la fin)
- [ ] Onglets avec compteurs ; la nouvelle demande est dans « Nouveaux ».
- [ ] Recherche par prénom ou email ; tri par date de mariage.
- [ ] « Exporter (CSV) » s'ouvre correctement dans Excel (accents, colonnes).
- [ ] Fiche : « Appeler », « WhatsApp », détail du prix, lien vers le menu.
- [ ] Statut → « Contacté » : la date de premier contact apparaît en haut.
- [ ] Statut → « Perdu » : le motif est demandé ; « Marquer comme perdue »
  reste grisé tant qu'aucun motif n'est choisi.
- [ ] Ajouter une note : elle apparaît dans l'historique, avec votre email,
  au-dessus des changements de statut.
- [ ] Onglet « Menus en cours » : prénoms, email, étape atteinte, dernière
  activité.
- [ ] « Statistiques » : entonnoir 30 / 90 jours, délai, sources, paniers,
  motifs de perte.

**Notification** (si n8n est branché)
- [ ] Commencer un menu → n8n reçoit `draft_created`.
- [ ] L'envoyer → n8n reçoit `submitted` ; le lien `lien_admin` ouvre la
  fiche (après connexion).

**Plausible** (si activé)
- [ ] Faire un parcours complet → les événements apparaissent dans Plausible
  (quelques minutes de délai).

### Étape 10 — Nettoyage

Marquez votre menu de test comme test (ou supprimez-le) :

```sql
delete from public.compositions where email = 'VOTRE_EMAIL' and is_test;
delete from public.submission_log;
```

---

## Lot 6 — Fromage compris, « Les petits plus », photos, brunch, conditions

### Ce qui change

- **Fromage** : les deux fromages sont compris (plus de choix à faire).
  L'écran Fromage reste, présente les deux fromages comme « Compris » et
  propose toujours les présentations en supplément (plateau, pyramide).
- **« Les options » deviennent « Les petits plus »** partout où les couples
  les voient (page, récap, emails, PDF, relance).
- **Photos** des étapes Format et Cocktail (10 photos Unsplash libres de
  droits, crédits dans `docs/PHOTOS.md`).
- **Brunch du lendemain** : nouvelle étape facultative (0 ou 1 format) dans
  les 3 formules, 7 formats (Petit déj 20 €, les autres 35 € / pers), et la
  mise en place : buffet livré (compris), installation (150 €) ou
  installation et service (300 €) — un seul choix possible, proposé
  seulement si un brunch est choisi. Les 3 anciennes formules brunch de
  « Les petits plus » sont désactivées.

- **Conditions de mariage** (`https://j-jtraiteur.fr/conditions-mariage`) :
  lien dans le récap, la confirmation, les emails et le PDF ; mention
  « TTC (TVA 10 %) » ; encart « Bon à savoir » (nombre d'invités à
  confirmer 20 jours avant, acomptes) ; personnel « 1 pour 45 convives » ;
  deux nouveaux petits plus : enlèvement des bouteilles vides (60 €) et des
  ordures (150 €).

Prix du brunch : par personne, calculé sur le nombre de convives du mariage
(J&J l'ajuste avec le couple), et compté dans le prix par personne affiché.

**Une modification de schéma** (colonne `options.exclusive_group`),
**pas de nouveau secret, pas de nouvelle variable.**

---

### Étape 1 — Vérifier la CLI

```bash
cd C:\Users\mormo\Desktop\composeur-jj
```
```bash
npx supabase migration list
```

Attendu : en **Local** uniquement, quatre nouvelles migrations :
`20260929100000`, `20260929180000`, `20260929190000`, `20260929200000`.

---

### Étape 2 — Appliquer les migrations

```bash
npx supabase db push --dry-run
```

Attendu : exactement ces quatre fichiers :
`20260929100000_fromage_compris.sql`,
`20260929180000_photos_format_cocktail.sql`,
`20260929190000_brunch.sql`,
`20260929200000_conditions.sql`. Puis :

```bash
npx supabase db push
```

> Entre cette étape et l'étape 4, le site actuel affiche déjà le fromage
> sans choix et une étape Brunch (sans les photos ni la mise en place
> exclusive). Enchaînez les étapes 2 à 4 sans pause.

---

### Étape 3 — Déployer les fonctions

```bash
npx supabase functions deploy submit-composition
```
```bash
npx supabase functions deploy get-draft
```
```bash
npx supabase functions deploy send-draft-reminders --no-verify-jwt
```
```bash
npx supabase functions deploy menu-pdf
```

(Validation des options exclusives et du brunch, fromage dans « Déjà
compris », « petits plus » dans les emails et le PDF.)

---

### Étape 4 — Déployer le site (sans la redirection)

```bash
git push origin HEAD~1:master
```

Attendez **Ready** sur Vercel.

---

### Étape 5 — Checklist de tests en production

- [ ] Format et Cocktail : les photos s'affichent sur les cartes.
- [ ] Fromage : les deux fromages marqués « Compris », bandeau « Compris dans
  votre formule », présentations en supplément toujours cochables.
- [ ] Brunch : 7 formats avec leur prix ; « Étape suivante » possible sans
  brunch. Sans brunch, la mise en place affiche « Faites d'abord votre
  choix ». Avec un brunch : cocher « Installation » puis « Installation et
  service » → une seule reste cochée. Retirer le brunch → la mise en place
  est retirée.
- [ ] Page « Les petits plus » : plus de formules brunch.
- [ ] Récap, emails, PDF : « Vos petits plus », section « Brunch du
  lendemain », fromages dans « Déjà compris ».
- [ ] Fiche admin : le brunch et sa mise en place apparaissent.
- [ ] Récap : « tout compris, TTC (TVA 10 %) », encart « Bon à savoir »,
  lien « Toutes nos conditions de mariage » qui ouvre la page de J&J.
- [ ] Formules : « 1 membre du personnel de service pour 45 convives » ;
  sous le prix, seulement le prix par personne (plus de total « ≈ … pour N
  convives »).
- [ ] Petits plus : enlèvement des bouteilles vides (60 €) et des ordures
  (150 €).
- [ ] Email du couple et PDF : mention TTC et « Bon à savoir » ; pied des
  emails et du PDF : lien vers les conditions.

### Étape 6 — Nettoyage

Marquez vos envois de test comme test (fiche admin).

---

## Ajouter ou changer le logo (à tout moment)

1. **Déposer** les fichiers dans `public/brand/` (noms et formats : lot 4,
   étape 1).
2. **Lancer le script** :
   ```bash
   npm run brand:sync
   ```
   Attendu : `Logo synchronisé (… ko)`. Puis `npm test` doit passer.
3. **Commiter** (je le fais pour vous ; tant que la bascule de domaine n'est
   pas faite, je place le commit de la redirection **après** celui du logo,
   pour que `git push origin HEAD~1:master` reste la bonne commande).
4. **Redéployer les fonctions**, dans cet ordre :
   ```bash
   npx supabase functions deploy submit-composition
   ```
   ```bash
   npx supabase functions deploy menu-pdf
   ```
   ```bash
   npx supabase functions deploy send-draft-reminders --no-verify-jwt
   ```
   Les deux premières mettent le logo dans le PDF. La troisième n'utilise pas
   le PDF (ses emails chargent le logo depuis le site) : on la redéploie pour
   que toutes les fonctions tournent sur le même code.
5. **Déployer le front** (en-tête du site et logo des emails) :
   `git push origin HEAD~1:master` avant la bascule, `git push origin master`
   après.
6. **Vérifier** : en-tête du site, email reçu, et « Télécharger le PDF » sur
   la page de confirmation d'un nouvel envoi.

---

## Bascule vers composer.j-jtraiteur.fr

À faire après le lot 4, quand vous êtes prêt. Les emails déjà envoyés
contiennent des liens `https://composeur-jj.vercel.app/reprendre/…` et
`/menu/…` : l'ancienne adresse **redirige définitivement** vers la nouvelle
en gardant le chemin complet et les paramètres (`vercel.json`). En suivant
l'ordre, le site n'est jamais coupé.

### Étape 1 — Activer le domaine dans Vercel

1. Vercel → **composeur-jj** → **Settings** → **Domains** → **Add** →
   `composer.j-jtraiteur.fr`.
2. Vercel affiche l'enregistrement DNS à créer (en général un **CNAME**
   `composer` → `cname.vercel-dns.com`). Créez-le chez Hostinger
   (**Domaines** → `j-jtraiteur.fr` → **DNS**). Ne touchez pas aux
   enregistrements existants (site vitrine, emails Resend).
3. Attendez que Vercel affiche **Valid Configuration** (de quelques minutes à
   quelques heures ; le certificat HTTPS est créé automatiquement).
4. Vérifiez : https://composer.j-jtraiteur.fr affiche le Composeur.
   Les deux adresses fonctionnent désormais en parallèle.

### Étape 2 — Autoriser les deux adresses

Supabase → **Edge Functions** → **Secrets** :

| Secret | Nouvelle valeur |
|---|---|
| `ALLOWED_ORIGINS` | `https://composeur-jj.vercel.app,https://composer.j-jtraiteur.fr` (les **deux**, séparées par une virgule, sans espace ni `/` final) |
| `SITE_URL` | `https://composer.j-jtraiteur.fr` (liens et logo des emails) |

Cloudflare → **Turnstile** → votre widget → **Hostnames** : **ajoutez**
`composer.j-jtraiteur.fr` (gardez `composeur-jj.vercel.app`).

Vercel → **Environment Variables** : `VITE_APP_URL` =
`https://composer.j-jtraiteur.fr`.

### Étape 3 — Déployer la redirection

```bash
git push origin master
```

Ce push envoie le commit de la redirection et reconstruit le site avec la
nouvelle `VITE_APP_URL`. Attendez **Ready**.

### Étape 4 — Vérifier

```bash
curl -sI "https://composeur-jj.vercel.app/menu/test?utm_source=essai"
```

Attendu : `308 Permanent Redirect` et
`location: https://composer.j-jtraiteur.fr/menu/test?utm_source=essai`
(chemin **et** paramètres conservés).

- [ ] Un ancien lien `…vercel.app/menu/<share_token>` (email déjà reçu)
  ouvre le menu sur `composer.j-jtraiteur.fr`.
- [ ] Un ancien lien `…vercel.app/reprendre/<share_token>` reprend le menu.
- [ ] Sur `composer.j-jtraiteur.fr` : composer, « Menu enregistré ✓ »,
  envoi, emails reçus avec des liens en `composer.j-jtraiteur.fr`,
  « Copier le lien » donne `https://composer.j-jtraiteur.fr/menu/…`,
  « Télécharger le PDF » fonctionne.
- [ ] `/admin` : connexion possible sur la nouvelle adresse.

### Étape 5 — Mettre à jour le lien du site vitrine

Sur j-jtraiteur.fr (Lovable), remplacez le lien vers le Composeur par
`https://composer.j-jtraiteur.fr`.

### Étape 6 — Retirer l'ancienne adresse (seulement après vérification)

Quelques jours plus tard, une fois tout vérifié :

- `ALLOWED_ORIGINS` = `https://composer.j-jtraiteur.fr`
- Turnstile : retirez `composeur-jj.vercel.app` des Hostnames.

**Ne retirez pas** `composeur-jj.vercel.app` des domaines Vercel, ni la
redirection de `vercel.json` : ce sont elles qui font fonctionner les
anciens liens des emails.

Mettez enfin à jour la colonne « Valeur actuelle » du tableau des adresses
dans le README (je peux le faire).
