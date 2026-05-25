-- Migration: Créer une vue sécurisée pour la vérification des EducMaster
-- Date: 2026-05-16
-- Objectif: Permettre aux utilisateurs authentifiés de vérifier l'existence
-- d'un EducMaster sans exposer toutes les données des élèves

-- ============================================================
-- 1. Créer la vue sécurisée
-- ============================================================

CREATE OR REPLACE VIEW public.v_educmaster_check AS
SELECT 
  e.educmaster,
  p.nom,
  p.prenom,
  p.sexe,
  e.date_naissance,
  e.etablissement_id,
  e.statut,
  e.matricule,
  est.nom AS etablissement_nom
FROM public.eleves e
LEFT JOIN public.profiles p ON p.id = e.user_id
LEFT JOIN public.etablissements est ON est.id = e.etablissement_id
WHERE e.statut IN ('actif', 'PRE_ACCEPTED');

-- ============================================================
-- 2. Donner les droits sur la vue
-- ============================================================

GRANT SELECT ON public.v_educmaster_check TO authenticated;
GRANT SELECT ON public.v_educmaster_check TO anon;

-- ============================================================
-- 3. Index pour accélérer les recherches par EducMaster
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_eleves_educmaster ON public.eleves(educmaster);

-- ============================================================
-- 4. Vérification (optionnelle - à exécuter manuellement après)
-- ============================================================
-- SELECT COUNT(*) FROM public.v_educmaster_check;