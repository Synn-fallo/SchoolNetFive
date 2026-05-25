-- Migration: Ajout des politiques RLS pour l'insertion et la mise à jour des parents
-- Date: 2026-04-11
-- Description: Permet aux chefs d'établissement et administrateurs de créer et modifier des parents
-- Auteur: SchoolNet Team

-- ============================================================
-- 1. Politique pour INSERT (création de parents)
-- ============================================================
CREATE POLICY "Chef etablissement can insert parents"
ON public.parents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (ARRAY['chef_etablissement'::user_role, 'admin'::user_role])
      AND ur.is_active = true
  )
);

-- ============================================================
-- 2. Politique pour UPDATE (modification de parents)
-- ============================================================
CREATE POLICY "Chef etablissement can update parents"
ON public.parents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (ARRAY['chef_etablissement'::user_role, 'admin'::user_role])
      AND ur.is_active = true
  )
);

-- ============================================================
-- 3. Politique pour DELETE (suppression de parents)
-- ============================================================
-- Optionnelle : décommentez si nécessaire
/*
CREATE POLICY "Chef etablissement can delete parents"
ON public.parents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (ARRAY['chef_etablissement'::user_role, 'admin'::user_role])
      AND ur.is_active = true
  )
);
*/

-- ============================================================
-- 4. Vérification des politiques existantes (optionnel)
-- ============================================================
COMMENT ON POLICY "Chef etablissement can insert parents" ON public.parents IS 
'Permet aux chefs d''établissement et administrateurs de créer des parents';

COMMENT ON POLICY "Chef etablissement can update parents" ON public.parents IS 
'Permet aux chefs d''établissement et administrateurs de modifier des parents';