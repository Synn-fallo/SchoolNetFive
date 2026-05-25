-- ============================================================
-- AJOUT DE LA FOREIGN KEY (table existe déjà)
-- Table : classes_personnelles
-- Objectif : Ajouter la contrainte FK vers profiles
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_classes_personnelles_profiles'
        AND table_name = 'classes_personnelles'
    ) THEN
        ALTER TABLE classes_personnelles
        ADD CONSTRAINT fk_classes_personnelles_profiles
        FOREIGN KEY (enseignant_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;