-- ============================================================
-- Ajout de la politique INSERT pour les demandes de rôle
-- Permet aux utilisateurs authentifiés de demander n'importe quel rôle
-- ============================================================

-- Ajout de la politique pour permettre aux utilisateurs de demander un rôle
CREATE POLICY "Users can request any role"
    ON user_roles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);