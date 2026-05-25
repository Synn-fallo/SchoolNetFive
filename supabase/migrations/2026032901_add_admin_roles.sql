/*
  # SchoolNet - Ajout des rôles administratifs et champs workflow
  
  ## Description
  - Ajout du rôle 'membre_administratif' à l'ENUM user_role
  - Ajout des champs pour la Phase 1 du workflow chef d'établissement
  - Ces ajouts sont ADDITIFS et ne modifient pas les données existantes
  
  ## Date
  30 Mars 2026
*/

-- ============================================================================
-- ÉTAPE A.1 : Ajout du rôle membre_administratif à l'ENUM
-- ============================================================================

-- Ajout de la valeur si elle n'existe pas déjà
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'membre_administratif';

-- ============================================================================
-- ÉTAPE A.2 : Ajout des colonnes pour le workflow chef
-- ============================================================================

-- Ajout des colonnes à demandes_etablissement
ALTER TABLE demandes_etablissement 
ADD COLUMN IF NOT EXISTS numero_agrement text;

ALTER TABLE demandes_etablissement 
ADD COLUMN IF NOT EXISTS justificatif_url text;

ALTER TABLE demandes_etablissement 
ADD COLUMN IF NOT EXISTS mode_verification text 
CHECK (mode_verification IN ('auto', 'manuel_cachet', 'manuel_site'));

-- Ajout de la colonne pour le brouillon
ALTER TABLE demandes_etablissement 
ADD COLUMN IF NOT EXISTS est_brouillon boolean DEFAULT false;

-- Commentaires pour documentation
COMMENT ON COLUMN demandes_etablissement.numero_agrement IS 
'Numéro d''agrément officiel de l''établissement (pour validation automatique)';

COMMENT ON COLUMN demandes_etablissement.justificatif_url IS 
'URL du justificatif uploadé (cachet humide, signature, etc.)';

COMMENT ON COLUMN demandes_etablissement.mode_verification IS 
'Mode de vérification: auto (agrément), manuel_cachet, manuel_site';

COMMENT ON COLUMN demandes_etablissement.est_brouillon IS 
'Indique si la demande est un brouillon non soumis';