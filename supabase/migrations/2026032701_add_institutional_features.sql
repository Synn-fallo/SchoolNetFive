/*
  # SchoolNet - Institutional Features Migration (Phase 2)
  
  ## Description
  Migration additive pour les fonctionnalités institutionnelles :
  - Demandes de création d'établissement
  - Demandes de partenariat
  - Préférences utilisateur
  - Vues publiques pour l'annuaire
  
  ## Principes
  - ADDITIF UNIQUEMENT : ne modifie aucune table existante
  - Utilise les helpers RLS existants (has_role, get_user_etablissement)
  - Respecte les conventions de nommage et de structure
  
  ## Date
  27 Mars 2026
*/

-- ============================================================================
-- NOUVEAUX TYPES ENUM (si nécessaire)
-- ============================================================================

-- Statut des demandes institutionnelles
CREATE TYPE request_status AS ENUM (
  'en_attente',
  'en_cours',
  'valide',
  'rejete',
  'annule'
);

-- Type de partenaires
CREATE TYPE partenaire_type AS ENUM (
  'ong',
  'operateur_telecom',
  'editeur',
  'sponsor',
  'autre'
);

-- Type de collaboration
CREATE TYPE collaboration_type AS ENUM (
  'sponsoring',
  'contenu',
  'technique',
  'formation',
  'autre'
);

-- ============================================================================
-- TABLE : demandes_etablissement
-- ============================================================================

