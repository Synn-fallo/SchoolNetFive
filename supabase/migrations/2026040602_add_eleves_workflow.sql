-- =====================================================
-- MIGRATION: Ajout du workflow élèves (Mode A et Mode B)
-- Date: 06/04/2026
-- Description: 
--   - Ajout des colonnes EducMaster et identifiant_connexion
--   - Création de la table de liaison parents_eleves
--   - Ajout des politiques RLS
-- =====================================================

-- =====================================================
-- 1. Ajout des colonnes à la table eleves
-- =====================================================

-- Ajout de la colonne educmaster (identifiant national unique)
ALTER TABLE eleves 
ADD COLUMN IF NOT EXISTS educmaster VARCHAR(20) UNIQUE;

COMMENT ON COLUMN eleves.educmaster IS 'EducMaster - Numéro national unique attribué par le ministère';

-- Ajout de la colonne identifiant_connexion (nom.4dernierschiffres)
ALTER TABLE eleves 
ADD COLUMN IF NOT EXISTS identifiant_connexion VARCHAR(50) UNIQUE;

COMMENT ON COLUMN eleves.identifiant_connexion IS 'Identifiant de connexion généré (ex: gando.6789)';

-- Ajout des colonnes d'état civil
ALTER TABLE eleves 
ADD COLUMN IF NOT EXISTS date_naissance DATE,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS telephone VARCHAR(20);

COMMENT ON COLUMN eleves.date_naissance IS 'Date de naissance de l''élève';
COMMENT ON COLUMN eleves.email IS 'Email personnel de l''élève (optionnel)';
COMMENT ON COLUMN eleves.telephone IS 'Téléphone personnel de l''élève (optionnel)';

-- =====================================================
-- 2. Création de la table de liaison parents_eleves
-- =====================================================

CREATE TABLE IF NOT EXISTS parents_eleves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  lien_parente VARCHAR(50) NOT NULL, -- 'pere', 'mere', 'tuteur', 'autre'
  est_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parent_id, eleve_id)
);

COMMENT ON TABLE parents_eleves IS 'Liaison many-to-many entre parents et élèves';
COMMENT ON COLUMN parents_eleves.lien_parente IS 'Lien de parenté (pere, mere, tuteur, autre)';
COMMENT ON COLUMN parents_eleves.est_principal IS 'Indique si c''est le parent principal à contacter';

-- =====================================================
-- 3. Ajout de la colonne type_utilisateur dans profiles
-- =====================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS type_utilisateur TEXT DEFAULT 'visiteur';

COMMENT ON COLUMN profiles.type_utilisateur IS 'Type d''utilisateur: parent, enseignant, eleve, admin, etc.';

-- =====================================================
-- 4. Migration des données existantes
-- =====================================================

-- Mettre à jour les profiles existants qui ont un rôle 'parent'
UPDATE profiles 
SET type_utilisateur = 'parent'
WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'parent' AND is_active = true
);

-- Mettre à jour les profiles existants qui ont un rôle 'eleve'
UPDATE profiles 
SET type_utilisateur = 'eleve'
WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'eleve' AND is_active = true
);

-- =====================================================
-- 5. Nettoyage de la colonne parent_id (ancienne)
-- =====================================================

-- Migrer les anciennes relations parent_id vers la nouvelle table
DO $$
DECLARE
  eleve_record RECORD;
BEGIN
  FOR eleve_record IN SELECT id, parent_id FROM eleves WHERE parent_id IS NOT NULL LOOP
    INSERT INTO parents_eleves (parent_id, eleve_id, lien_parente, est_principal)
    VALUES (eleve_record.parent_id, eleve_record.id, 'tuteur', true)
    ON CONFLICT (parent_id, eleve_id) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- 6. RLS Policies
-- =====================================================

-- Activer RLS sur parents_eleves
ALTER TABLE parents_eleves ENABLE ROW LEVEL SECURITY;

