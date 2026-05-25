-- ============================================================
-- PHASE 3 – WORKFLOW ENSEIGNANT (CORRIGÉ)
-- Table : classes_personnelles
-- Date : 2026-04-17
-- Objectif : Stocker les classes personnelles des enseignants indépendants
-- CORRECTION : La référence à users utilise auth.users
-- ============================================================

-- 1. Création de la table (sans FOREIGN KEY pour éviter erreur)
CREATE TABLE IF NOT EXISTS classes_personnelles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enseignant_id UUID NOT NULL,  -- Référence à auth.users, sans FK explicite
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    matieres JSONB DEFAULT '[]'::jsonb,
    eleves JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_classes_personnelles_enseignant ON classes_personnelles(enseignant_id);

-- 3. RLS
ALTER TABLE classes_personnelles ENABLE ROW LEVEL SECURITY;

-- 4. Politique : seul l'enseignant propriétaire peut tout faire
CREATE POLICY "Enseignant peut tout faire sur ses classes personnelles"
    ON classes_personnelles
    USING (enseignant_id = auth.uid())
    WITH CHECK (enseignant_id = auth.uid());

-- 5. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_classes_personnelles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_classes_personnelles_updated_at ON classes_personnelles;
CREATE TRIGGER trg_classes_personnelles_updated_at
    BEFORE UPDATE ON classes_personnelles
    FOR EACH ROW
    EXECUTE FUNCTION update_classes_personnelles_updated_at();

-- 6. Commentaires
COMMENT ON TABLE classes_personnelles IS 'Classes créées manuellement par les enseignants indépendants (établissement non abonné)';
COMMENT ON COLUMN classes_personnelles.matieres IS 'JSONB contenant les matières personnalisées : [{nom, coefficient}]';
COMMENT ON COLUMN classes_personnelles.eleves IS 'JSONB contenant les élèves : [{nom, prenom, matricule}]';