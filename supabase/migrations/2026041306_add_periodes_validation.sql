-- ============================================================
-- MIGRATION: Création de la table periodes_validation
-- Date: 13/04/2026
-- Description: Stockage de l'état des périodes (ouverte/fermée/validée)
-- ============================================================

-- Création de la table
CREATE TABLE IF NOT EXISTS public.periodes_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  annee_scolaire_id UUID NOT NULL REFERENCES public.annees_scolaires(id) ON DELETE CASCADE,
  periode VARCHAR(10) NOT NULL,
  is_open BOOLEAN DEFAULT true,
  is_validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(etablissement_id, annee_scolaire_id, periode)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_periodes_validation_etablissement ON public.periodes_validation(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_periodes_validation_annee ON public.periodes_validation(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_periodes_validation_periode ON public.periodes_validation(periode);

-- Trigger pour mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_periodes_validation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_periodes_validation_updated_at ON public.periodes_validation;
CREATE TRIGGER trigger_update_periodes_validation_updated_at
BEFORE UPDATE ON public.periodes_validation
FOR EACH ROW
EXECUTE FUNCTION update_periodes_validation_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.periodes_validation ENABLE ROW LEVEL SECURITY;

-- Suppression des politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS periodes_validation_select_policy ON public.periodes_validation;
DROP POLICY IF EXISTS periodes_validation_insert_policy ON public.periodes_validation;
DROP POLICY IF EXISTS periodes_validation_update_policy ON public.periodes_validation;
DROP POLICY IF EXISTS periodes_validation_delete_policy ON public.periodes_validation;

-- Lecture: tout utilisateur authentifié peut voir
CREATE POLICY periodes_validation_select_policy ON public.periodes_validation
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insertion/Mise à jour: seul le chef d'établissement peut modifier
CREATE POLICY periodes_validation_insert_policy ON public.periodes_validation
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'chef_etablissement')
  );

CREATE POLICY periodes_validation_update_policy ON public.periodes_validation
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'chef_etablissement')
  );

CREATE POLICY periodes_validation_delete_policy ON public.periodes_validation
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'chef_etablissement')
  );

-- Insertion des périodes par défaut pour l'année scolaire active (si aucune donnée)
INSERT INTO periodes_validation (etablissement_id, annee_scolaire_id, periode, is_open, is_validated)
SELECT 
  e.id,
  a.id,
  p.periode,
  CASE WHEN p.periode = 'S1' OR p.periode = 'T1' THEN true ELSE false END,
  false
FROM etablissements e
CROSS JOIN annees_scolaires a
CROSS JOIN (VALUES ('S1'), ('S2'), ('T1'), ('T2'), ('T3')) AS p(periode)
WHERE a.is_active = true
ON CONFLICT (etablissement_id, annee_scolaire_id, periode) DO NOTHING;

COMMENT ON TABLE public.periodes_validation IS 'Gestion des périodes (ouvertures/fermetures/validations)';
COMMENT ON COLUMN public.periodes_validation.periode IS 'Période: S1, S2, T1, T2, T3';
COMMENT ON COLUMN public.periodes_validation.is_open IS 'Période ouverte à la saisie';
COMMENT ON COLUMN public.periodes_validation.is_validated IS 'Période validée par le chef (notes définitives)';