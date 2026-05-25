/*
  # SchoolNet - Ajout du rôle visiteur et table des demandes de rôle
  
  ## Description
  - Ajout du rôle 'visiteur' à l'ENUM user_role
  - Création de la table demandes_role pour gérer les demandes de rôles supplémentaires
  
  ## Principes
  - ADDITIF : ne supprime aucune colonne existante
  - Chaque utilisateur reçoit automatiquement le rôle visiteur à l'inscription
  - Les rôles supplémentaires doivent être demandés et validés
  
  ## Date
  28 Mars 2026
*/

-- ============================================================================
-- ÉTAPE 1 : Ajout du rôle 'visiteur' à l'ENUM user_role
-- ============================================================================

-- Ajout de la valeur si elle n'existe pas déjà
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'visiteur';

-- ============================================================================
-- ÉTAPE 2 : Création de la table demandes_role
-- ============================================================================

CREATE TABLE IF NOT EXISTS demandes_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_souhaite user_role NOT NULL,
  justificatif_url text,
  message text,
  statut request_status DEFAULT 'en_attente',
  traitee_at timestamptz,
  traitee_par uuid REFERENCES auth.users(id),
  commentaire_admin text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ÉTAPE 3 : Index pour performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_demandes_role_user ON demandes_role(user_id);
CREATE INDEX IF NOT EXISTS idx_demandes_role_statut ON demandes_role(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_role_role ON demandes_role(role_souhaite);

-- ============================================================================
-- ÉTAPE 4 : Activation RLS
-- ============================================================================

ALTER TABLE demandes_role ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 5 : Politiques RLS pour demandes_role
-- ============================================================================

-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view own role requests"
  ON demandes_role FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer des demandes
CREATE POLICY "Users can create role requests"
  ON demandes_role FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs demandes en attente
CREATE POLICY "Users can update own pending role requests"
  ON demandes_role FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND statut = 'en_attente')
  WITH CHECK (user_id = auth.uid() AND statut = 'en_attente');

-- Les administrateurs peuvent tout voir
CREATE POLICY "Admins can view all role requests"
  ON demandes_role FOR SELECT
  TO authenticated
  USING (has_role('admin'));

-- Les administrateurs peuvent tout gérer
CREATE POLICY "Admins can manage all role requests"
  ON demandes_role FOR ALL
  TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

-- ============================================================================
-- ÉTAPE 6 : Trigger pour mise à jour automatique updated_at
-- ============================================================================

CREATE TRIGGER update_demandes_role_updated_at
  BEFORE UPDATE ON demandes_role
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ÉTAPE 7 : Notes de migration
-- ============================================================================

COMMENT ON TABLE demandes_role IS 'Demandes de rôles supplémentaires soumises par les utilisateurs';
COMMENT ON COLUMN demandes_role.role_souhaite IS 'Rôle demandé (eleve, parent, enseignant, chef_etablissement)';
COMMENT ON COLUMN demandes_role.statut IS 'Statut de la demande : en_attente, en_cours, valide, rejete, annule';