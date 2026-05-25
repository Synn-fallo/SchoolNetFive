-- ============================================================
-- Permettre aux visiteurs de faire une demande de rôle
-- (enseignant, parent, eleve, etc.) avec statut 'en_attente'
-- ============================================================

CREATE POLICY "Visitors can request roles"
    ON user_roles
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (SELECT active_role FROM profiles WHERE id = auth.uid()) = 'visiteur'
    );