-- =====================================================
-- MIGRATION 004: Ajout des politiques RLS pour demandes_auto_inscription
-- OBJECTIF: Permettre aux chefs d'établissement et DE de voir les demandes
-- DATE: 2026-05-11
-- =====================================================

-- 1. S'assurer que RLS est activé
ALTER TABLE demandes_auto_inscription ENABLE ROW LEVEL SECURITY;

-- 2. Politique SELECT : Lecture par établissement
-- Les chefs d'établissement et membres administratifs (DE) voient les demandes de leur établissement
DROP POLICY IF EXISTS "allow_select_demandes_by_etablissement" ON demandes_auto_inscription;
CREATE POLICY "allow_select_demandes_by_etablissement"
ON demandes_auto_inscription
FOR SELECT
USING (
  etablissement_id IN (
    SELECT ur.etablissement_id 
    FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('chef_etablissement', 'membre_administratif', 'admin')
    AND ur.is_active = true
  )
);

-- 3. Politique SELECT : Lecture par le créateur (parent via email)
DROP POLICY IF EXISTS "allow_select_demandes_by_parent" ON demandes_auto_inscription;
CREATE POLICY "allow_select_demandes_by_parent"
ON demandes_auto_inscription
FOR SELECT
USING (
  parent_email = auth.email()
);

-- 4. Politique INSERT : Création par tout utilisateur authentifié
DROP POLICY IF EXISTS "allow_insert_demandes" ON demandes_auto_inscription;
CREATE POLICY "allow_insert_demandes"
ON demandes_auto_inscription
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Politique UPDATE : Mise à jour par admin ou chef d'établissement
DROP POLICY IF EXISTS "allow_update_demandes_by_admin" ON demandes_auto_inscription;
CREATE POLICY "allow_update_demandes_by_admin"
ON demandes_auto_inscription
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'chef_etablissement', 'membre_administratif')
    AND is_active = true
  )
);

-- 6. Log de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 004: Politiques RLS ajoutées pour demandes_auto_inscription';
  RAISE NOTICE '   - SELECT: chefs et membres administratifs par établissement, parents par email';
  RAISE NOTICE '   - INSERT: utilisateurs authentifiés';
  RAISE NOTICE '   - UPDATE: admins, chefs et membres administratifs';
END $$;