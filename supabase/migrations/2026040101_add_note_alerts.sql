-- ============================================================================
-- Migration: Ajout des alertes sur les notes
-- Date: 2026-04-01
-- Description: Permet aux parents/élèves de configurer des alertes sur seuils de notes
-- ============================================================================

-- Table des alertes sur les notes
CREATE TABLE IF NOT EXISTS note_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id uuid NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  matiere_id uuid REFERENCES matieres(id) ON DELETE CASCADE,
  seuil numeric(5,2) NOT NULL CHECK (seuil >= 0 AND seuil <= 20),
  type text NOT NULL CHECK (type IN ('inférieur', 'supérieur')),
  active boolean DEFAULT true,
  notification_channels jsonb DEFAULT '["push", "email"]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_note_alerts_eleve ON note_alerts(eleve_id);
CREATE INDEX IF NOT EXISTS idx_note_alerts_matiere ON note_alerts(matiere_id);
CREATE INDEX IF NOT EXISTS idx_note_alerts_active ON note_alerts(active);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_note_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_note_alerts_updated_at
  BEFORE UPDATE ON note_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_note_alerts_updated_at();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE note_alerts ENABLE ROW LEVEL SECURITY;

-- Politique 1: Les parents peuvent gérer les alertes de leurs enfants
CREATE POLICY "Parents peuvent gérer les alertes de leurs enfants" ON note_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM eleves 
      WHERE eleves.id = note_alerts.eleve_id 
      AND eleves.parent_id = auth.uid()
    )
  );

-- Politique 2: Les élèves peuvent gérer leurs propres alertes
CREATE POLICY "Élèves peuvent gérer leurs propres alertes" ON note_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM eleves 
      WHERE eleves.id = note_alerts.eleve_id 
      AND eleves.user_id = auth.uid()
    )
  );

-- Politique 3: Les enseignants (chefs d'établissement et administrateurs) peuvent consulter les alertes
CREATE POLICY "Chefs d'établissement et admins peuvent consulter les alertes" ON note_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('chef_etablissement', 'admin')
      AND user_roles.is_active = true
    )
  );

-- ============================================================================
-- Log d'audit pour les modifications d'alertes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_note_alert_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (etablissement_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    (SELECT etablissement_id FROM eleves WHERE id = NEW.eleve_id),
    auth.uid(),
    TG_OP,
    'note_alerts',
    NEW.id,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_note_alerts_audit
  AFTER INSERT OR UPDATE OR DELETE ON note_alerts
  FOR EACH ROW
  EXECUTE FUNCTION log_note_alert_changes();

-- ============================================================================
-- Commentaires pour documentation
-- ============================================================================

COMMENT ON TABLE note_alerts IS 'Configurations d''alertes pour les notes des élèves';
COMMENT ON COLUMN note_alerts.eleve_id IS 'Élève concerné par l''alerte';
COMMENT ON COLUMN note_alerts.matiere_id IS 'Matière spécifique (NULL = toutes matières)';
COMMENT ON COLUMN note_alerts.seuil IS 'Seuil de déclenchement (entre 0 et 20)';
COMMENT ON COLUMN note_alerts.type IS 'Type d''alerte: inférieur (note < seuil) ou supérieur (note > seuil)';
COMMENT ON COLUMN note_alerts.active IS 'Alerte activée ou désactivée';
COMMENT ON COLUMN note_alerts.notification_channels IS 'Canaux de notification: push, email, sms';