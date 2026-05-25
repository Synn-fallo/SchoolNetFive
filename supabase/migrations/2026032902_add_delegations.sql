/*
  # SchoolNet - Table des délégations hiérarchiques
  
  ## Description
  Permet de gérer les relations hiérarchiques entre :
  - Chef d'établissement → Directeur des Études
  - Directeur des Études → Animateur d'Établissement
  - Chef / DE / AE → Enseignants
  - Chef → Personnel Administratif / Vie Scolaire
  
  ## Principes
  - ADDITIF : ne supprime aucune table existante
  - Supporte la délégation de droits granulaire
  
  ## Date
  30 Mars 2026
*/

-- ============================================================================
-- ÉTAPE A.3 : Création de la table delegations
-- ============================================================================

CREATE TABLE IF NOT EXISTS delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegue_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  etablissement_id uuid NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'directeur_etudes',      -- Chef → DE
    'animateur_etablissement', -- DE → AE
    'enseignant',            -- Chef/DE/AE → Enseignant
    'personnel_administratif', -- Chef → Personnel Admin
    'personnel_vie_scolaire'   -- Chef → Personnel Vie Scolaire
  )),
  departement text,           -- Pour les AE : département supervisé
  plafond integer,            -- Pour les AE : nombre max d'enseignants
  droits jsonb DEFAULT '{"lecture": true, "ecriture": true}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(delegant_id, delegue_id, etablissement_id, type)
);

-- ============================================================================
-- Index pour performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_delegations_delegant ON delegations(delegant_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegue ON delegations(delegue_id);
CREATE INDEX IF NOT EXISTS idx_delegations_etablissement ON delegations(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_delegations_type ON delegations(type);

-- ============================================================================
-- Trigger pour updated_at
-- ============================================================================

CREATE TRIGGER update_delegations_updated_at
  BEFORE UPDATE ON delegations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;

-- Les politiques RLS seront ajoutées dans A.5