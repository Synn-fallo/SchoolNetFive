-- ============================================================
-- Permettre à un utilisateur de s'ajouter un rôle
-- UNIQUEMENT si sa demande dans demandes_role est 'valide'
-- Utilisé par la validation automatique immédiate
-- ============================================================

CREATE POLICY "Users can insert auto-validated roles"
    ON user_roles
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM demandes_role
            WHERE demandes_role.user_id = auth.uid()
            AND demandes_role.role_souhaite = role
            AND demandes_role.statut = 'valide'
        )
    );