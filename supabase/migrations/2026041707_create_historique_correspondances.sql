-- ============================================================
-- PHASE 6a – MIGRATION IN-APP
-- Table : historique_correspondances
-- Objectif : Historiser les modifications de correspondances (conflits, corrections)
-- ============================================================

-- 1. Création de la table
CREATE TABLE IF NOT EXISTS historique_correspondances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL, -- 'classe', 'eleve', 'matiere'
    reference_id UUID, -- ID de la correspondance concernée (optionnel)
    ancienne_valeur JSONB,
    nouvelle_valeur JSONB,
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'overwrite', 'ignore'
    user_id UUID NOT NULL,
    raison TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_historique_correspondances_type ON historique_correspondances(type);
CREATE INDEX IF NOT EXISTS idx_historique_correspondances_reference ON historique_correspondances(reference_id);
CREATE INDEX IF NOT EXISTS idx_historique_correspondances_user ON historique_correspondances(user_id);
CREATE INDEX IF NOT EXISTS idx_historique_correspondances_created_at ON historique_correspondances(created_at);

-- 3. RLS
ALTER TABLE historique_correspondances ENABLE ROW LEVEL SECURITY;

-- 4. Politique : l'utilisateur peut voir son propre historique
CREATE POLICY "Users can view their own history"
    ON historique_correspondances
    FOR SELECT
    USING (user_id = auth.uid());

-- 5. Politique : insertion automatique (système ou déclenché par fonction)
CREATE POLICY "System can insert history"
    ON historique_correspondances
    FOR INSERT
    WITH CHECK (true);

-- 6. Commentaires
COMMENT ON TABLE historique_correspondances IS 'Historique des modifications des correspondances (classe, élève, matière)';
COMMENT ON COLUMN historique_correspondances.type IS 'Type de correspondance : classe, eleve, matiere';
COMMENT ON COLUMN historique_correspondances.action IS 'Action effectuée : create, update, delete, overwrite, ignore';