/*
  # SchoolNet - Table des relances programmées
  
  ## Description
  Gère les notifications de relance pour les établissements inactifs
  - J+7 après Phase 2 sans abonnement
  - J+30 après Phase 2 sans abonnement
  - Relances pour demandes en attente >48h
  
  ## Date
  30 Mars 2026
*/

-- ============================================================================
-- ÉTAPE A.4 : Création de la table relances
-- ============================================================================

CREATE TABLE IF NOT EXISTS relances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'phase2_j7',        -- Relance 7 jours après Phase 2
    'phase2_j30',       -- Relance 30 jours après Phase 2
    'demande_48h',      -- Demande en attente >48h
    'paiement_echoue'   -- Paiement échoué répété
  )),
  date_envoi timestamptz DEFAULT now(),
  statut text DEFAULT 'envoye' CHECK (statut IN ('envoye', 'en_attente', 'echoue')),
  message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- Index pour performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_relances_etablissement ON relances(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_relances_user ON relances(user_id);
CREATE INDEX IF NOT EXISTS idx_relances_type ON relances(type);
CREATE INDEX IF NOT EXISTS idx_relances_date ON relances(date_envoi);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE relances ENABLE ROW LEVEL SECURITY;