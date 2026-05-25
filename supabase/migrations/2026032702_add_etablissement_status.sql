/*
  # SchoolNet - Ajout du statut pour les établissements
  
  ## Description
  Migration additive pour ajouter un champ `statut` à la table `etablissements`
  permettant de gérer le workflow de validation et d'activation des établissements.
  
  ## Statuts possibles
  - EN_ATTENTE_ACTIVATION : créé après validation admin, en attente d'infos complémentaires
  - INFOS_COMPLETES : infos saisies, en attente d'abonnement
  - ACTIF : abonnement souscrit, site public
  - SUSPENDU : non-paiement ou abus
  
  ## Principes
  - ADDITIF : ne supprime aucune colonne existante
  - `is_active` existant peut être dérivé de `statut = 'ACTIF'`
  
  ## Date
  28 Mars 2026
*/

-- Ajout de la colonne statut avec valeur par défaut
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS statut text DEFAULT 'EN_ATTENTE_ACTIVATION';

-- Ajout de la contrainte de validation
ALTER TABLE etablissements 
ADD CONSTRAINT etablissements_statut_check 
CHECK (statut IN ('EN_ATTENTE_ACTIVATION', 'INFOS_COMPLETES', 'ACTIF', 'SUSPENDU'));

-- Mise à jour des établissements existants
-- Ceux qui sont actifs (is_active = true) deviennent ACTIF
UPDATE etablissements 
SET statut = 'ACTIF' 
WHERE is_active = true AND statut = 'EN_ATTENTE_ACTIVATION';

-- Ceux qui ne sont pas actifs restent en attente d'activation
-- (statut déjà par défaut 'EN_ATTENTE_ACTIVATION')

-- Index pour optimiser les requêtes sur le statut
CREATE INDEX IF NOT EXISTS idx_etablissements_statut ON etablissements(statut);

-- Note de migration
COMMENT ON COLUMN etablissements.statut IS 
'Statut de l''établissement : EN_ATTENTE_ACTIVATION, INFOS_COMPLETES, ACTIF, SUSPENDU';