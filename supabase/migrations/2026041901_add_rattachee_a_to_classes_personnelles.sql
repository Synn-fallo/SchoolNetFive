-- Ajouter la colonne rattachee_a à la table classes_personnelles
-- Permet de tracer les rattachements vers les classes officielles

-- Ajout de la colonne
ALTER TABLE classes_personnelles 
ADD COLUMN rattachee_a UUID NULL REFERENCES classes(id) ON DELETE SET NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN classes_personnelles.rattachee_a IS 'ID de la classe officielle vers laquelle cette classe personnelle a été rattachée (NULL = jamais rattachée)';

-- Index pour les performances des requêtes de vérification
CREATE INDEX IF NOT EXISTS idx_classes_personnelles_rattachee_a ON classes_personnelles(rattachee_a);

-- Index composite pour les recherches par enseignant + rattachement
CREATE INDEX IF NOT EXISTS idx_classes_personnelles_enseignant_rattachee 
ON classes_personnelles(enseignant_id, rattachee_a) 
WHERE rattachee_a IS NOT NULL;