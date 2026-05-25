-- =====================================================
-- MIGRATION: Ajout de la colonne metadata à demandes_role
-- Date: 05/04/2026
-- Description: Permet de stocker les métadonnées spécifiques
-- aux demandes institutionnelles (chef_etablissement, autorite, partenaire)
-- =====================================================

-- Ajout de la colonne metadata si elle n'existe pas
ALTER TABLE demandes_role 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Création d'un index pour améliorer les performances sur les requêtes JSON
CREATE INDEX IF NOT EXISTS idx_demandes_role_metadata 
ON demandes_role USING GIN (metadata);