-- ============================================================
-- PHASE 6a – MIGRATION IN-APP
-- Table : correspondance_eleves
-- Objectif : Lier un élève personnel (JSONB) à un élève officiel
-- ============================================================

-- 1. Création de la table
CREATE TABLE IF NOT EXISTS correspondance_eleves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classe_personnelle_id UUID NOT NULL REFERENCES classes_personnelles(id) ON DELETE CASCADE,
    eleve_personnel_nom VARCHAR(100) NOT NULL,
    eleve_personnel_prenom VARCHAR(100) NOT NULL,
    eleve_personnel_matricule VARCHAR(50),
    eleve_officiel_id UUID REFERENCES eleves(id) ON DELETE SET NULL,
    enseignant_id UUID NOT NULL,
    statut VARCHAR(20) DEFAULT 'active', -- 'active', 'historisee', 'ignoree'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_correspondance_eleves_classe_personnelle ON correspondance_eleves(classe_personnelle_id);
CREATE INDEX IF NOT EXISTS idx_correspondance_eleves_officiel ON correspondance_eleves(eleve_officiel_id);
CREATE INDEX IF NOT EXISTS idx_correspondance_eleves_enseignant ON correspondance_eleves(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_correspondance_eleves_nom_prenom ON correspondance_eleves(eleve_personnel_nom, eleve_personnel_prenom);

-- 3. RLS
ALTER TABLE correspondance_eleves ENABLE ROW LEVEL SECURITY;

-- 4. Politique : l'enseignant peut tout faire sur ses correspondances
CREATE POLICY "Enseignant peut gérer ses correspondances d'élèves"
    ON correspondance_eleves
    USING (enseignant_id = auth.uid())
    WITH CHECK (enseignant_id = auth.uid());

-- 5. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_correspondance_eleves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_correspondance_eleves_updated_at ON correspondance_eleves;
CREATE TRIGGER trg_correspondance_eleves_updated_at
    BEFORE UPDATE ON correspondance_eleves
    FOR EACH ROW
    EXECUTE FUNCTION update_correspondance_eleves_updated_at();

-- 6. Commentaires
COMMENT ON TABLE correspondance_eleves IS 'Correspondance entre les élèves personnels (JSONB) et les élèves officiels';
COMMENT ON COLUMN correspondance_eleves.statut IS 'active = correspondance active, historisee = remplacée, ignoree = délibérément ignorée';