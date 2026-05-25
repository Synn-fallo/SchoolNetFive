-- ============================================================
-- RECRÉATION DE LA VUE public_etablissements
-- BUT: Inclure les colonnes region_id, departement_id et leurs noms
-- ============================================================

-- 1. Supprimer l'ancienne vue si elle existe
DROP VIEW IF EXISTS public_etablissements CASCADE;

-- 2. Créer la nouvelle vue avec toutes les colonnes nécessaires
CREATE OR REPLACE VIEW public_etablissements AS
SELECT 
  e.id,
  e.nom,
  e.slug,
  e.description,
  e.adresse,
  e.telephone,
  e.email,
  e.logo_url,
  e.couleur_primaire,
  e.couleur_secondaire,
  e.is_active,
  e.statut,
  e.ville,
  e.metadata,
  e.created_at,
  -- ✅ NOUVEAUX CHAMPS GÉOGRAPHIQUES
  e.region_id,
  e.departement_id,
  r.nom AS region_nom,
  d.nom AS departement_nom
FROM etablissements e
LEFT JOIN regions r ON e.region_id = r.id
LEFT JOIN departements d ON e.departement_id = d.id
WHERE e.statut IN ('ACTIF', 'ABONNE_ESSENTIEL', 'ABONNE_PREMIUM', 'INFOS_MINIMALES_COMPLETE');

-- 3. Accorder les droits d'accès (optionnel, selon ta config RLS)
GRANT SELECT ON public_etablissements TO anon, authenticated;

-- 4. Commentaire pour documentation
COMMENT ON VIEW public_etablissements IS 'Vue publique des établissements pour l''annuaire, avec infos géographiques';