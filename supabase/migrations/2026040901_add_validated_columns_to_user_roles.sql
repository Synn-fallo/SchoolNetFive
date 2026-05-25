-- Migration: Ajout des colonnes validated_at et validated_by à user_roles
-- Date: 2026-04-09
-- Description: Permet de tracer qui a validé un rôle et quand

-- 1. Ajouter la colonne validated_at (date de validation)
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE;

-- 2. Ajouter la colonne validated_by (qui a validé)
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Mettre à jour les lignes existantes (validated_at = created_at pour les rôles déjà actifs)
UPDATE user_roles 
SET validated_at = created_at 
WHERE validated_at IS NULL AND is_active = true;

-- 4. Ajouter un commentaire pour documentation
COMMENT ON COLUMN user_roles.validated_at IS 'Date de validation du rôle par un administrateur';
COMMENT ON COLUMN user_roles.validated_by IS 'ID de l''utilisateur (admin) qui a validé ce rôle';

-- 5. Optionnel: Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_roles_validated_at ON user_roles(validated_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_validated_by ON user_roles(validated_by);