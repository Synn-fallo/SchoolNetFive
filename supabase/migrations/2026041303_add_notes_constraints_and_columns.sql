-- ============================================================
-- MIGRATION: Alignement Base de Données – Gestion des Notes
-- Date: 13/04/2026
-- ============================================================

-- 1. Ajout de la contrainte CHECK sur statut dans notes
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_statut_check;
ALTER TABLE notes ADD CONSTRAINT notes_statut_check 
CHECK (statut IN ('en_attente', 'validee', 'publiee', 'livree', 'revisee', 'annulee'));

-- 2. Ajout des colonnes de dates de changement de statut dans notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS date_saisie TIMESTAMPTZ DEFAULT now();
ALTER TABLE notes ADD COLUMN IF NOT EXISTS date_validation TIMESTAMPTZ;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS date_publication TIMESTAMPTZ;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS date_livraison TIMESTAMPTZ;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id);

-- 3. Ajout des colonnes periode et annee_scolaire_id dans devoirs
ALTER TABLE devoirs ADD COLUMN IF NOT EXISTS periode VARCHAR(10);
ALTER TABLE devoirs ADD COLUMN IF NOT EXISTS annee_scolaire_id UUID REFERENCES annees_scolaires(id);
ALTER TABLE devoirs ADD CONSTRAINT devoirs_type_check 
CHECK (type IN ('devoir', 'composition', 'examen'));

-- 4. Création des index pour performance
CREATE INDEX IF NOT EXISTS idx_notes_statut ON notes(statut);
CREATE INDEX IF NOT EXISTS idx_notes_devoir_id ON notes(devoir_id);
CREATE INDEX IF NOT EXISTS idx_notes_eleve_id ON notes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_devoirs_periode ON devoirs(periode);
CREATE INDEX IF NOT EXISTS idx_devoirs_annee_scolaire ON devoirs(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_devoirs_classe_id ON devoirs(classe_id);
CREATE INDEX IF NOT EXISTS idx_devoirs_matiere_id ON devoirs(matiere_id);

-- 5. Ajout des colonnes dans etablissements
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS regime VARCHAR(20) DEFAULT 'semestre';
ALTER TABLE etablissements ADD CONSTRAINT etablissements_regime_check 
CHECK (regime IN ('semestre', 'trimestre'));
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT false;
ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS annee_scolaire_active_id UUID REFERENCES annees_scolaires(id);