-- =====================================================
-- MIGRATION : Table notes_historique (corrigée)
-- =====================================================

-- Création de la table (sans clé étrangère vers users)
CREATE TABLE IF NOT EXISTS notes_historique (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'status_change', 'validate', 'deliver', 'revise', 'cancel')),
    old_note_value DECIMAL(5,2),
    new_note_value DECIMAL(5,2),
    old_statut VARCHAR(20),
    new_statut VARCHAR(20),
    reason TEXT,
    user_id UUID NOT NULL,
    user_name VARCHAR(100),
    user_role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notes_historique_note ON notes_historique(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_historique_user ON notes_historique(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_historique_created_at ON notes_historique(created_at);

-- RLS
ALTER TABLE notes_historique ENABLE ROW LEVEL SECURITY;

-- Lecture : Chef d'établissement peut voir l'historique
CREATE POLICY "Chef peut voir historique notes de son etablissement"
    ON notes_historique
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM notes n
            JOIN devoirs d ON n.devoir_id = d.id
            JOIN classes c ON d.classe_id = c.id
            JOIN user_roles ur ON ur.etablissement_id = c.etablissement_id
            WHERE n.id = notes_historique.note_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'chef_etablissement'
            AND ur.is_active = true
        )
    );

-- Insertion : uniquement par le système
CREATE POLICY "Insertion systeme uniquement"
    ON notes_historique
    FOR INSERT
    WITH CHECK (false);

-- Commentaire
COMMENT ON TABLE notes_historique IS 'Historique des modifications des notes (traçabilité)';