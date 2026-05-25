-- ============================================================
-- PHASE 6a – MIGRATION IN-APP
-- Ajout des colonnes source et note_originale
-- Tables concernées : devoirs, notes
-- ============================================================

-- 1. Ajout colonne source dans devoirs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devoirs' AND column_name = 'source'
    ) THEN
        ALTER TABLE devoirs ADD COLUMN source VARCHAR(50) DEFAULT 'manuel';
        COMMENT ON COLUMN devoirs.source IS 'Source du devoir : manuel, transfert_independant, import_csv';
    END IF;
END $$;

-- 2. Ajout colonne source dans notes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'source'
    ) THEN
        ALTER TABLE notes ADD COLUMN source VARCHAR(50) DEFAULT 'manuel';
        COMMENT ON COLUMN notes.source IS 'Source de la note : manuel, transfert_independant, import_csv';
    END IF;
END $$;

-- 3. Ajout colonne note_originale dans notes (pour tracer la note avant écraseur)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'note_originale'
    ) THEN
        ALTER TABLE notes ADD COLUMN note_originale NUMERIC;
        COMMENT ON COLUMN notes.note_originale IS 'Valeur originale de la note avant écrasement (lors d''un transfert)';
    END IF;
END $$;

-- 4. Index sur source pour faciliter les requêtes de traçabilité
CREATE INDEX IF NOT EXISTS idx_devoirs_source ON devoirs(source);
CREATE INDEX IF NOT EXISTS idx_notes_source ON notes(source);

-- 5. Mise à jour des valeurs existantes (optionnel)
-- Les notes et devoirs existants gardent 'manuel' comme source par défaut