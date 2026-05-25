-- ============================================================
-- PHASE 6a – MIGRATION IN-APP
-- Table : correspondance_classes
-- Objectif : Lier une classe personnelle à une classe officielle
-- ============================================================

-- 1. Création de la table
CREATE TABLE IF NOT EXISTS correspondance_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classe_personnelle_id UUID NOT NULL REFERENCES classes_personnelles(id) ON DELETE CASCADE,
    classe_officielle_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    enseignant_id UUID NOT NULL,
    statut VARCHAR(20) DEFAULT 'active', -- 'active', 'historisee'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(classe_personnelle_id, classe_officielle_id)
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_correspondance_classes_personnelle ON correspondance_classes(classe_personnelle_id);
CREATE INDEX IF NOT EXISTS idx_correspondance_classes_officielle ON correspondance_classes(classe_officielle_id);
CREATE INDEX IF NOT EXISTS idx_correspondance_classes_enseignant ON correspondance_classes(enseignant_id);

-- 3. RLS
ALTER TABLE correspondance_classes ENABLE ROW LEVEL SECURITY;

-- 4. Politique : l'enseignant peut tout faire sur ses correspondances
CREATE POLICY "Enseignant peut gérer ses correspondances de classes"
    ON correspondance_classes
    USING (enseignant_id = auth.uid())
    WITH CHECK (enseignant_id = auth.uid());

-- 5. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_correspondance_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_correspondance_classes_updated_at ON correspondance_classes;
CREATE TRIGGER trg_correspondance_classes_updated_at
    BEFORE UPDATE ON correspondance_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_correspondance_classes_updated_at();

-- 6. Commentaires
COMMENT ON TABLE correspondance_classes IS 'Correspondance entre les classes personnelles (indépendant) et les classes officielles (établissement abonné)';
COMMENT ON COLUMN correspondance_classes.statut IS 'active = correspondance active, historisee = remplacée par une nouvelle';