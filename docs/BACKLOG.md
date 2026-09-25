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
