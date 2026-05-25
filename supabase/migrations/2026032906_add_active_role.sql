/*
  # SchoolNet - Ajout de la colonne active_role pour la sélection de rôle actif
  
  ## Description
  Permet aux utilisateurs multi-rôles de choisir leur rôle actif.
  La valeur stockée correspond à un rôle valide dans user_roles.
  
  ## Date
  29 Mars 2026
*/

-- Ajout de la colonne active_role à profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS active_role text;

-- Commentaire pour documentation
COMMENT ON COLUMN profiles.active_role IS 
'Rôle actif de l''utilisateur (pour les multi-rôles). Valeur parmi: eleve, parent, enseignant, chef_etablissement, admin, etc.';

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_profiles_active_role ON profiles(active_role);

-- Mettre à jour les profils existants avec leur premier rôle actif
UPDATE profiles p
SET active_role = (
  SELECT role 
  FROM user_roles 
  WHERE user_id = p.id 
  AND is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE active_role IS NULL;