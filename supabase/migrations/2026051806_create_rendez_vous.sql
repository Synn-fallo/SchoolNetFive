-- Migration: Création de la table rendez_vous
-- Date: 2026-05-18
-- Description: Gestion des rendez-vous parent-enseignant

-- ============================================================
-- TABLE rendez_vous
-- ============================================================
CREATE TABLE rendez_vous (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  date_rdv DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  motif TEXT NOT NULL,
  statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirme', 'refuse', 'annule', 'termine')),
  motif_refus TEXT,
  lieu VARCHAR(100) DEFAULT 'Salle des professeurs',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE rendez_vous IS 'Rendez-vous entre parents et enseignants';
COMMENT ON COLUMN rendez_vous.statut IS 'en_attente, confirme, refuse, annule, termine';

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX idx_rdv_parent ON rendez_vous(parent_id);
CREATE INDEX idx_rdv_enseignant ON rendez_vous(enseignant_id);
CREATE INDEX idx_rdv_eleve ON rendez_vous(eleve_id);
CREATE INDEX idx_rdv_date ON rendez_vous(date_rdv);
CREATE INDEX idx_rdv_statut ON rendez_vous(statut);

-- ============================================================
-- TRIGGER
-- ============================================================
CREATE TRIGGER trigger_rendez_vous_updated_at
  BEFORE UPDATE ON rendez_vous
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- POLITIQUES RLS
-- ============================================================
ALTER TABLE rendez_vous ENABLE ROW LEVEL SECURITY;

-- Parents voient leurs rendez-vous
CREATE POLICY "parents_view_own_rdv" ON rendez_vous
  FOR SELECT
  USING (
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
  );

-- Parents peuvent créer des rendez-vous
CREATE POLICY "parents_insert_rdv" ON rendez_vous
  FOR INSERT
  WITH CHECK (
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
  );

-- Parents peuvent annuler leurs rendez-vous (si en attente ou confirmé)
CREATE POLICY "parents_update_own_rdv" ON rendez_vous
  FOR UPDATE
  USING (
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
    AND statut IN ('en_attente', 'confirme')
  )
  WITH CHECK (
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
    AND statut IN ('en_attente', 'confirme', 'annule')
  );

-- Enseignants voient les rendez-vous les concernant
CREATE POLICY "enseignants_view_their_rdv" ON rendez_vous
  FOR SELECT
  USING (enseignant_id = auth.uid());

-- Enseignants peuvent modifier statut (confirmer/refuser)
CREATE POLICY "enseignants_update_rdv" ON rendez_vous
  FOR UPDATE
  USING (enseignant_id = auth.uid())
  WITH CHECK (
    enseignant_id = auth.uid()
    AND statut IN ('en_attente', 'confirme', 'refuse')
  );

-- Admin/Chef voient tous les rendez-vous
CREATE POLICY "admins_full_access_rdv" ON rendez_vous
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'chef_etablissement')
      AND user_roles.is_active = true
    )
  );