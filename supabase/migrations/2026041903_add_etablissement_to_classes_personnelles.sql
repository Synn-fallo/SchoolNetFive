-- ============================================================
-- MIGRATION: 2026041903_add_etablissement_to_classes_personnelles
-- BUT: Ajouter les colonnes etablissement_nom et etablissement_id
-- CONTEXTE: Permettre d'associer une classe personnelle à un établissement
-- ============================================================

-- 1. Ajout des colonnes
ALTER TABLE classes_personnelles 
ADD COLUMN IF NOT EXISTS etablissement_nom TEXT;

ALTER TABLE classes_personnelles 
ADD COLUMN IF NOT EXISTS etablissement_id UUID NULL REFERENCES etablissements(id) ON DELETE SET NULL;

-- 2. Commentaires pour documentation
COMMENT ON COLUMN classes_personnelles.etablissement_nom IS 'Nom de l''établissement (texte libre pour les indépendants, ou copie du nom officiel)';
COMMENT ON COLUMN classes_personnelles.etablissement_id IS 'ID de l''établissement officiel (nullable, rempli si l''établissement existe dans SchoolNet)';

-- 3. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_classes_personnelles_etablissement_id ON classes_personnelles(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_classes_personnelles_etablissement_nom ON classes_personnelles(etablissement_nom);

-- 4. Mettre à jour les enregistrements existants (si nécessaire)
-- (optionnel : laisser les colonnes NULL pour les classes existantes)