-- ============================================================
-- MIGRATION: 2026041906_add_region_departement_to_demandes_etablissement
-- BUT: Ajouter les colonnes region_id et departement_id à la table demandes_etablissement
-- ============================================================

-- 1. Ajout des colonnes
ALTER TABLE demandes_etablissement
ADD COLUMN IF NOT EXISTS region_id UUID NULL,
ADD COLUMN IF NOT EXISTS departement_id UUID NULL;

-- 2. Commentaires
COMMENT ON COLUMN demandes_etablissement.region_id IS 'Région sélectionnée lors de la demande';
COMMENT ON COLUMN demandes_etablissement.departement_id IS 'Département sélectionné lors de la demande';

-- 3. Index optionnels
CREATE INDEX IF NOT EXISTS idx_demandes_etablissement_region_id ON demandes_etablissement(region_id);
CREATE INDEX IF NOT EXISTS idx_demandes_etablissement_departement_id ON demandes_etablissement(departement_id);