-- ============================================================================
-- MIGRATION: Ajout des tables pour le workflow enseignant
-- Date: 2026-04-02
-- Description: Enrichissement de invitation_codes + création des tables
--              enseignant_classes, enseignant_matieres, groupes_eleves,
--              eleve_groupes, enseignant_groupes
-- ============================================================================

-- ============================================================================
-- 1. ENRICHISSEMENT DE invitation_codes
-- ============================================================================

-- Ajout des colonnes pour les invitations enseignants
ALTER TABLE invitation_codes 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS nom text,
  ADD COLUMN IF NOT EXISTS prenom text,
  ADD COLUMN IF NOT EXISTS telephone text,
  ADD COLUMN IF NOT EXISTS statut text DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'acceptee', 'expiree', 'annulee'));

-- Ajout d'un index sur l'email pour les recherches
CREATE INDEX IF NOT EXISTS idx_invitation_codes_email ON invitation_codes(email);

-- Ajout d'un index sur le statut
CREATE INDEX IF NOT EXISTS idx_invitation_codes_statut ON invitation_codes(statut);

-- ============================================================================
-- 2. TABLE enseignant_classes (relation many-to-many enseignant ↔ classe)
-- ============================================================================

CREATE TABLE IF NOT EXISTS enseignant_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id uuid NOT NULL,
  classe_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('responsable', 'intervenant', 'principal')),
  created_at timestamptz DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_enseignant_classes_enseignant ON enseignant_classes(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_enseignant_classes_classe ON enseignant_classes(classe_id);

-- ============================================================================
-- 3. TABLE enseignant_matieres (relation many-to-many enseignant ↔ matière)
-- ============================================================================

CREATE TABLE IF NOT EXISTS enseignant_matieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id uuid NOT NULL,
  matiere_id uuid NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  classe_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_enseignant_matieres_enseignant ON enseignant_matieres(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_enseignant_matieres_matiere ON enseignant_matieres(matiere_id);
CREATE INDEX IF NOT EXISTS idx_enseignant_matieres_classe ON enseignant_matieres(classe_id);

-- ============================================================================
-- 4. TABLE groupes_eleves (groupes au sein d'une classe)
-- ============================================================================

CREATE TABLE IF NOT EXISTS groupes_eleves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_groupes_eleves_classe ON groupes_eleves(classe_id);

-- ============================================================================
-- 5. TABLE eleve_groupes (appartenance des élèves aux groupes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS eleve_groupes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id uuid NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  groupe_id uuid NOT NULL REFERENCES groupes_eleves(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(eleve_id, groupe_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_eleve_groupes_eleve ON eleve_groupes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_eleve_groupes_groupe ON eleve_groupes(groupe_id);

-- ============================================================================
-- 6. TABLE enseignant_groupes (affectation des enseignants aux groupes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS enseignant_groupes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id uuid NOT NULL,
  groupe_id uuid NOT NULL REFERENCES groupes_eleves(id) ON DELETE CASCADE,
  matiere_id uuid NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('responsable', 'intervenant')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(enseignant_id, groupe_id, matiere_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_enseignant_groupes_enseignant ON enseignant_groupes(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_enseignant_groupes_groupe ON enseignant_groupes(groupe_id);
CREATE INDEX IF NOT EXISTS idx_enseignant_groupes_matiere ON enseignant_groupes(matiere_id);

-- ============================================================================
-- 7. COMMENTAIRES POUR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE invitation_codes IS 'Codes d''invitation pour enseignants et autres rôles';
COMMENT ON COLUMN invitation_codes.email IS 'Email de l''enseignant invité';
COMMENT ON COLUMN invitation_codes.nom IS 'Nom de l''enseignant invité';
COMMENT ON COLUMN invitation_codes.prenom IS 'Prénom de l''enseignant invité';
COMMENT ON COLUMN invitation_codes.telephone IS 'Téléphone de l''enseignant invité';
COMMENT ON COLUMN invitation_codes.statut IS 'Statut de l''invitation: en_attente, acceptee, expiree, annulee';

COMMENT ON TABLE enseignant_classes IS 'Relation many-to-many entre enseignants et classes';
COMMENT ON COLUMN enseignant_classes.role IS 'Rôle dans la classe: responsable (professeur principal), intervenant, principal';

COMMENT ON TABLE enseignant_matieres IS 'Relation many-to-many entre enseignants et matières';
COMMENT ON COLUMN enseignant_matieres.classe_id IS 'Optionnel: restreint l''enseignement à une classe spécifique';

COMMENT ON TABLE groupes_eleves IS 'Groupes d''élèves au sein d''une classe (ex: Groupe A, Groupe B)';
COMMENT ON TABLE eleve_groupes IS 'Appartenance des élèves aux groupes';
COMMENT ON TABLE enseignant_groupes IS 'Affectation des enseignants aux groupes pour une matière donnée';
COMMENT ON COLUMN enseignant_groupes.role IS 'Rôle dans le groupe: responsable (cours) ou intervenant (consultation notes seulement)';