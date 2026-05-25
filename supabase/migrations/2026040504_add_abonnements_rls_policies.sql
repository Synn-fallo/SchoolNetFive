-- =====================================================
-- MIGRATION: Politiques RLS pour la table abonnements
-- Date: 05/04/2026
-- Description: Ajoute les politiques de sécurité pour permettre
-- aux chefs d'établissement de gérer leurs abonnements
-- =====================================================

-- Activation de la sécurité au niveau des lignes (si ce n'est pas déjà fait)
ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. Politique SELECT : Les chefs peuvent voir leurs abonnements
-- =====================================================
DROP POLICY IF EXISTS "Chefs can view their own subscriptions" ON abonnements;
CREATE POLICY "Chefs can view their own subscriptions"
ON abonnements FOR SELECT
TO authenticated
USING (
  etablissement_id IN (
    SELECT etablissement_id 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'chef_etablissement'
    AND is_active = true
  )
);

-- =====================================================
-- 2. Politique INSERT : Les chefs peuvent créer un abonnement
-- =====================================================
DROP POLICY IF EXISTS "Chefs can insert subscriptions" ON abonnements;
CREATE POLICY "Chefs can insert subscriptions"
ON abonnements FOR INSERT
TO authenticated
WITH CHECK (
  -- Vérifier que l'utilisateur est chef d'établissement
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'chef_etablissement'
    AND is_active = true
  )
);

-- =====================================================
-- 3. Politique UPDATE : Les chefs peuvent modifier leurs abonnements
-- =====================================================
DROP POLICY IF EXISTS "Chefs can update their own subscriptions" ON abonnements;
CREATE POLICY "Chefs can update their own subscriptions"
ON abonnements FOR UPDATE
TO authenticated
USING (
  etablissement_id IN (
    SELECT etablissement_id 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'chef_etablissement'
    AND is_active = true
  )
);

-- =====================================================
-- 4. Politique DELETE : Les chefs peuvent supprimer leurs abonnements
-- =====================================================
DROP POLICY IF EXISTS "Chefs can delete their own subscriptions" ON abonnements;
CREATE POLICY "Chefs can delete their own subscriptions"
ON abonnements FOR DELETE
TO authenticated
USING (
  etablissement_id IN (
    SELECT etablissement_id 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'chef_etablissement'
    AND is_active = true
  )
);

-- =====================================================
-- 5. Politique supplémentaire : Les admins peuvent tout voir
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON abonnements;
CREATE POLICY "Admins can view all subscriptions"
ON abonnements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);

-- =====================================================
-- Vérification des politiques créées
-- =====================================================
SELECT 
  policyname, 
  cmd, 
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'abonnements'
ORDER BY policyname;