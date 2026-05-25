-- Migration: 2026041502_add_unique_constraint_user_preferences.sql
-- Description: Ajout d'une contrainte d'unicité sur la colonne user_id dans la table user_preferences
-- Auteur: SchoolNet
-- Date: 15/04/2026

-- ============================================================
-- 1. Vérifier si la contrainte existe déjà avant de l'ajouter
-- ============================================================

DO $$
BEGIN
    -- Vérifier si la contrainte n'existe pas déjà
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_preferences_user_id_unique' 
        AND table_name = 'user_preferences'
    ) THEN
        -- Ajouter la contrainte d'unicité
        ALTER TABLE user_preferences 
        ADD CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id);
        
        RAISE NOTICE 'Contrainte user_preferences_user_id_unique ajoutée avec succès';
    ELSE
        RAISE NOTICE 'La contrainte user_preferences_user_id_unique existe déjà';
    END IF;
END $$;

-- ============================================================
-- 2. Commentaire sur la contrainte
-- ============================================================

COMMENT ON CONSTRAINT user_preferences_user_id_unique ON user_preferences IS 'Garantit qu''un utilisateur ne peut avoir qu''une seule ligne de préférences';

-- ============================================================
-- 3. Vérification optionnelle (affiche les contraintes existantes)
-- ============================================================

-- Cette requête permet de vérifier les contraintes après migration
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'user_preferences';