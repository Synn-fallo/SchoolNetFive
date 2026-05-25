-- Migration: Création de la table emplois_du_temps
-- Date: 2026-05-18

CREATE TABLE emplois_du_temps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  matiere_id UUID NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  jour_semaine INTEGER NOT NULL CHECK (jour_semaine BETWEEN 1 AND 6),
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  duree_prevue_heures DECIMAL(5,2) GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (heure_fin - heure_debut))/3600) STORED,
  duree_declaree_heures DECIMAL(5,2) DEFAULT 0,
  derniere_declaration DATE,
  statut TEXT DEFAULT 'normal' CHECK (statut IN ('normal', 'suspect', 'attention', 'alerte')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emplois_classe ON emplois_du_temps(classe_id);
CREATE INDEX idx_emplois_enseignant ON emplois_du_temps(enseignant_id);
CREATE INDEX idx_emplois_etablissement ON emplois_du_temps(etablissement_id);
CREATE INDEX idx_emplois_jour ON emplois_du_temps(jour_semaine);
CREATE INDEX idx_emplois_active ON emplois_du_temps(is_active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_emplois_updated_at
  BEFORE UPDATE ON emplois_du_temps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE emplois_du_temps ENABLE ROW LEVEL SECURITY;

-- Admin et Chef d'établissement peuvent tout voir
CREATE POLICY "admin_full_access_emplois" ON emplois_du_temps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'chef_etablissement')
      AND user_roles.is_active = true
    )
  );

-- Membres administratifs (DE, AE) peuvent tout voir
CREATE POLICY "membre_admin_access_emplois" ON emplois_du_temps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'membre_administratif'
      AND user_roles.is_active = true
    )
  );

-- Enseignants voient leurs propres cours
CREATE POLICY "enseignants_view_own_emplois" ON emplois_du_temps
  FOR SELECT
  USING (enseignant_id = auth.uid());

-- Enseignants peuvent déclarer leurs heures
CREATE POLICY "enseignants_update_own_emplois" ON emplois_du_temps
  FOR UPDATE
  USING (enseignant_id = auth.uid())
  WITH CHECK (enseignant_id = auth.uid());

-- Élèves voient les cours de leur classe
CREATE POLICY "eleves_view_class_emplois" ON emplois_du_temps
  FOR SELECT
  USING (
    is_active = true
    AND classe_id IN (
      SELECT classe_id FROM eleves WHERE user_id = auth.uid()
    )
  );

-- Parents voient les cours des classes de leurs enfants
CREATE POLICY "parents_view_children_class_emplois" ON emplois_du_temps
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM parents
      JOIN parent_eleve ON parent_eleve.parent_id = parents.id
      JOIN eleves ON eleves.id = parent_eleve.eleve_id
      WHERE parents.user_id = auth.uid()
      AND eleves.classe_id = emplois_du_temps.classe_id
    )
  );