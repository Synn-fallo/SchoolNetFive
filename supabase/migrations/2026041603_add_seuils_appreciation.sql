-- =====================================================
-- MIGRATION : Table seuils_appreciation
-- Date : 2026-04-16
-- Contexte : Seuils d'appréciation pour les notes
-- =====================================================

-- Création de la table
CREATE TABLE IF NOT EXISTS seuils_appreciation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
    note_min DECIMAL(5,2) NOT NULL,
    note_max DECIMAL(5,2) NOT NULL,
    label VARCHAR(50) NOT NULL,
    description TEXT,
    ordre INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT seuils_ordre_unique UNIQUE(etablissement_id, ordre),
    CONSTRAINT seuils_note_min_max CHECK (note_min >= 0 AND note_min <= 20),
    CONSTRAINT seuils_note_max_check CHECK (note_max >= 0 AND note_max <= 20),
    CONSTRAINT seuils_note_range CHECK (note_min <= note_max)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_seuils_etablissement ON seuils_appreciation(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_seuils_ordre ON seuils_appreciation(ordre);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_seuils_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seuils_updated_at
    BEFORE UPDATE ON seuils_appreciation
    FOR EACH ROW
    EXECUTE FUNCTION update_seuils_updated_at();

-- RLS
ALTER TABLE seuils_appreciation ENABLE ROW LEVEL SECURITY;

-- Politique : le chef d'établissement peut tout faire
CREATE POLICY "Chef etablissement peut tout faire sur seuils"
    ON seuils_appreciation
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'chef_etablissement'
            AND is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'chef_etablissement'
            AND is_active = true
        )
    );

-- Insertion des seuils par défaut pour les établissements existants
-- (cette partie est gérée dans le hook useSeuilsAppreciation, pas dans la migration)

-- Commentaire
COMMENT ON TABLE seuils_appreciation IS 'Seuils d''appréciation pour les notes (Excellent, Bien, etc.)';
COMMENT ON COLUMN seuils_appreciation.note_min IS 'Note minimale pour cette appréciation';
COMMENT ON COLUMN seuils_appreciation.note_max IS 'Note maximale pour cette appréciation';
COMMENT ON COLUMN seuils_appreciation.label IS 'Libellé de l''appréciation (Excellent, Bien, etc.)';
COMMENT ON COLUMN seuils_appreciation.ordre IS 'Ordre d''affichage';