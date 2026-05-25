-- Migration: Permettre aux visiteurs de lire les EducMaster
-- Date: 2026-05-16
-- Objectif: Résoudre l'erreur 500 lors de la vérification EducMaster

-- ============================================================
-- 1. Créer une politique spécifique pour la vérification EducMaster
-- ============================================================

-- Supprimer la politique si elle existe déjà
DROP POLICY IF EXISTS "Visiteurs peuvent vérifier EducMaster" ON public.eleves;

-- Créer la politique pour les utilisateurs authentifiés (visiteur inclus)
CREATE POLICY "Visiteurs peuvent vérifier EducMaster"
ON public.eleves
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 2. Alternative plus stricte : limiter aux colonnes nécessaires
-- (Via une fonction dédiée, optionnelle)
-- ============================================================

-- Créer une fonction sécurisée pour la vérification
CREATE OR REPLACE FUNCTION public.check_educmaster_exists(p_educmaster TEXT)
RETURNS TABLE(
  existe BOOLEAN,
  nom TEXT,
  prenom TEXT,
  statut TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE AS existe,
    p.nom,
    p.prenom,
    e.statut
  FROM eleves e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.educmaster = p_educmaster
  LIMIT 1;
END;
$$;

-- Donner les droits d'exécution
GRANT EXECUTE ON FUNCTION public.check_educmaster_exists(TEXT) TO authenticated;