-- =====================================================
-- MIGRATION: Ajout des colonnes de traçabilité des paiements
-- Date: 05/04/2026
-- Description: Ajoute les colonnes telephone, operateur, montant, cycle
-- à la table abonnements pour la traçabilité des transactions
-- =====================================================

-- 1. Ajout des colonnes
ALTER TABLE abonnements 
ADD COLUMN IF NOT EXISTS telephone TEXT,
ADD COLUMN IF NOT EXISTS operateur TEXT,
ADD COLUMN IF NOT EXISTS montant INTEGER,
ADD COLUMN IF NOT EXISTS cycle TEXT;

-- 2. Commentaire sur les colonnes pour documentation
COMMENT ON COLUMN abonnements.telephone IS 'Numéro de téléphone utilisé pour le paiement';
COMMENT ON COLUMN abonnements.operateur IS 'Opérateur télécom (mtn/moov)';
COMMENT ON COLUMN abonnements.montant IS 'Montant payé en FCFA';
COMMENT ON COLUMN abonnements.cycle IS 'Cycle de facturation (monthly/yearly)';

-- 3. Création d'index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_abonnements_operateur ON abonnements(operateur);
CREATE INDEX IF NOT EXISTS idx_abonnements_telephone ON abonnements(telephone);
CREATE INDEX IF NOT EXISTS idx_abonnements_montant ON abonnements(montant);

-- 4. Vérification de la structure après migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'abonnements'
ORDER BY ordinal_position;