-- Migration: Création de la table partenariats_etablissements
-- Date: 13/04/2026
-- Description: Table pour lier les partenaires aux établissements

-- ============================================================
-- 1. Création de la table partenariats_etablissements
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partenariats_etablissements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partenaire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  statut TEXT DEFAULT 'actif',
  date_debut TIMESTAMPTZ DEFAULT now(),
  date_fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partenaire_id, etablissement_id)
);

-- ============================================================
-- 2. Contraintes et validation (CORRIGÉ)
-- ============================================================

-- Supprimer la contrainte si elle existe (pour éviter l'erreur de duplication)
ALTER TABLE public.partenariats_etablissements 
DROP CONSTRAINT IF EXISTS partenariats_etablissements_statut_check;

-- Ajouter la contrainte avec la vérification
ALTER TABLE public.partenariats_etablissements 
ADD CONSTRAINT partenariats_etablissements_statut_check 
CHECK (statut IN ('actif', 'suspendu', 'termine'));

-- ============================================================
-- 3. Index pour les performances
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_partenariats_partenaire ON public.partenariats_etablissements(partenaire_id);
CREATE INDEX IF NOT EXISTS idx_partenariats_etablissement ON public.partenariats_etablissements(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_partenariats_statut ON public.partenariats_etablissements(statut);

-- ============================================================
-- 4. Trigger pour mise à jour automatique de updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_partenariats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_update_partenariats_updated_at ON public.partenariats_etablissements;

-- Créer le trigger
CREATE TRIGGER trigger_update_partenariats_updated_at
BEFORE UPDATE ON public.partenariats_etablissements
FOR EACH ROW
EXECUTE FUNCTION update_partenariats_updated_at();

-- ============================================================
-- 5. Politiques RLS (Row Level Security)
-- ============================================================

-- Activer RLS
ALTER TABLE public.partenariats_etablissements ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Partenaire peut voir ses partenariats" ON public.partenariats_etablissements;
DROP POLICY IF EXISTS "Etablissement peut voir ses partenaires" ON public.partenariats_etablissements;
DROP POLICY IF EXISTS "Admin peut créer des partenariats" ON public.partenariats_etablissements;

-- Lecture : le partenaire peut voir ses propres partenariats
CREATE POLICY "Partenaire peut voir ses partenariats"
  ON public.partenariats_etablissements FOR SELECT
  TO authenticated
  USING (partenaire_id = auth.uid());

-- Lecture : l'établissement peut voir ses partenaires
CREATE POLICY "Etablissement peut voir ses partenaires"
  ON public.partenariats_etablissements FOR SELECT
  TO authenticated
  USING (etablissement_id IN (
    SELECT etablissement_id FROM user_roles WHERE user_id = auth.uid()
  ));

-- Insertion : admin ou chef d'établissement peut créer
CREATE POLICY "Admin peut créer des partenariats"
  ON public.partenariats_etablissements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'chef_etablissement')
  ));

-- ============================================================
-- 6. Commentaires
-- ============================================================

COMMENT ON TABLE public.partenariats_etablissements IS 'Lien entre les partenaires (ONG, entreprises) et les établissements';
COMMENT ON COLUMN public.partenariats_etablissements.statut IS 'Statut du partenariat : actif, suspendu, termine';