-- Migration: Création de la table annonces_institutionnelles
-- Date: 2026-05-18
-- Description: Annonces officielles pour établissements, classes, cycles, promotions

-- ============================================================
-- TABLE annonces_institutionnelles
-- ============================================================
CREATE TABLE annonces_institutionnelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre VARCHAR(200) NOT NULL,
  contenu TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('etablissement', 'classe', 'cycle', 'promotion')),
  visibilite VARCHAR(50) NOT NULL CHECK (visibilite IN ('eleves', 'parents', 'enseignants', 'tous')),
  etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES cycles(id) ON DELETE CASCADE,
  promotion_niveau VARCHAR(20), -- '3eme', 'terminale'
  publie_par_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  est_publiee BOOLEAN DEFAULT false,
  est_epingle BOOLEAN DEFAULT false,
  date_debut DATE,
  date_fin DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE annonces_institutionnelles IS 'Annonces officielles pour la communication institutionnelle';
COMMENT ON COLUMN annonces_institutionnelles.type IS 'etablissement, classe, cycle, promotion';
COMMENT ON COLUMN annonces_institutionnelles.visibilite IS 'eleves, parents, enseignants, tous';
COMMENT ON COLUMN annonces_institutionnelles.est_publiee IS 'False = brouillon, True = publiée';
COMMENT ON COLUMN annonces_institutionnelles.est_epingle IS 'Annonce épinglée en haut de la liste';

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX idx_annonces_etablissement ON annonces_institutionnelles(etablissement_id);
CREATE INDEX idx_annonces_classe ON annonces_institutionnelles(classe_id);
CREATE INDEX idx_annonces_publie_par ON annonces_institutionnelles(publie_par_id);
CREATE INDEX idx_annonces_type ON annonces_institutionnelles(type);
CREATE INDEX idx_annonces_visibilite ON annonces_institutionnelles(visibilite);
CREATE INDEX idx_annonces_publiee ON annonces_institutionnelles(est_publiee);
CREATE INDEX idx_annonces_epingle ON annonces_institutionnelles(est_epingle);
CREATE INDEX idx_annonces_dates ON annonces_institutionnelles(date_debut, date_fin);
CREATE INDEX idx_annonces_created ON annonces_institutionnelles(created_at DESC);

-- ============================================================
-- TRIGGER pour updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_annonces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_annonces_updated_at
  BEFORE UPDATE ON annonces_institutionnelles
  FOR EACH ROW
  EXECUTE FUNCTION update_annonces_updated_at();

-- ============================================================
-- POLITIQUES RLS
-- ============================================================
ALTER TABLE annonces_institutionnelles ENABLE ROW LEVEL SECURITY;

-- Admin et Chef d'établissement peuvent tout faire
CREATE POLICY "admin_full_access_annonces" ON annonces_institutionnelles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'chef_etablissement')
      AND user_roles.is_active = true
    )
  );

-- Enseignants (PP) peuvent gérer les annonces de leur classe
CREATE POLICY "enseignants_manage_class_annonces" ON annonces_institutionnelles
  FOR ALL
  USING (
    type = 'classe'
    AND classe_id IN (
      SELECT classe_id FROM enseignant_classes
      WHERE enseignant_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = classe_id
        AND classes.enseignant_principal_id = auth.uid()
      )
    )
  );

-- Enseignants (PP) peuvent voir leurs annonces
CREATE POLICY "enseignants_view_own_annonces" ON annonces_institutionnelles
  FOR SELECT
  USING (publie_par_id = auth.uid());

-- Parents voient les annonces visibles pour eux
CREATE POLICY "parents_view_annonces" ON annonces_institutionnelles
  FOR SELECT
  USING (
    est_publiee = true
    AND (
      -- Annonces établissement
      (type = 'etablissement' AND visibilite IN ('parents', 'tous'))
      OR
      -- Annonces classe (si l'enfant est dans cette classe)
      (type = 'classe' AND EXISTS (
        SELECT 1
        FROM parents
        JOIN parent_eleve ON parent_eleve.parent_id = parents.id
        JOIN eleves ON eleves.id = parent_eleve.eleve_id
        WHERE parents.user_id = auth.uid()
        AND eleves.classe_id = annonces_institutionnelles.classe_id
      ))
    )
  );

-- Élèves voient les annonces visibles pour eux
CREATE POLICY "eleves_view_annonces" ON annonces_institutionnelles
  FOR SELECT
  USING (
    est_publiee = true
    AND (
      -- Annonces établissement
      (type = 'etablissement' AND visibilite IN ('eleves', 'tous'))
      OR
      -- Annonces classe (si l'élève est dans cette classe)
      (type = 'classe' AND EXISTS (
        SELECT 1 FROM eleves
        WHERE eleves.user_id = auth.uid()
        AND eleves.classe_id = annonces_institutionnelles.classe_id
      ))
    )
  );

-- Enseignants voient les annonces visibles pour eux
CREATE POLICY "enseignants_view_annonces" ON annonces_institutionnelles
  FOR SELECT
  USING (
    est_publiee = true
    AND (
      -- Annonces établissement
      (type = 'etablissement' AND visibilite IN ('enseignants', 'tous'))
      OR
      -- Annonces classe (si l'enseignant enseigne dans cette classe)
      (type = 'classe' AND EXISTS (
        SELECT 1 FROM enseignant_classes
        WHERE enseignant_classes.enseignant_id = auth.uid()
        AND enseignant_classes.classe_id = annonces_institutionnelles.classe_id
      ))
    )
  );

-- ============================================================
-- FONCTION: Nettoyage automatique des annonces expirées
-- ============================================================
CREATE OR REPLACE FUNCTION clean_expired_annonces()
RETURNS void AS $$
BEGIN
  UPDATE annonces_institutionnelles
  SET est_publiee = false
  WHERE date_fin < CURRENT_DATE
  AND est_publiee = true;
END;
$$ LANGUAGE plpgsql;