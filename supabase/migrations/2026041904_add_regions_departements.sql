-- ============================================================
-- MIGRATION: 2026041904_add_regions_departements
-- BUT: Créer les tables régions et départements pour les filtres avancés
-- ============================================================

-- 1. Création de la table regions
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  nom TEXT UNIQUE NOT NULL,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Création de la table departements
CREATE TABLE IF NOT EXISTS departements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  nom TEXT UNIQUE NOT NULL,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index pour les performances
CREATE INDEX idx_departements_region_id ON departements(region_id);
CREATE INDEX idx_departements_nom ON departements(nom);
CREATE INDEX idx_regions_nom ON regions(nom);

-- 4. Ajout des colonnes dans etablissements (sans les rendre obligatoires)
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS region_id UUID NULL REFERENCES regions(id) ON DELETE SET NULL;

ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS departement_id UUID NULL REFERENCES departements(id) ON DELETE SET NULL;

-- 5. Index sur les nouvelles colonnes
CREATE INDEX idx_etablissements_region_id ON etablissements(region_id);
CREATE INDEX idx_etablissements_departement_id ON etablissements(departement_id);

-- 6. Commentaires
COMMENT ON TABLE regions IS 'Liste des régions du Bénin (Sud, Centre, Nord)';
COMMENT ON TABLE departements IS 'Liste des 12 départements du Bénin avec leur région associée';
COMMENT ON COLUMN etablissements.region_id IS 'Région officielle (clé étrangère vers regions)';
COMMENT ON COLUMN etablissements.departement_id IS 'Département officiel (clé étrangère vers departements)';