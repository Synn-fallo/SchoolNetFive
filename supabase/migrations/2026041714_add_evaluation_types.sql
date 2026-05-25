-- ============================================================
-- Ajout des types d'évaluation manquants
-- interrogation, examen_blanc
-- ============================================================

-- Ajouter 'interrogation' si non existant
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'interrogation') THEN
        ALTER TYPE devoir_type ADD VALUE 'interrogation';
    END IF;
END $$;

-- Ajouter 'examen_blanc' si non existant
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'examen_blanc') THEN
        ALTER TYPE devoir_type ADD VALUE 'examen_blanc';
    END IF;
END $$;