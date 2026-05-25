-- =====================================================
-- MIGRATION : Table periodes_validation (corrigée)
-- =====================================================

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS trigger_periodes_validation_updated_at ON periodes_validation;

-- Supprimer la fonction si elle existe
DROP FUNCTION IF EXISTS update_periodes_validation_updated_at();

-- Supprimer les politiques RLS
DROP POLICY IF EXISTS "Chef etablissement peut tout faire sur periodes_validation" ON periodes_validation;

-- Supprimer la table
DROP TABLE IF EXISTS periodes_validation CASCADE;

-- =====================================================
-- CRÉATION PROPRE
-- =====================================================

-- Création de la table (sans clé étrangère vers users)
CREATE TABLE periodes_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periode_id UUID NOT NULL REFERENCES periodes(id) ON DELETE CASCADE,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(periode_id)
);

-- Index
CREATE INDEX idx_periodes_validation_periode ON periodes_validation(periode_id);
CREATE INDEX idx_periodes_validation_validated ON periodes_validation(is_validated);

-- Fonction trigger
CREATE OR REPLACE FUNCTION update_periodes_validation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_periodes_validation_updated_at
    BEFORE UPDATE ON periodes_validation
    FOR EACH ROW
    EXECUTE FUNCTION update_periodes_validation_updated_at();

-- RLS
ALTER TABLE periodes_validation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef etablissement peut tout faire sur periodes_validation"
    ON periodes_validation
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'chef_etablissement'
            AND is_active = true
        )
    );

-- Insertion des périodes existantes
INSERT INTO periodes_validation (periode_id, is_open, is_validated)
SELECT id, TRUE, FALSE
FROM periodes
WHERE categorie = 'normale'
ON CONFLICT (periode_id) DO NOTHING;

-- Commentaire
COMMENT ON TABLE periodes_validation IS 'État des périodes : ouverte (saisie possible) / validée (notes livrées)';