-- Politique: Les parents voient leurs propres enfants
CREATE POLICY "Les parents voient leurs enfants" ON parents_eleves
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = parent_id
    )
  );

-- Politique: Les chefs d'établissement voient tous les parents_eleves de leur établissement
CREATE POLICY "Les chefs voient les parents_eleves de leur etablissement" ON parents_eleves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN eleves e ON e.id = eleve_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'chef_etablissement'
      AND ur.etablissement_id = e.etablissement_id
      AND ur.is_active = true
    )
  );

-- Politique: Les DE voient les parents_eleves de leur établissement
CREATE POLICY "Les DE voient les parents_eleves" ON parents_eleves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN eleves e ON e.id = eleve_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'membre_administratif'
      AND ur.metadata->>'type_admin' = 'de'
      AND ur.etablissement_id = e.etablissement_id
      AND ur.is_active = true
    )
  );

-- Politique: Insertion par les chefs ou DE uniquement
CREATE POLICY "Les chefs et DE peuvent inserer" ON parents_eleves
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('chef_etablissement', 'membre_administratif')
      AND ur.is_active = true
    )
  );

-- =====================================================
-- 7. Fonction de génération d'identifiant de connexion
-- =====================================================

CREATE OR REPLACE FUNCTION generate_identifiant_connexion(
  p_nom TEXT,
  p_educmaster VARCHAR(20)
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_base TEXT;
  v_candidate TEXT;
  v_suffixe INTEGER;
  v_last4 TEXT;
BEGIN
  -- Nettoyer le nom (minuscules, sans accents)
  v_base := lower(unaccent(p_nom));
  -- Extraire les 4 derniers chiffres de l'EducMaster
  v_last4 := right(p_educmaster, 4);
  -- Base: nom.4chiffres
  v_base := v_base || '.' || v_last4;
  
  v_candidate := v_base;
  v_suffixe := 1;
  
  -- Boucle anti-collision
  WHILE EXISTS (SELECT 1 FROM eleves WHERE identifiant_connexion = v_candidate) LOOP
    v_suffixe := v_suffixe + 1;
    v_candidate := v_base || '.' || v_suffixe::TEXT;
    IF v_suffixe > 99 THEN
      RAISE EXCEPTION 'Impossible de générer un identifiant unique après 99 tentatives';
    END IF;
  END LOOP;
  
  RETURN v_candidate;
END;
$$;

-- =====================================================
-- 8. Politiques RLS pour la table eleves
-- =====================================================

-- Ajouter des politiques pour l'accès aux nouvelles colonnes
CREATE POLICY "Les chefs peuvent tout voir sur les eleves" ON eleves
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('chef_etablissement', 'membre_administratif')
      AND ur.etablissement_id = eleves.etablissement_id
      AND ur.is_active = true
    )
  );

CREATE POLICY "Les parents voient leurs enfants" ON eleves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parents_eleves pe
      WHERE pe.eleve_id = eleves.id 
      AND pe.parent_id = auth.uid()
    )
  );

CREATE POLICY "Les enseignants voient les eleves de leurs classes" ON eleves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enseignant_matieres em
      WHERE em.enseignant_id = auth.uid()
      AND em.classe_id = eleves.classe_id
    )
  );

-- =====================================================
-- 9. Table d'invitation pour les élèves (Mode B)
-- =====================================================

-- Réutiliser invitation_codes avec role = 'eleve'
-- Les colonnes existent déjà: email, nom, prenom, telephone, etablissement_id

COMMENT ON COLUMN invitation_codes.role IS 'Peut être: enseignant, eleve, parent';

-- =====================================================
-- 10. Vérification finale
-- =====================================================

-- Afficher la structure mise à jour de eleves
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'eleves'
ORDER BY ordinal_position;

-- Afficher la structure de parents_eleves
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'parents_eleves'
ORDER BY ordinal_position;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

SELECT 'Migration terminée avec succès !' as status;