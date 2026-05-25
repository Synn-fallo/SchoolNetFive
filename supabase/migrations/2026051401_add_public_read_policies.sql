-- Migration: Ajout des politiques de lecture publique pour les tables de référence

-- 1. Politique pour regions
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON regions;
CREATE POLICY "Enable read access for all users" ON regions
FOR SELECT USING (true);

-- 2. Politique pour departements
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON departements;
CREATE POLICY "Enable read access for all users" ON departements
FOR SELECT USING (true);

-- 3. Vérification (optionnel)
COMMENT ON POLICY "Enable read access for all users" ON regions IS 'Permet la lecture des régions à tous les utilisateurs (authentifiés ou non)';
COMMENT ON POLICY "Enable read access for all users" ON departements IS 'Permet la lecture des départements à tous les utilisateurs (authentifiés ou non)';