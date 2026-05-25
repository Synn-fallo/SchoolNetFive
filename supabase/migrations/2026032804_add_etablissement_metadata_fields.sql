/*
  # SchoolNet - Documentation des champs metadata pour établissements
  
  ## Description
  Cette migration documente les nouveaux champs à stocker dans la colonne `metadata`
  de la table `etablissements` pour enrichir les informations des établissements.
  
  ## Champs à ajouter dans metadata (JSONB)
  
  | Champ | Type | Valeurs possibles | Description |
  |-------|------|-------------------|-------------|
  | regime | text | "public", "prive", "mixte" | Régime de l'établissement (remplace type_etablissement) |
  | corps | text | "college", "lycee", "centre_metiers" | Corps d'enseignement |
  | enseignement | text | "general", "technique" | Type d'enseignement |
  | options | array | ["STI", "STAG", ...] | Options proposées |
  | cycle | text | "premier", "second" | Cycle scolaire |
  | taux_reussite | numeric | 0-100 | Taux de réussite aux examens |
  | infrastructures | array | ["bibliotheque", "laboratoire", ...] | Infrastructures disponibles |
  | activites | array | ["sport", "club", ...] | Activités extrascolaires |
  
  ## Date
  29 Mars 2026
*/

-- Ajout de commentaire pour documenter la colonne metadata
COMMENT ON COLUMN etablissements.metadata IS 
'Champs disponibles dans metadata:
- regime (text): "public", "prive", "mixte"
- corps (text): "college", "lycee", "centre_metiers"  
- enseignement (text): "general", "technique"
- options (array): ["STI", "STAG", ...]
- cycle (text): "premier", "second"
- taux_reussite (numeric): 0-100
- infrastructures (array): ["bibliotheque", "laboratoire", ...]
- activites (array): ["sport", "club", ...]';

-- Mise à jour de la contrainte type_etablissement pour ajouter "mixte"
-- Note: Si type_etablissement est une colonne text avec CHECK
DO $$ 
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  ALTER TABLE etablissements DROP CONSTRAINT IF EXISTS etablissements_type_etablissement_check;
  -- Créer la nouvelle contrainte avec mixte
  ALTER TABLE etablissements ADD CONSTRAINT etablissements_type_etablissement_check 
    CHECK (type_etablissement IN ('public', 'prive', 'mixte'));
EXCEPTION
  WHEN OTHERS THEN
    -- Si la colonne n'existe pas ou autre erreur, ignorer
    RAISE NOTICE 'Contrainte non modifiée (peut-être déjà à jour)';
END $$;