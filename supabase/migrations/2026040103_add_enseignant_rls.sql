-- ============================================================================
-- MIGRATION: RLS pour les tables du workflow enseignant
-- Date: 2026-04-02
-- Description: Activation RLS et politiques pour toutes les nouvelles tables
-- ============================================================================

-- ============================================================================
-- 1. RLS SUR invitation_codes
-- ============================================================================

ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Chef d'établissement, DE et AE peuvent créer des invitations
CREATE POLICY "Chef_DE_AE peuvent créer des invitations" ON invitation_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('chef_etablissement', 'membre_administratif')
      AND user_roles.is_active = true
      AND user_roles.etablissement_id = invitation_codes.etablissement_id
    )
  );

-- Les invités peuvent voir leurs propres invitations
CREATE POLICY "Invités peuvent voir leurs invitations" ON invitation_codes
  FOR SELECT USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Les chefs et DE peuvent voir toutes les invitations de leur établissement
CREATE POLICY "Chef_DE peuvent voir toutes les invitations" ON invitation_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('chef_etablissement', 'membre_administratif')
      AND user_roles.is_active = true
      AND user_roles.etablissement_id = invitation_codes.etablissement_id
    )
  );

-- ============================================================================
-- 2. RLS SUR enseignant_classes
-- ============================================================================

ALTER TABLE enseignant_classes ENABLE ROW LEVEL SECURITY;

-- Chef, DE, AE peuvent gérer les affectations
CREATE POLICY "Chef_DE_AE peuvent gérer enseignant_classes" ON enseignant_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('chef_etablissement', 'membre_administratif')
      AND user_roles.is_active = true
      AND user_roles.etablissement_id = (
        SELECT etablissement_id FROM classes WHERE id = enseignant_classes.classe_id
      )
    )
  );

-- Les enseignants peuvent voir leurs propres affectations
CREATE POLICY "Enseignants peuvent voir leurs affectations" ON enseignant_classes
  FOR SELECT USING (
    enseignant_id = auth.uid()
  );

-- ============================================================================
-- 3. RLS SUR enseignant_matieres
-- ============================================================================

ALTER TABLE enseignant_matieres ENABLE ROW LEVEL SECURITY;

-- Chef, DE, AE peuvent gérer les matières
CREATE POLICY "Chef_DE_AE peuvent gérer enseignant_matieres" ON enseignant_matieres
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('chef_etablissement', 'membre_administratif')
      AND user_roles.is_active = true
      AND user_roles.etablissement_id = (
        SELECT etablissement_id FROM matieres WHERE id = enseignant_matieres.matiere_id
      )
    )
  );

-- Les enseignants peuvent voir leurs propres matières
CREATE POLICY "Enseignants peuvent voir leurs matières" ON enseignant_matieres
  FOR SELECT USING (
    enseignant_id = auth.uid()
  );

-- ============================================================================
-- 4. RLS SUR groupes_eleves
-- ============================================================================

ALTER TABLE groupes_eleves ENABLE ROW LEVEL SECURITY;

-- Chef, DE, AE peuvent gérer les groupes
CREATE POLICY "Chef_DE_AE peuvent gérer groupes_eleves" ON groupes_eleves
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('chef_etablissement', 'membre_administratif')
      AND user_roles.is_active = true
      AND user_roles.etablissement_id = (
        SELECT etablissement_id FROM classes WHERE id = groupes_eleves.classe_id
      )
    )
  );

-- Les enseignants peuvent voir les groupes de leurs classes
CREATE POLICY "Enseignants peuvent voir groupes_eleves" ON groupes_eleves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enseignant_classes
      WHERE enseignant_classes.enseignant_id = auth.uid()
      AND enseignant_classes.classe_id = groupes_eleves.classe_id
    )
  );

-- ============================================================================
-- 5. RLS SUR eleve_groupes
-- ============================================================================

ALTER TABLE eleve_groupes ENABLE ROW LEVEL SECURITY;

-- Chef, DE, AE peuvent gérer les affectations d'élèves
CREATE POLICY "Chef_DE_AE peuvent gérer eleve_groupes" ON eleve_groupes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('chef_etablissement', 'membre_administratif')
      AND user_roles.is_active = true
      AND user_roles.etablissement_id = (
        SELECT e.etablissement_id 
        FROM eleves e 
        WHERE e.id = eleve_groupes.eleve_id
      )
    )
  );

-- Les enseignants peuvent voir les affectations de leurs élèves
CREATE POLICY "Enseignants peuvent voir eleve_groupes" ON eleve_groupes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enseignant_classes ec
      JOIN eleves e ON e.classe_id = ec.classe_id
      WHERE ec.enseignant_id = auth.uid()
      AND e.id = eleve_groupes.eleve_id
    )
  );

-- ============================================================================
-- 6. RLS SUR enseignant_groupes
-- ============================================================================

ALTER TABLE enseignant_groupes ENABLE ROW LEVEL SECURITY;

-- Chef, DE, AE peuvent gérer les affectations enseignants-groupes
CREATE POLICY "Chef_DE_AE peuvent gérer enseignant_groupes" ON enseignant_groupes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('chef_etablissement', 'membre_administratif')
      AND user_roles.is_active = true
      AND user_roles.etablissement_id = (
        SELECT e.etablissement_id 
        FROM groupes_eleves g
        JOIN classes c ON c.id = g.classe_id
        WHERE g.id = enseignant_groupes.groupe_id
      )
    )
  );

-- Les enseignants peuvent voir leurs propres affectations
CREATE POLICY "Enseignants peuvent voir leurs affectations groupes" ON enseignant_groupes
  FOR SELECT USING (
    enseignant_id = auth.uid()
  );

-- ============================================================================
-- 7. FONCTIONS HELPER POUR LES PLAFONDS
-- ============================================================================

-- Fonction pour compter le nombre d'enseignants dans un département
CREATE OR REPLACE FUNCTION count_enseignants_by_departement(
  p_etablissement_id uuid,
  p_departement text
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(DISTINCT ur.user_id)
  INTO v_count
  FROM user_roles ur
  JOIN profiles p ON p.id = ur.user_id
  WHERE ur.etablissement_id = p_etablissement_id
    AND ur.role = 'enseignant'
    AND ur.is_active = true
    AND p.metadata->>'departement' = p_departement;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Fonction pour vérifier si un AE peut inviter un nouvel enseignant
CREATE OR REPLACE FUNCTION can_ae_invite(
  p_ae_id uuid,
  p_departement text,
  p_etablissement_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_plafond integer;
  v_current_count integer;
BEGIN
  -- Récupérer le plafond de l'AE
  SELECT plafond INTO v_plafond
  FROM delegations
  WHERE delegue_id = p_ae_id
    AND type = 'ae'
    AND departement = p_departement
    AND etablissement_id = p_etablissement_id
    AND is_active = true;
  
  IF v_plafond IS NULL THEN
    RETURN false;
  END IF;
  
  -- Compter les enseignants actuels dans le département
  v_current_count := count_enseignants_by_departement(p_etablissement_id, p_departement);
  
  RETURN v_current_count < v_plafond;
END;
$$;

-- ============================================================================
-- 8. COMMENTAIRES
-- ============================================================================

COMMENT ON FUNCTION count_enseignants_by_departement IS 'Compte le nombre d''enseignants dans un département donné';
COMMENT ON FUNCTION can_ae_invite IS 'Vérifie si un Animateur d''Établissement peut inviter un nouvel enseignant selon son plafond';