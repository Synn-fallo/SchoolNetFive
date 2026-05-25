-- =====================================================
-- MIGRATION: Ajout des tables de structure académique
-- Date: 06/04/2026
-- Description: 
--   - Cycles, Niveaux, Séries, Options, Indices, Modèles de groupes
--   - Modification de la table classes pour utiliser ces références
--   - Modification de la table groupes pour lier aux modèles
-- =====================================================

-- =====================================================
-- 1. Table des CYCLES
-- =====================================================
CREATE TABLE IF NOT EXISTS cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE cycles IS 'Cycles scolaires (1er Cycle, 2nd Cycle)';
COMMENT ON COLUMN cycles.nom IS 'Nom du cycle';
COMMENT ON COLUMN cycles.ordre IS 'Ordre d''affichage (1 pour 1er Cycle, 2 pour 2nd Cycle)';

-- Insertion des cycles standards
INSERT INTO cycles (nom, ordre, description) VALUES
  ('1er Cycle', 1, 'Collège : 6ème → 3ème'),
  ('2nd Cycle', 2, 'Lycée : 2nde → Tle')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. Table des NIVEAUX
-- =====================================================
CREATE TABLE IF NOT EXISTS niveaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES cycles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE niveaux IS 'Niveaux scolaires (6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Tle)';
COMMENT ON COLUMN niveaux.cycle_id IS 'Référence vers le cycle (1er ou 2nd)';
COMMENT ON COLUMN niveaux.ordre IS 'Ordre d''affichage (6,5,4,3,2,1,0)';

-- Insertion des niveaux standards
WITH cycle_refs AS (
  SELECT id, nom FROM cycles
)
INSERT INTO niveaux (cycle_id, nom, ordre, code) VALUES
  ((SELECT id FROM cycles WHERE nom = '1er Cycle'), '6ème', 6, '6'),
  ((SELECT id FROM cycles WHERE nom = '1er Cycle'), '5ème', 5, '5'),
  ((SELECT id FROM cycles WHERE nom = '1er Cycle'), '4ème', 4, '4'),
  ((SELECT id FROM cycles WHERE nom = '1er Cycle'), '3ème', 3, '3'),
  ((SELECT id FROM cycles WHERE nom = '2nd Cycle'), '2nde', 2, '2de'),
  ((SELECT id FROM cycles WHERE nom = '2nd Cycle'), '1ère', 1, '1ere'),
  ((SELECT id FROM cycles WHERE nom = '2nd Cycle'), 'Tle', 0, 'tle')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. Table des SÉRIES (uniquement pour 2nd Cycle)
-- =====================================================
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE series IS 'Séries scolaires (Littéraire, Scientifique, Technique)';
COMMENT ON COLUMN series.code IS 'Code abrégé de la série (A/B, C/D, F/G/Industrie)';

-- Insertion des séries standards
INSERT INTO series (nom, code, description) VALUES
  ('Littéraire', 'A/B', 'Séries littéraires A et B'),
  ('Scientifique', 'C/D', 'Séries scientifiques C et D'),
  ('Technique', 'F/G/Industrie', 'Séries techniques F, G et filières industrielles')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. Table des OPTIONS (par série)
