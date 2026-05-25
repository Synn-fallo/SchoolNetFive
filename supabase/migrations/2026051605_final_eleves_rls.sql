-- Migration: Correction finale des politiques RLS sur eleves
-- Date: 2026-05-16

-- ============================================================
-- 1. Supprimer toutes les politiques existantes sur eleves
-- ============================================================

DROP POLICY IF EXISTS "Eleves can view own data" ON public.eleves;
DROP POLICY IF EXISTS "Les chefs peuvent tout voir sur les eleves" ON public.eleves;
DROP POLICY IF EXISTS "Les enseignants voient les eleves de leurs classes" ON public.eleves;
DROP POLICY IF EXISTS "Les parents voient leurs enfants" ON public.eleves;
DROP POLICY IF EXISTS "Parents can view their children data" ON public.eleves;
DROP POLICY IF EXISTS "Staff can manage eleves" ON public.eleves;
DROP POLICY IF EXISTS "Visiteurs peuvent vérifier EducMaster" ON public.eleves;
DROP POLICY IF EXISTS "Chefs et admins peuvent voir tous les eleves" ON public.eleves;
DROP POLICY IF EXISTS "Chefs et admins peuvent gerer les eleves" ON public.eleves;
DROP POLICY IF EXISTS "select_eleves" ON public.eleves;
DROP POLICY IF EXISTS "insert_eleves" ON public.eleves;
DROP POLICY IF EXISTS "update_eleves" ON public.eleves;
DROP POLICY IF EXISTS "delete_eleves" ON public.eleves;

-- ============================================================
-- 2. Créer des politiques simples et efficaces
-- ============================================================

-- SELECT: Les utilisateurs peuvent voir les élèves de leur établissement
CREATE POLICY "select_eleves"
ON public.eleves
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND etablissement_id = eleves.etablissement_id
      AND is_active = true
  )
);

-- INSERT: Seuls les chefs et admins peuvent créer
CREATE POLICY "insert_eleves"
ON public.eleves
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND role IN ('chef_etablissement', 'admin')
      AND etablissement_id = eleves.etablissement_id
      AND is_active = true
  )
);

-- UPDATE: Seuls les chefs et admins peuvent modifier
CREATE POLICY "update_eleves"
ON public.eleves
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND role IN ('chef_etablissement', 'admin')
      AND etablissement_id = eleves.etablissement_id
      AND is_active = true
  )
);

-- DELETE: Seuls les chefs et admins peuvent supprimer (soft delete via statut)
CREATE POLICY "delete_eleves"
ON public.eleves
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND role IN ('chef_etablissement', 'admin')
      AND etablissement_id = eleves.etablissement_id
      AND is_active = true
  )
);

-- ============================================================
-- 3. Vérification (optionnelle)
-- ============================================================
-- SELECT * FROM pg_policies WHERE tablename = 'eleves';