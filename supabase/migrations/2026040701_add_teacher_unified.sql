-- =====================================================
-- MIGRATION: Structure unifiée pour enseignants
-- Date: 07/04/2026
-- Description:
--   - Ajout des colonnes enseignant_id et statut aux tables existantes
--   - Création des tables de rattachement et d'invitation
--   - Système unifié pour enseignants (avec ou sans établissement)
-- =====================================================

-- =====================================================
-- 1. Ajout des colonnes à la table classes
-- =====================================================

ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS enseignant_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'personnel';

COMMENT ON COLUMN classes.enseignant_id IS 'Enseignant propriétaire de la classe (pour les classes personnelles)';
COMMENT ON COLUMN classes.statut IS 'Statut de la classe: personnel, officiel, archive';

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_classes_enseignant_id ON classes(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_classes_statut ON classes(statut);

-- =====================================================
-- 2. Ajout des colonnes à la table eleves
-- =====================================================

ALTER TABLE eleves 
ADD COLUMN IF NOT EXISTS enseignant_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'personnel';

COMMENT ON COLUMN eleves.enseignant_id IS 'Enseignant propriétaire de l''élève (pour les élèves personnels)';
COMMENT ON COLUMN eleves.statut IS 'Statut de l''élève: personnel, officiel';

CREATE INDEX IF NOT EXISTS idx_eleves_enseignant_id ON eleves(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_eleves_statut ON eleves(statut);

-- =====================================================
-- 3. Ajout des colonnes à la table notes
-- =====================================================

ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'personnel';

COMMENT ON COLUMN notes.statut IS 'Statut de la note: personnel, officiel, livre';

CREATE INDEX IF NOT EXISTS idx_notes_statut ON notes(statut);

-- =====================================================
-- 4. Création de la table enseignant_etablissements
-- =====================================================

CREATE TABLE IF NOT EXISTS enseignant_etablissements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'enseignant',
  is_active BOOLEAN DEFAULT true,
  est_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(enseignant_id, etablissement_id)
);

COMMENT ON TABLE enseignant_etablissements IS 'Rattachement des enseignants aux établissements';
COMMENT ON COLUMN enseignant_etablissements.role IS 'Rôle dans l''établissement: enseignant, professeur_principal';
COMMENT ON COLUMN enseignant_etablissements.est_principal IS 'Indique si c''est l''établissement principal de l''enseignant';

-- Index
CREATE INDEX IF NOT EXISTS idx_enseignant_etablissements_enseignant ON enseignant_etablissements(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_enseignant_etablissements_etablissement ON enseignant_etablissements(etablissement_id);

-- =====================================================
-- 5. Création de la table invitations_enseignant
-- =====================================================

CREATE TABLE IF NOT EXISTS invitations_enseignant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  email_destinataire TEXT NOT NULL,
  message TEXT,
  statut TEXT DEFAULT 'en_attente',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE invitations_enseignant IS 'Invitations pour les enseignants à rejoindre un établissement';
COMMENT ON COLUMN invitations_enseignant.statut IS 'Statut: en_attente, acceptee, expiree, annulee';

-- Index
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations_enseignant(code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations_enseignant(email_destinataire);
CREATE INDEX IF NOT EXISTS idx_invitations_statut ON invitations_enseignant(statut);

-- =====================================================
-- 6. Migration des données existantes
-- =====================================================

-- Migrer les enseignants existants vers enseignant_etablissements
INSERT INTO enseignant_etablissements (enseignant_id, etablissement_id, role, is_active, est_principal)
SELECT DISTINCT 
  ur.user_id,
  ur.etablissement_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM classes WHERE enseignant_principal_id = ur.user_id) 
    THEN 'professeur_principal'
    ELSE 'enseignant'
  END as role,
  ur.is_active,
  true as est_principal
FROM user_roles ur
WHERE ur.role = 'enseignant' 
  AND ur.etablissement_id IS NOT NULL
  AND ur.is_active = true
ON CONFLICT (enseignant_id, etablissement_id) DO NOTHING;

-- Mettre à jour les classes existantes avec enseignant_id
UPDATE classes c
SET enseignant_id = ur.user_id
FROM user_roles ur
WHERE c.etablissement_id = ur.etablissement_id
  AND ur.role = 'enseignant'
  AND c.enseignant_id IS NULL;

-- Mettre à jour les élèves existants (optionnel, selon besoin)

-- =====================================================
-- 7. RLS Policies
-- =====================================================

-- Activer RLS
ALTER TABLE enseignant_etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations_enseignant ENABLE ROW LEVEL SECURITY;

-- Politiques pour enseignant_etablissements
CREATE POLICY "Enseignant peut voir ses rattachements" ON enseignant_etablissements
  FOR SELECT USING (auth.uid() = enseignant_id);

CREATE POLICY "Enseignant peut voir les établissements" ON enseignant_etablissements
  FOR SELECT USING (true);

CREATE POLICY "Admin peut tout voir sur rattachements" ON enseignant_etablissements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Politiques pour invitations_enseignant
CREATE POLICY "Enseignant peut voir ses invitations" ON invitations_enseignant
  FOR SELECT USING (email_destinataire = auth.email());

CREATE POLICY "Admin peut tout voir sur invitations" ON invitations_enseignant
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Politiques pour classes (accès enseignant propriétaire)
CREATE POLICY "Enseignant peut voir ses classes personnelles" ON classes
  FOR SELECT USING (enseignant_id = auth.uid());

-- =====================================================
-- 8. Fonction pour vérifier la limite de classes
-- =====================================================

CREATE OR REPLACE FUNCTION check_teacher_classes_limit()
RETURNS TRIGGER AS $$
DECLARE
  class_count INTEGER;
  max_classes INTEGER := 3; -- Limite par défaut (gratuit)
BEGIN
  -- Compter les classes de l'enseignant (personnelles + rattachées)
  SELECT COUNT(*) INTO class_count
  FROM classes
  WHERE enseignant_id = NEW.enseignant_id
    AND statut != 'archive'
    AND is_active = true;
  
  IF class_count >= max_classes THEN
    RAISE EXCEPTION 'Limite de classes atteinte (maximum %)', max_classes;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur classes
DROP TRIGGER IF EXISTS check_teacher_classes_limit ON classes;
CREATE TRIGGER check_teacher_classes_limit
  BEFORE INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION check_teacher_classes_limit();

-- =====================================================
-- 9. Mise à jour des types existants
-- =====================================================

-- Mettre à jour le type de statut dans les tables existantes
COMMENT ON COLUMN classes.statut IS 'Statut: personnel, officiel, archive';
COMMENT ON COLUMN eleves.statut IS 'Statut: personnel, officiel, inactif';
COMMENT ON COLUMN notes.statut IS 'Statut: personnel, officiel, livre';

-- =====================================================
-- 10. Vérification finale
-- =====================================================

-- Afficher les nouvelles structures
SELECT '=== Migration terminée avec succès ===' as status;
SELECT 'Table enseignant_etablissements' as table_name, COUNT(*) as row_count FROM enseignant_etablissements
UNION ALL
SELECT 'Table invitations_enseignant', COUNT(*) FROM invitations_enseignant
UNION ALL
SELECT 'Classes avec enseignant_id', COUNT(*) FROM classes WHERE enseignant_id IS NOT NULL;