-- =====================================================
CREATE TABLE IF NOT EXISTS options_serie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serie_id UUID REFERENCES series(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE options_serie IS 'Options spécifiques par série (F1, F2, G1, MG, EL, GC, etc.)';

-- Insertion des options par série
WITH serie_refs AS (
  SELECT id, nom FROM series
)
INSERT INTO options_serie (serie_id, nom, code, description) VALUES
  -- Littéraire (A, B)
  ((SELECT id FROM series WHERE nom = 'Littéraire'), 'Littéraire A', 'A', 'Série Littéraire A'),
  ((SELECT id FROM series WHERE nom = 'Littéraire'), 'Littéraire B', 'B', 'Série Littéraire B'),
  -- Scientifique (C, D)
  ((SELECT id FROM series WHERE nom = 'Scientifique'), 'Scientifique C', 'C', 'Série Scientifique C'),
  ((SELECT id FROM series WHERE nom = 'Scientifique'), 'Scientifique D', 'D', 'Série Scientifique D'),
  -- Technique F (F1, F2, F3, F4)
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Technique F1', 'F1', 'Série Technique F1'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Technique F2', 'F2', 'Série Technique F2'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Technique F3', 'F3', 'Série Technique F3'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Technique F4', 'F4', 'Série Technique F4'),
  -- Technique G (G1, G2, G3)
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Technique G1', 'G1', 'Série Technique G1'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Technique G2', 'G2', 'Série Technique G2'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Technique G3', 'G3', 'Série Technique G3'),
  -- Technique Industrie (MG, EL, GC, MA, PB, OBB)
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Industrie MG', 'MG', 'Métiers de la Gestion'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Industrie EL', 'EL', 'Électrotechnique'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Industrie GC', 'GC', 'Génie Civil'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Industrie MA', 'MA', 'Maintenance Automobile'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Industrie PB', 'PB', 'Productique Bois'),
  ((SELECT id FROM series WHERE nom = 'Technique'), 'Industrie OBB', 'OBB', 'Organisation des Bâtiments et Bureau')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. Table des INDICES (pour différencier plusieurs classes identiques)
-- =====================================================
CREATE TABLE IF NOT EXISTS indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valeur TEXT NOT NULL,
  type_indice TEXT DEFAULT 'ALPHA', -- 'ALPHA', 'NUMERIC'
  ordre INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE indices IS 'Indices pour différencier plusieurs classes identiques (A, B, C ou 1, 2, 3)';

