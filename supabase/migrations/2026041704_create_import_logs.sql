-- ============================================================
-- PHASE 6b – WORKFLOW ENSEIGNANT
-- Table : import_logs
-- Date : 2026-04-17
-- Objectif : Journaliser les imports CSV pour traçabilité
-- ============================================================

-- 1. Création de la table
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'classes', 'matieres', 'eleves'
    filename VARCHAR(255),
    rows_total INTEGER,
    rows_imported INTEGER,
    rows_skipped INTEGER,
    status VARCHAR(50) NOT NULL, -- 'success', 'partial', 'failed'
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_import_logs_user ON import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at);

-- 3. RLS
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- 4. Politique : l'utilisateur peut voir ses propres imports
CREATE POLICY "Users can view their own imports"
    ON import_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- 5. Politique : l'utilisateur peut insérer ses propres imports
CREATE POLICY "Users can insert their own imports"
    ON import_logs
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 6. Commentaires
COMMENT ON TABLE import_logs IS 'Journal des imports CSV effectués par les utilisateurs';
COMMENT ON COLUMN import_logs.type IS 'Type de données importées : classes, matieres, eleves';
COMMENT ON COLUMN import_logs.status IS 'Statut de l''import : success, partial, failed';