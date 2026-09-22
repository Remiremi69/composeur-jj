-- ============================================================
-- LE COMPOSEUR — Ordre des formules
-- Harmonie en 1er, Émotion au milieu, Signature en dernier.
-- Additif & idempotent : à lancer une fois.
-- ============================================================
update formules set position = 1 where slug = 'harmonie';
update formules set position = 2 where slug = 'emotion';
update formules set position = 3 where slug = 'signature';
