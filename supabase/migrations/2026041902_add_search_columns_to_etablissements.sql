-- ============================================================
-- MIGRATION: 2026041902_add_search_columns_to_etablissements
-- BUT: Ajouter des colonnes pour faciliter la recherche des établissements
-- CONTEXTE: Permettre aux enseignants de trouver facilement un établissement parmi 20 000+
-- CORRECTION: Colonne nom_recherche normale (non générée) + trigger pour mise à jour
-- ============================================================

-- 1. Vérifier que l'extension unaccent est activée
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Ajout des colonnes géographiques
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS departement TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS code_postal TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 3. Ajout d'une colonne normale pour la recherche (non générée)
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS nom_recherche TEXT;

-- 4. Commentaires pour documentation
COMMENT ON COLUMN etablissements.departement IS 'Département (ex: Littoral, Atlantique, Zou)';
COMMENT ON COLUMN etablissements.region IS 'Région (ex: Sud, Nord, Centre)';
COMMENT ON COLUMN etablissements.code_postal IS 'Code postal (ex: 01 BP 123)';
COMMENT ON COLUMN etablissements.latitude IS 'Latitude pour géolocalisation';
COMMENT ON COLUMN etablissements.longitude IS 'Longitude pour géolocalisation';
COMMENT ON COLUMN etablissements.nom_recherche IS 'Nom normalisé pour recherche approximative (sans accent, en minuscule) - mis à jour par trigger';

-- 5. Mettre à jour la colonne nom_recherche pour les enregistrements existants
UPDATE etablissements SET nom_recherche = LOWER(unaccent(nom)) WHERE nom_recherche IS NULL;

-- 6. Fonction trigger pour maintenir nom_recherche à jour
CREATE OR REPLACE FUNCTION update_nom_recherche()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nom_recherche := LOWER(unaccent(NEW.nom));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger sur INSERT et UPDATE
DROP TRIGGER IF EXISTS trigger_update_nom_recherche ON etablissements;
CREATE TRIGGER trigger_update_nom_recherche
  BEFORE INSERT OR UPDATE OF nom
  ON etablissements
  FOR EACH ROW
  EXECUTE FUNCTION update_nom_recherche();

-- 8. Activation de l'extension pg_trgm pour la recherche approximative
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 9. Index pour les performances de recherche
CREATE INDEX IF NOT EXISTS idx_etablissements_nom_recherche ON etablissements USING gin(nom_recherche gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_etablissements_ville ON etablissements(ville);
CREATE INDEX IF NOT EXISTS idx_etablissements_departement ON etablissements(departement);
CREATE INDEX IF NOT EXISTS idx_etablissements_region ON etablissements(region);
CREATE INDEX IF NOT EXISTS idx_etablissements_type ON etablissements(type_etablissement);
CREATE INDEX IF NOT EXISTS idx_etablissements_statut ON etablissements(statut);

-- 10. Index composite pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_etablissements_ville_type ON etablissements(ville, type_etablissement);
CREATE INDEX IF NOT EXISTS idx_etablissements_departement_type ON etablissements(departement, type_etablissement);

-- 11. Fonction de recherche approximative
CREATE OR REPLACE FUNCTION rechercher_etablissements(
  p_recherche TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  nom TEXT,
  ville TEXT,
  departement TEXT,
  region TEXT,
  type_etablissement TEXT,
  score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.nom,
    e.ville,
    e.departement,
    e.region,
    e.type_etablissement,
    similarity(e.nom_recherche, LOWER(unaccent(p_recherche))) as score
  FROM etablissements e
  WHERE 
    e.nom_recherche % LOWER(unaccent(p_recherche))
    OR e.ville ILIKE '%' || p_recherche || '%'
    OR e.departement ILIKE '%' || p_recherche || '%'
  ORDER BY score DESC, e.nom
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 12. Commentaire sur la fonction
COMMENT ON FUNCTION rechercher_etablissements IS 'Recherche approximative d''établissements avec tolérance de fautes et tri par pertinence';