-- =====================================================
-- MIGRATION : Modification de la table coefficients_periode
-- Date : 2026-04-16
-- Contexte : Rendre periode_id NULLable pour permettre un coefficient par défaut
-- =====================================================

-- 1. Rendre periode_id nullable (car on ne filtre plus par période pour le coefficient actif)
ALTER TABLE coefficients_periode ALTER COLUMN periode_id DROP NOT NULL;

-- 2. Supprimer l'ancienne contrainte unique qui incluait periode_id
ALTER TABLE coefficients_periode DROP CONSTRAINT IF EXISTS unique_coefficient_periode;

-- 3. Créer une nouvelle contrainte unique pour les enregistrements avec periode_id non NULL
CREATE UNIQUE INDEX IF NOT EXISTS unique_coefficient_periode_with_periode
ON coefficients_periode (periode_id, classe_id, matiere_id, type_evaluation)
WHERE periode_id IS NOT NULL;

-- 4. Créer une contrainte unique pour les enregistrements par défaut (periode_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS unique_coefficient_default
ON coefficients_periode (classe_id, matiere_id, type_evaluation)
WHERE periode_id IS NULL;

-- 5. Ajouter un index sur created_at pour accélérer la recherche du dernier coefficient
CREATE INDEX IF NOT EXISTS idx_coefficients_created_at ON coefficients_periode(created_at DESC);

-- 6. Ajouter un index composé pour la recherche du coefficient actif
CREATE INDEX IF NOT EXISTS idx_coefficients_current
ON coefficients_periode (classe_id, matiere_id, type_evaluation, created_at DESC);

-- 7. Commentaire sur la table
COMMENT ON TABLE coefficients_periode IS 'Coefficients des matières par classe et type évaluation. Le coefficient actif est le dernier enregistré (created_at DESC) pour (classe, matière, type).';

-- 8. Commentaire sur la colonne modifiée
COMMENT ON COLUMN coefficients_periode.periode_id IS 'Peut être NULL – si NULL, coefficient par défaut (toutes périodes)';