-- Insertion des indices standards
INSERT INTO indices (valeur, type_indice, ordre) VALUES
  ('A', 'ALPHA', 1),
  ('B', 'ALPHA', 2),
  ('C', 'ALPHA', 3),
  ('D', 'ALPHA', 4),
  ('1', 'NUMERIC', 1),
  ('2', 'NUMERIC', 2),
  ('3', 'NUMERIC', 3),
  ('4', 'NUMERIC', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. Table des MODÈLES DE GROUPES
-- =====================================================
CREATE TABLE IF NOT EXISTS modeles_groupes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  type_suffixe TEXT NOT NULL, -- 'LETTRE', 'CHIFFRE'
  valeurs JSONB NOT NULL,     -- ['A','B','C'] ou ['1','2','3']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE modeles_groupes IS 'Modèles pour la génération automatique des groupes';
COMMENT ON COLUMN modeles_groupes.valeurs IS 'Liste des valeurs des groupes (ex: ["A","B","C"])';

-- Insertion des modèles de groupes standards
INSERT INTO modeles_groupes (nom, description, type_suffixe, valeurs) VALUES
  ('Alphabétique (2 groupes)', 'Groupes A et B', 'LETTRE', '["A","B"]'),
  ('Alphabétique (3 groupes)', 'Groupes A, B et C', 'LETTRE', '["A","B","C"]'),
  ('Alphabétique (4 groupes)', 'Groupes A, B, C et D', 'LETTRE', '["A","B","C","D"]'),
  ('Numérique (2 groupes)', 'Groupes 1 et 2', 'CHIFFRE', '["1","2"]'),
  ('Numérique (3 groupes)', 'Groupes 1, 2 et 3', 'CHIFFRE', '["1","2","3"]'),
  ('Numérique (4 groupes)', 'Groupes 1, 2, 3 et 4', 'CHIFFRE', '["1","2","3","4"]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. Modification de la table classes
-- =====================================================

-- Ajout des colonnes de référence
ALTER TABLE classes 
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES cycles(id),
  ADD COLUMN IF NOT EXISTS niveau_id UUID REFERENCES niveaux(id),
  ADD COLUMN IF NOT EXISTS serie_id UUID REFERENCES series(id),
  ADD COLUMN IF NOT EXISTS option_serie_id UUID REFERENCES options_serie(id),
  ADD COLUMN IF NOT EXISTS indice_id UUID REFERENCES indices(id),
  ADD COLUMN IF NOT EXISTS modele_groupe_id UUID REFERENCES modeles_groupes(id);

-- Ajout d'une colonne pour le nom généré (automatique) et le nom personnalisé (cas particuliers)
ALTER TABLE classes 
  ADD COLUMN IF NOT EXISTS nom_generique TEXT,
  ADD COLUMN IF NOT EXISTS is_manuel BOOLEAN DEFAULT false;

-- Migration des données existantes : mettre is_manuel = true pour les classes existantes
UPDATE classes SET is_manuel = true WHERE nom IS NOT NULL;

-- Rendre la colonne nom nullable (car on utilisera nom_generique ou nom)
ALTER TABLE classes ALTER COLUMN nom DROP NOT NULL;

-- Création d'index pour les performances
CREATE INDEX IF NOT EXISTS idx_classes_cycle_id ON classes(cycle_id);
CREATE INDEX IF NOT EXISTS idx_classes_niveau_id ON classes(niveau_id);
CREATE INDEX IF NOT EXISTS idx_classes_serie_id ON classes(serie_id);
CREATE INDEX IF NOT EXISTS idx_classes_option_serie_id ON classes(option_serie_id);
CREATE INDEX IF NOT EXISTS idx_classes_indice_id ON classes(indice_id);

-- =====================================================
-- 8. Modification de la table groupes_eleves
-- =====================================================

-- Ajout de la colonne modele_groupe_id
ALTER TABLE groupes_eleves 
  ADD COLUMN IF NOT EXISTS modele_groupe_id UUID REFERENCES modeles_groupes(id),
  ADD COLUMN IF NOT EXISTS ordre INTEGER;

-- =====================================================
-- 9. Fonction pour générer le nom complet d'une classe
-- =====================================================

CREATE OR REPLACE FUNCTION generate_class_name(
  p_niveau_nom TEXT,
  p_serie_nom TEXT,
  p_option_code TEXT,
  p_indice_valeur TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := p_niveau_nom;
  
  IF p_serie_nom IS NOT NULL THEN
    v_name := v_name || ' ' || p_serie_nom;
  END IF;
  
  IF p_option_code IS NOT NULL THEN
    v_name := v_name || ' ' || p_option_code;
  END IF;
  
  IF p_indice_valeur IS NOT NULL THEN
    v_name := v_name || '/' || p_indice_valeur;
  END IF;
  
  RETURN TRIM(v_name);
END;
$$;

-- =====================================================
-- 10. RLS Policies
-- =====================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE options_serie ENABLE ROW LEVEL SECURITY;
ALTER TABLE indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeles_groupes ENABLE ROW LEVEL SECURITY;

-- Politiques: tout le monde peut lire (données de référence)
CREATE POLICY "Tout le monde peut lire les cycles" ON cycles
  FOR SELECT USING (true);

CREATE POLICY "Tout le monde peut lire les niveaux" ON niveaux
  FOR SELECT USING (true);

CREATE POLICY "Tout le monde peut lire les series" ON series
  FOR SELECT USING (true);

CREATE POLICY "Tout le monde peut lire les options_serie" ON options_serie
  FOR SELECT USING (true);

CREATE POLICY "Tout le monde peut lire les indices" ON indices
  FOR SELECT USING (true);

CREATE POLICY "Tout le monde peut lire les modeles_groupes" ON modeles_groupes
  FOR SELECT USING (true);

-- Seuls les admins peuvent modifier les tables de référence
CREATE POLICY "Seuls les admins peuvent modifier les cycles" ON cycles
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

CREATE POLICY "Seuls les admins peuvent modifier les niveaux" ON niveaux
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

CREATE POLICY "Seuls les admins peuvent modifier les series" ON series
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

CREATE POLICY "Seuls les admins peuvent modifier les options_serie" ON options_serie
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

CREATE POLICY "Seuls les admins peuvent modifier les indices" ON indices
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

CREATE POLICY "Seuls les admins peuvent modifier les modeles_groupes" ON modeles_groupes
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Vérification
SELECT 'Migration terminée avec succès !' as status;