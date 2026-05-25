-- Migration: Correction de la fonction get_user_etablissement
-- Date: 2026-04-08
-- Description: La fonction interrogeait profiles.etablissement_id qui n'existe pas
--              Correction pour utiliser user_roles.etablissement_id

-- 1. Supprimer l'ancienne fonction avec CASCADE (supprime aussi les politiques dépendantes)
DROP FUNCTION IF EXISTS get_user_etablissement() CASCADE;

-- 2. Créer la nouvelle fonction corrigée
CREATE OR REPLACE FUNCTION get_user_etablissement()
RETURNS UUID AS $$
DECLARE
  user_etablissement UUID;
BEGIN
  -- Récupérer l'établissement depuis user_roles
  SELECT etablissement_id INTO user_etablissement
  FROM user_roles
  WHERE user_id = auth.uid() 
    AND is_active = true
  LIMIT 1;
  
  RETURN user_etablissement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Commentaire
COMMENT ON FUNCTION get_user_etablissement() IS 
'Retourne l''ID de l''établissement de l''utilisateur connecté.';