CREATE TABLE IF NOT EXISTS demandes_etablissement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demandeur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_etablissement text NOT NULL,
  slug text UNIQUE,
  type_etablissement text NOT NULL CHECK (type_etablissement IN ('public', 'prive')),
  adresse text NOT NULL,
  ville text NOT NULL,
  telephone text NOT NULL,
  email_contact text NOT NULL,
  site_web text,
  plan_souhaite text NOT NULL CHECK (plan_souhaite IN ('gratuit', 'basique', 'premium', 'entreprise')),
  justificatifs_urls jsonb DEFAULT '[]',
  message_demandeur text,
  statut request_status DEFAULT 'en_attente',
  commentaire_admin text,
  traitee_at timestamptz,
  traitee_par uuid REFERENCES auth.users(id),
  etablissement_cree_id uuid REFERENCES etablissements(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_demandes_etablissement_demandeur ON demandes_etablissement(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_demandes_etablissement_statut ON demandes_etablissement(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_etablissement_ville ON demandes_etablissement(ville);
CREATE INDEX IF NOT EXISTS idx_demandes_etablissement_created_at ON demandes_etablissement(created_at);

-- ============================================================================
-- TABLE : demandes_partenariat
-- ============================================================================

CREATE TABLE IF NOT EXISTS demandes_partenariat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demandeur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_partenaire partenaire_type NOT NULL,
  organisation_nom text NOT NULL,
  organisation_site text,
  organisation_siege text,
  contact_nom text NOT NULL,
  contact_email text NOT NULL,
  contact_telephone text NOT NULL,
  type_collaboration collaboration_type NOT NULL,
  proposition text NOT NULL,
  montant_propose numeric(10,2),
  documents_urls jsonb DEFAULT '[]',
  statut request_status DEFAULT 'en_attente',
  notes_internes text,
  traitee_at timestamptz,
  traitee_par uuid REFERENCES auth.users(id),
  partenaire_cree_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_demandes_partenariat_demandeur ON demandes_partenariat(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_demandes_partenariat_statut ON demandes_partenariat(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_partenariat_type ON demandes_partenariat(type_partenaire);
CREATE INDEX IF NOT EXISTS idx_demandes_partenariat_created_at ON demandes_partenariat(created_at);

-- ============================================================================
-- TABLE : user_preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb DEFAULT '{
    "sidebar": {
      "isOpen": true,
      "mode": "tabs"
    },
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    },
    "theme": "light"
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- ============================================================================
-- VUES PUBLIQUES
-- ============================================================================

-- Vue publique pour la liste des établissements (annuaire)
CREATE OR REPLACE VIEW public_etablissements AS
SELECT 
  id,
  nom,
  slug,
  description,
  adresse,
  telephone,
  email,
  logo_url,
  couleur_primaire,
  couleur_secondaire,
  is_active,
  created_at
FROM etablissements
WHERE is_active = true;

-- Vue publique pour les détails d'un établissement (page vitrine)
CREATE OR REPLACE VIEW public_etablissement_details AS
SELECT 
  e.id,
  e.nom,
  e.slug,
  e.description,
  e.adresse,
  e.telephone,
  e.email,
  e.logo_url,
  e.couleur_primaire,
  e.couleur_secondaire,
  e.is_active,
  e.created_at,
  e.updated_at,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'nom', c.nom,
        'niveau', c.niveau,
        'capacite', c.capacite
      )
      ORDER BY c.niveau, c.nom
    )
    FROM classes c
    WHERE c.etablissement_id = e.id AND c.is_active = true
  ) AS classes,
  (
    SELECT COUNT(*)::integer
    FROM eleves el
    WHERE el.etablissement_id = e.id AND el.statut = 'actif'
  ) AS effectif_total
FROM etablissements e
WHERE e.is_active = true;

-- ============================================================================
-- ACTIVATION RLS SUR LES NOUVELLES TABLES
-- ============================================================================

ALTER TABLE demandes_etablissement ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_partenariat ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITIQUES RLS ADDITIVES
-- ============================================================================

-- ============================================================================
-- demandes_etablissement POLICIES
-- ============================================================================

-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view own establishment requests"
  ON demandes_etablissement FOR SELECT
  TO authenticated
  USING (demandeur_id = auth.uid());

-- Les utilisateurs peuvent créer des demandes
CREATE POLICY "Users can create establishment requests"
  ON demandes_etablissement FOR INSERT
  TO authenticated
  WITH CHECK (demandeur_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs demandes en attente
CREATE POLICY "Users can update own pending establishment requests"
  ON demandes_etablissement FOR UPDATE
  TO authenticated
  USING (demandeur_id = auth.uid() AND statut = 'en_attente')
  WITH CHECK (demandeur_id = auth.uid() AND statut = 'en_attente');

-- Les utilisateurs peuvent annuler leurs demandes en attente
CREATE POLICY "Users can cancel own establishment requests"
  ON demandes_etablissement FOR DELETE
  TO authenticated
  USING (demandeur_id = auth.uid() AND statut = 'en_attente');

-- Les administrateurs peuvent tout voir
CREATE POLICY "Admins can view all establishment requests"
  ON demandes_etablissement FOR SELECT
  TO authenticated
  USING (has_role('admin'));

-- Les administrateurs peuvent tout gérer
CREATE POLICY "Admins can manage all establishment requests"
  ON demandes_etablissement FOR ALL
  TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

-- ============================================================================
-- demandes_partenariat POLICIES
-- ============================================================================

-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view own partnership requests"
  ON demandes_partenariat FOR SELECT
  TO authenticated
  USING (demandeur_id = auth.uid());

-- Les utilisateurs peuvent créer des demandes
CREATE POLICY "Users can create partnership requests"
  ON demandes_partenariat FOR INSERT
  TO authenticated
  WITH CHECK (demandeur_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs demandes en attente
CREATE POLICY "Users can update own pending partnership requests"
  ON demandes_partenariat FOR UPDATE
  TO authenticated
  USING (demandeur_id = auth.uid() AND statut = 'en_attente')
  WITH CHECK (demandeur_id = auth.uid() AND statut = 'en_attente');

-- Les utilisateurs peuvent annuler leurs demandes en attente
CREATE POLICY "Users can cancel own partnership requests"
  ON demandes_partenariat FOR DELETE
  TO authenticated
  USING (demandeur_id = auth.uid() AND statut = 'en_attente');

-- Les administrateurs peuvent tout voir
CREATE POLICY "Admins can view all partnership requests"
  ON demandes_partenariat FOR SELECT
  TO authenticated
  USING (has_role('admin'));

-- Les administrateurs peuvent tout gérer
CREATE POLICY "Admins can manage all partnership requests"
  ON demandes_partenariat FOR ALL
  TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

-- ============================================================================
-- user_preferences POLICIES
-- ============================================================================

-- Les utilisateurs peuvent voir leurs propres préférences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leurs préférences
CREATE POLICY "Users can create own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs préférences
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent supprimer leurs préférences
CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- GRANT ACCÈS AUX VUES PUBLIQUES
-- ============================================================================

-- Accès en lecture pour les utilisateurs anonymes et authentifiés
GRANT SELECT ON public_etablissements TO anon, authenticated;
GRANT SELECT ON public_etablissement_details TO anon, authenticated;

-- ============================================================================
-- TRIGGER DE MISE À JOUR AUTOMATIQUE (updated_at)
-- ============================================================================

-- Fonction trigger générique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application aux nouvelles tables
CREATE TRIGGER update_demandes_etablissement_updated_at
  BEFORE UPDATE ON demandes_etablissement
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demandes_partenariat_updated_at
  BEFORE UPDATE ON demandes_partenariat
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTES DE MIGRATION
-- ============================================================================

-- Migration exécutée le 27 Mars 2026
-- Ajout des fonctionnalités institutionnelles pour la Phase 2
-- Tables créées : demandes_etablissement, demandes_partenariat, user_preferences
-- Vues créées : public_etablissements, public_etablissement_details
-- Politiques RLS : 20+ politiques additives