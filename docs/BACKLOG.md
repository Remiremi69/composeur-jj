# Backlog

Points identifiés, à traiter dans un lot ultérieur.

## Données personnelles

- **Suppression des brouillons abandonnés après 12 mois.** Les brouillons
  (`compositions.status = 'draft'`) contiennent l'email, les prénoms et la date
  de mariage de couples qui n'ont jamais envoyé leur menu. Prévoir une purge
  automatique (tâche pg_cron quotidienne) des brouillons dont `updated_at` a
  plus de 12 mois, et le mentionner dans la politique de confidentialité.
  *(Noté au lot 2.)*

## Nettoyage technique

- **Supprimer `create_composition()`** (lot 1), remplacée par
  `submit_composition()` au lot 2. Conservée uniquement pour que l'ancienne
  version de l'Edge Function reste opérationnelle pendant la mise en
  production du lot 2. *(Noté au lot 2.)*

## Interface

- **Lot 4 (nouvelle palette J&J) : refaire la mesure des contrastes.** Le
  lot 3 a foncé `--color-muted` (#756a5f) et ajouté `--color-error` pour
  atteindre 4,5:1. Toute nouvelle couleur doit repasser
  `tests/contrast.test.ts` (ajouter les nouvelles paires de couleurs au test).
  *(Noté au lot 3.)*
- **OptionsPage : titres des catégories d'options à passer en données.**
  *Déjà fait au lot 3* : la liste figée `STEP_EMBEDDED_CATEGORIES` (quelles
  catégories d'options s'affichent dans une étape plutôt qu'en page finale)
  a été supprimée ; c'est désormais la donnée qui décide (une option dont la
  catégorie porte le slug d'une étape s'affiche dans cette étape).
  *Reste à faire* : les **titres** des catégories de la page finale
  (« Bar de nuit », « Brunch du lendemain »…) sont encore écrits dans la table
  `CATEGORY_LABELS` de `src/routes/OptionsPage.tsx`. Les stocker en base
  (table ou colonne) pour que J&J puisse les modifier sans développeur.
  *(Noté au lot 3.)*

## Lot technique — mise à jour de l'outillage

- **Mettre Node à jour vers la version LTS actuelle**, puis les outils qui en
  dépendent : Vite (figé en 5), Tailwind (figé en 3), jsdom (figé en 25 pour
  les tests d'interface), Vitest, TypeScript et les autres dépendances de
  développement. La machine est aujourd'hui en Node 22.11 : les versions
  récentes de Vite et de jsdom exigent Node ≥ 22.12 et plantent sinon.
  À faire dans un lot dédié, sans autre changement fonctionnel ; critères de
  fin : `npm test` et `npm run build` passent, parcours complet vérifié en
  local, puis en production après déploiement. *(Noté au lot 3.)*
