/*
  # SchoolNet - Nouvelles politiques RLS pour les rôles administratifs
  
  ## Description
  Politiques pour:
  - membre_administratif
  - delegations
  - relances
  
  ## Date
  30 Mars 2026
*/

-- ============================================================================
-- ÉTAPE A.5.1 : Politiques pour delegations
-- ============================================================================

-- Les chefs peuvent tout gérer
CREATE POLICY "Chef etablissement peut gerer delegations"
  ON delegations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'chef_etablissement'
      AND etablissement_id = delegations.etablissement_id
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'chef_etablissement'
      AND etablissement_id = delegations.etablissement_id
      AND is_active = true
    )
  );

-- Les DE peuvent voir leurs délégations
CREATE POLICY "Directeur etudes peut voir ses delegations"
  ON delegations FOR SELECT
  TO authenticated
  USING (
    delegue_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'membre_administratif'
      AND metadata->>'type_admin' = 'de'
      AND is_active = true
    )
  );

-- Les délégués peuvent voir leurs propres délégations
CREATE POLICY "Delegue peut voir ses delegations"
  ON delegations FOR SELECT
  TO authenticated
  USING (delegue_id = auth.uid());

-- ============================================================================
-- ÉTAPE A.5.2 : Politiques pour relances
-- ============================================================================

-- Les admins peuvent tout voir
CREATE POLICY "Admins peuvent gerer relances"
  ON relances FOR ALL
  TO authenticated
  USING (has_role('admin'));

-- Les chefs peuvent voir les relances de leur établissement
CREATE POLICY "Chef peut voir relances de son etablissement"
  ON relances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'chef_etablissement'
      AND etablissement_id = relances.etablissement_id
      AND is_active = true
    )
  );

-- ============================================================================
-- ÉTAPE A.5.3 : Mise à jour des politiques pour membre_administratif
-- ============================================================================

-- Les membres administratifs peuvent voir les données de leur périmètre
CREATE POLICY "Membre administratif peut voir donnees de son perimetre"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    has_role('membre_administratif') OR
    has_role('chef_etablissement')
  );

-- Les membres administratifs peuvent voir les classes de leur établissement
CREATE POLICY "Membre administratif peut voir classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    etablissement_id = get_user_etablissement() AND
    (has_role('chef_etablissement') OR has_role('membre_administratif'))
  );