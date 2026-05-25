-- Migration: Ajout des colonnes pour Autorité et Partenaire
-- Date: 13/04/2026
-- Description: Ajout des champs nécessaires pour la gestion des rôles Autorité et Partenaire

-- ============================================================
-- 1. Ajout des colonnes dans la table profiles
-- ============================================================

-- Ajout du périmètre géographique pour Autorité
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS perimetre TEXT DEFAULT 'national';

-- Ajout de l'ID de la zone (commune ou département) für Autorité
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS zone_id UUID;

-- Ajout du nom de l'organisation pour Partenaire
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organisation TEXT;

-- Ajout du type d'organisation pour Partenaire (ONG, entreprise, fondation, etc.)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organisation_type TEXT;

-- ============================================================
-- 2. Contraintes et validation
-- ============================================================

-- Supprimer la contrainte si elle existe déjà
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_perimetre_check;

-- Ajouter la contrainte
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_perimetre_check 
CHECK (perimetre IN ('commune', 'departement', 'national'));

-- ============================================================
-- 3. Index pour les performances
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_perimetre ON public.profiles(perimetre);
CREATE INDEX IF NOT EXISTS idx_profiles_zone_id ON public.profiles(zone_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organisation ON public.profiles(organisation);

-- ============================================================
-- 4. Commentaires sur les colonnes
-- ============================================================

COMMENT ON COLUMN public.profiles.perimetre IS 'Périmètre géographique pour Autorité : commune, departement, national';
COMMENT ON COLUMN public.profiles.zone_id IS 'ID de la zone (commune ou département) pour Autorité';
COMMENT ON COLUMN public.profiles.organisation IS 'Nom de l organisation pour Partenaire (ONG, entreprise, etc.)';
COMMENT ON COLUMN public.profiles.organisation_type IS 'Type d organisation : ONG, entreprise, fondation, etc.';