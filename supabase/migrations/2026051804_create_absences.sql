-- Migration: Création de la table absences
-- Date: 2026-05-18

CREATE TABLE absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date_absence DATE NOT NULL,
  heure_debut TIME,
  heure_fin TIME,
  motif TEXT,
  justifie BOOLEAN DEFAULT false,
  justificatif_url TEXT,
  declare_par UUID REFERENCES profiles(id),
  declare_le TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_absences_eleve ON absences(eleve_id);
CREATE INDEX idx_absences_date ON absences(date_absence);
CREATE INDEX idx_absences_classe ON absences(classe_id);
CREATE INDEX idx_absences_etablissement ON absences(etablissement_id);

CREATE TRIGGER trigger_absences_updated_at
  BEFORE UPDATE ON absences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Admin et Chef d'établissement
CREATE POLICY "admin_full_access_absences" ON absences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'chef_etablissement')
      AND user_roles.is_active = true
    )
  );

-- Membres administratifs (DE, AE)
CREATE POLICY "membre_admin_access_absences" ON absences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'membre_administratif'
      AND user_roles.is_active = true
    )
  );

-- Enseignants peuvent voir et déclarer les absences de leurs élèves
CREATE POLICY "enseignants_manage_absences" ON absences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM enseignant_classes ec
      WHERE ec.enseignant_id = auth.uid()
      AND ec.classe_id = absences.classe_id
    )
  );

-- Élèves voient leurs propres absences
CREATE POLICY "eleves_view_own_absences" ON absences
  FOR SELECT
  USING (
    eleve_id IN (SELECT id FROM eleves WHERE user_id = auth.uid())
  );

-- Parents voient les absences de leurs enfants
CREATE POLICY "parents_view_children_absences" ON absences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM parents
      JOIN parent_eleve ON parent_eleve.parent_id = parents.id
      JOIN eleves ON eleves.id = parent_eleve.eleve_id
      WHERE parents.user_id = auth.uid()
      AND eleves.id = absences.eleve_id
    )
  );