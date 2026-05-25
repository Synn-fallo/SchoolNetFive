-- 6. Création de la table notes_historique
CREATE TABLE IF NOT EXISTS notes_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_value DECIMAL(5,2),
  new_value DECIMAL(5,2),
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  reason TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_role VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_historique_note_id ON notes_historique(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_historique_created_at ON notes_historique(created_at);

-- 7. Création de la table periodes_validation
CREATE TABLE IF NOT EXISTS periodes_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  annee_scolaire_id UUID NOT NULL REFERENCES annees_scolaires(id),
  periode VARCHAR(10) NOT NULL,
  is_open BOOLEAN DEFAULT true,
  is_validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(etablissement_id, annee_scolaire_id, periode)
);

CREATE INDEX IF NOT EXISTS idx_periodes_validation_etablissement ON periodes_validation(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_periodes_validation_annee ON periodes_validation(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_periodes_validation_periode ON periodes_validation(periode);

-- 8. Ajout des politiques RLS pour periodes_validation
ALTER TABLE periodes_validation ENABLE ROW LEVEL SECURITY;

-- Lecture: tout utilisateur authentifié peut voir
CREATE POLICY "periodes_validation_select_policy" ON periodes_validation
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insertion/Mise à jour: seul le chef d'établissement peut modifier
CREATE POLICY "periodes_validation_insert_policy" ON periodes_validation
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'chef_etablissement')
  );

CREATE POLICY "periodes_validation_update_policy" ON periodes_validation
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'chef_etablissement')
  );