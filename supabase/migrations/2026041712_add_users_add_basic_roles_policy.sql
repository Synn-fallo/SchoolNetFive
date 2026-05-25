-- ============================================================
-- Permettre aux utilisateurs de s'ajouter eux-mêmes
-- les rôles de base (eleve, parent, enseignant)
-- Utilisé par la demande de rôle simple (phase minimale)
-- ============================================================

CREATE POLICY "Users can add basic roles to themselves"
    ON user_roles
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND role IN ('eleve', 'parent', 'enseignant')
    );