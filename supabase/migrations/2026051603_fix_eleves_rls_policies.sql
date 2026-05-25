-- Migration: Correction des politiques RLS sur la table eleves
-- Date: 2026-05-16
-- Objectif: Permettre aux chefs d'établissement de voir tous les élèves

-- ============================================================
-- 1. Supprimer les anciennes politiques problématiques
-- ============================================================

DROP POLICY IF EXISTS "Les chefs peuvent tout voir sur les eleves" ON public.eleves;
DROP POLICY IF EXISTS "Staff can manage eleves" ON public.eleves;

-- ============================================================
-- 2. Créer les politiques corrigées
-- ============================================================

-- Politique pour les chefs d'établissement et administratifs
CREATE POLICY "Chefs et admins peuvent voir tous les eleves"
ON public.eleves
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('chef_etablissement', 'membre_administratif', 'admin')
      AND ur.etablissement_id = eleves.etablissement_id
      AND ur.is_active = true
  )
);

-- Politique pour la gestion (INSERT, UPDATE, DELETE) par les chefs
CREATE POLICY "Chefs et admins peuvent gerer les eleves"
ON public.eleves
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('chef_etablissement', 'admin')
      AND ur.etablissement_id = eleves.etablissement_id
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('chef_etablissement', 'admin')
      AND ur.etablissement_id = eleves.etablissement_id
      AND ur.is_active = true
  )
);

-- ============================================================
-- 3. Vérification (optionnelle)
-- ============================================================
-- SELECT * FROM pg_policies WHERE tablename = 'eleves';