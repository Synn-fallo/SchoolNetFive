-- Migration GIPS - Version adaptée à l'existant
-- Date: 2026-05-16

-- ============================================================
-- PARTIE 1: Tables qui n'existent pas
-- ============================================================

-- 1. Créer la table rubriques_frais
CREATE TABLE IF NOT EXISTS rubriques_frais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  libelle VARCHAR(100) NOT NULL,
  montant_defaut INTEGER NOT NULL,
  est_obligatoire BOOLEAN DEFAULT true,
  est_bloquant BOOLEAN DEFAULT false,
  cycle_concerne VARCHAR(20),
  niveau_concerne VARCHAR(20),
  remise_filles_pct INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Insérer les rubriques par défaut
INSERT INTO rubriques_frais (code, libelle, montant_defaut, est_obligatoire, est_bloquant)
VALUES 
  ('inscription', 'Frais d''inscription', 10000, true, true),
  ('scolarite_t1', 'Scolarité 1er trimestre', 15000, true, true),
  ('scolarite_t2', 'Scolarité 2nd trimestre', 15000, true, false),
  ('scolarite_t3', 'Scolarité 3ème trimestre', 15000, true, false),
  ('cantine', 'Cantine', 5000, false, false),
  ('transport', 'Transport scolaire', 10000, false, false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- PARTIE 2: Création table factures
-- ============================================================

CREATE TABLE IF NOT EXISTS factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_facture VARCHAR(50) UNIQUE NOT NULL,
  matricule VARCHAR(50) NOT NULL,
  eleve_id UUID NOT NULL REFERENCES eleves(id),
  etablissement_id UUID NOT NULL REFERENCES etablissements(id),
  niveau_id UUID REFERENCES niveaux(id),
  serie_id UUID REFERENCES series(id),
  option_id UUID REFERENCES options_serie(id),
  montant_total INTEGER NOT NULL,
  statut VARCHAR(20) DEFAULT 'en_attente',
  lien_paiement TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_echeance TIMESTAMP NOT NULL,
  date_paiement TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour factures
CREATE INDEX IF NOT EXISTS idx_factures_matricule ON factures(matricule);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_eleve_id ON factures(eleve_id);

-- ============================================================
-- PARTIE 3: Ajout des colonnes à la table paiements existante
-- ============================================================

ALTER TABLE paiements ADD COLUMN IF NOT EXISTS facture_id UUID REFERENCES factures(id);
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS matricule VARCHAR(50);
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS numero_facture VARCHAR(50);
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'confirmed';
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS operateur VARCHAR(10);

-- Index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_paiements_facture_id ON paiements(facture_id);
CREATE INDEX IF NOT EXISTS idx_paiements_matricule ON paiements(matricule);
CREATE INDEX IF NOT EXISTS idx_paiements_numero_facture ON paiements(numero_facture);

-- ============================================================
-- PARTIE 4: Trigger pour mise à jour automatique
-- ============================================================

CREATE OR REPLACE FUNCTION update_eleve_statut_on_facture_payee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.statut = 'paye' AND OLD.statut != 'paye' THEN
    UPDATE eleves 
    SET statut = 'actif' 
    WHERE id = NEW.eleve_id AND statut = 'PRE_ACCEPTED';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_eleve_statut ON factures;
CREATE TRIGGER trigger_update_eleve_statut
  AFTER UPDATE OF statut ON factures
  FOR EACH ROW
  WHEN (NEW.statut = 'paye')
  EXECUTE FUNCTION update_eleve_statut_on_facture_payee();

-- ============================================================
-- PARTIE 5: Trigger pour enregistrer paiement dans factures
-- ============================================================

CREATE OR REPLACE FUNCTION update_facture_on_paiement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_montant_total INTEGER;
  v_total_paye INTEGER;
BEGIN
  -- Récupérer le montant total de la facture
  SELECT montant_total INTO v_montant_total
  FROM factures WHERE id = NEW.facture_id;
  
  -- Calculer le total payé pour cette facture
  SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
  FROM paiements
  WHERE facture_id = NEW.facture_id AND statut = 'confirmed';
  
  -- Si la facture est entièrement payée
  IF v_total_paye >= v_montant_total THEN
    UPDATE factures 
    SET statut = 'paye', date_paiement = NOW() 
    WHERE id = NEW.facture_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_facture_on_paiement ON paiements;
CREATE TRIGGER trigger_update_facture_on_paiement
  AFTER INSERT ON paiements
  FOR EACH ROW
  WHEN (NEW.statut = 'confirmed')
  EXECUTE FUNCTION update_facture_on_paiement();