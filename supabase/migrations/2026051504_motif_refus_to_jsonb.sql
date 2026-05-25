-- Migration M2: Changer motif_refus de text à jsonb
-- Date: 2026-05-15
-- Objectif: Permettre le stockage de plusieurs motifs de refus

-- 1. Vérifier que la colonne existe et est de type text
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'demandes_auto_inscription' 
        AND column_name = 'motif_refus'
        AND data_type = 'text'
    ) THEN
        -- 2. Convertir les données existantes en jsonb
        --    - NULL devient tableau vide
        --    - Texte existant devient tableau à un élément
        ALTER TABLE demandes_auto_inscription 
        ALTER COLUMN motif_refus TYPE jsonb USING 
            CASE 
                WHEN motif_refus IS NULL THEN '[]'::jsonb
                WHEN motif_refus = '' THEN '[]'::jsonb
                ELSE to_jsonb(array[motif_refus])
            END;
    END IF;
END $$;

-- 3. (Optionnel) Ajouter un commentaire sur la colonne
COMMENT ON COLUMN demandes_auto_inscription.motif_refus IS 'Motifs de refus (format JSONB). Exemple: ["documents_manquants", "age_non_conforme", "autre: Pièce illisible"]';

-- 4. Vérification (optionnelle - à exécuter manuellement après)
-- SELECT id, motif_refus FROM demandes_auto_inscription LIMIT 5;