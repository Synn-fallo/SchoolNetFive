/*
  # SchoolNet - Fonctions helper pour les rôles administratifs
  
  ## Description
  Fonctions utilitaires pour vérifier les types de membres administratifs
  et les relations hiérarchiques
  
  ## Date
  30 Mars 2026
*/

-- ============================================================================
-- ÉTAPE A.6.1 : Fonction has_admin_type
-- ============================================================================

CREATE OR REPLACE FUNCTION has_admin_type(required_type text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'membre_administratif'
    AND is_active = true
    AND metadata->>'type_admin' = required_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ÉTAPE A.6.2 : Fonction supervises_teacher
-- ============================================================================

CREATE OR REPLACE FUNCTION supervises_teacher(teacher_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Vérifier si l'utilisateur est Chef
  IF has_role('chef_etablissement') THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = teacher_id
      AND ur.role = 'enseignant'
      AND ur.etablissement_id = get_user_etablissement()
    );
  END IF;
  
  -- Vérifier si l'utilisateur est DE ou AE avec délégation
  IF has_admin_type('de') OR has_admin_type('ae') THEN
    RETURN EXISTS (
      SELECT 1 FROM delegations
      WHERE delegue_id = auth.uid()
      AND type = 'enseignant'
      AND cible_id = teacher_id
      AND is_active = true
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ÉTAPE A.6.3 : Fonction get_managed_teachers
-- ============================================================================

CREATE OR REPLACE FUNCTION get_managed_teachers()
RETURNS SETOF uuid AS $$
BEGIN
  -- Chef voit tous les enseignants de l'établissement
  IF has_role('chef_etablissement') THEN
    RETURN QUERY
    SELECT user_id FROM user_roles
    WHERE role = 'enseignant'
    AND etablissement_id = get_user_etablissement()
    AND is_active = true;
  END IF;
  
  -- DE ou AE voit les enseignants sous délégation
  IF has_admin_type('de') OR has_admin_type('ae') THEN
    RETURN QUERY
    SELECT cible_id::uuid FROM delegations
    WHERE delegue_id = auth.uid()
    AND type = 'enseignant'
    AND is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ÉTAPE A.6.4 : Fonction can_manage_teacher
-- ============================================================================

CREATE OR REPLACE FUNCTION can_manage_teacher(teacher_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Chef peut gérer tous les enseignants
  IF has_role('chef_etablissement') THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = teacher_id
      AND role = 'enseignant'
      AND etablissement_id = get_user_etablissement()
    );
  END IF;
  
  -- DE ou AE peut gérer les enseignants sous délégation
  IF has_admin_type('de') OR has_admin_type('ae') THEN
    RETURN EXISTS (
      SELECT 1 FROM delegations
      WHERE delegue_id = auth.uid()
      AND type = 'enseignant'
      AND cible_id = teacher_id
      AND is_active = true
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;