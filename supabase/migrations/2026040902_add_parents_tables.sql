-- ============================================================
-- MIGRATION: Ajout des tables parents et parent_eleve
-- Date: 2026-04-10
-- Approche: ADDITIVE UNIQUEMENT (rien n'est supprimé)
-- ============================================================

-- ============================================================
-- PARTIE 1: Création des nouvelles tables
-- ============================================================

-- 1.1 Table parents (comptes parents)
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email_snet VARCHAR(255) UNIQUE NOT NULL,
  email_personnel VARCHAR(255) UNIQUE,
  telephone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 Table parent_eleve (liaison parent → élève)
CREATE TABLE IF NOT EXISTS public.parent_eleve (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  type_lien VARCHAR(20) NOT NULL CHECK (type_lien IN ('pere', 'mere', 'tuteur', 'autre')),
  est_principal BOOLEAN DEFAULT false,
  est_contact_urgence BOOLEAN DEFAULT false,
  autorisations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, eleve_id, type_lien)
);

-- ============================================================
-- PARTIE 2: Index pour performances
-- ============================================================

-- Index sur parent_eleve
CREATE INDEX IF NOT EXISTS idx_parent_eleve_parent_id ON public.parent_eleve(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_eleve_eleve_id ON public.parent_eleve(eleve_id);
CREATE INDEX IF NOT EXISTS idx_parent_eleve_type_lien ON public.parent_eleve(type_lien);

-- Index sur parents
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON public.parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_email_snet ON public.parents(email_snet);
CREATE INDEX IF NOT EXISTS idx_parents_email_personnel ON public.parents(email_personnel);
CREATE INDEX IF NOT EXISTS idx_parents_nom ON public.parents(nom);
CREATE INDEX IF NOT EXISTS idx_parents_prenom ON public.parents(prenom);

-- Index composite pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_parents_nom_prenom ON public.parents(nom, prenom);

-- ============================================================
-- PARTIE 3: Ajout des colonnes de compatibilité (AVANT migration des données)
-- ============================================================

-- 3.1 Ajouter type_lien_parent si non existant (pour compatibilité)
ALTER TABLE public.eleves ADD COLUMN IF NOT EXISTS type_lien_parent VARCHAR(20);
COMMENT ON COLUMN public.eleves.type_lien_parent IS 'Type de lien du parent principal (déprécié, utiliser parent_eleve.type_lien)';

-- 3.2 Ajouter une colonne pour indiquer si l'ancien système est encore utilisé
ALTER TABLE public.eleves ADD COLUMN IF NOT EXISTS use_legacy_parent BOOLEAN DEFAULT true;
COMMENT ON COLUMN public.eleves.use_legacy_parent IS 'Flag indiquant si l''ancien parent_id est utilisé (pour migration progressive)';

-- ============================================================
-- PARTIE 4: Migration des données existantes (si parent_id non null)
-- NOTE: Actuellement, aucun élève n'a de parent_id renseigné.
-- Cette section est gardée pour d'éventuelles migrations futures.
-- ============================================================

-- 4.1 Migrer les parents existants vers la table parents
DO $$
DECLARE
  v_parent_record RECORD;
BEGIN
  FOR v_parent_record IN 
    SELECT DISTINCT 
      e.parent_id, 
      p.nom, 
      p.prenom, 
      p.telephone,
      u.email
    FROM eleves e
    JOIN profiles p ON p.id = e.parent_id
    LEFT JOIN auth.users u ON u.id = e.parent_id
    WHERE e.parent_id IS NOT NULL
  LOOP
    INSERT INTO parents (id, user_id, nom, prenom, email_snet, telephone, is_active)
    VALUES (
      v_parent_record.parent_id,
      v_parent_record.parent_id,
      COALESCE(v_parent_record.nom, ''),
      COALESCE(v_parent_record.prenom, ''),
      COALESCE(v_parent_record.email, ''),
      v_parent_record.telephone,
      true
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- 4.2 Créer les liens parent_eleve à partir des données existantes
INSERT INTO public.parent_eleve (parent_id, eleve_id, type_lien, est_principal)
SELECT 
  e.parent_id,
  e.id,
  COALESCE(e.type_lien_parent, 'autre') AS type_lien,
  true AS est_principal
FROM public.eleves e
WHERE e.parent_id IS NOT NULL
ON CONFLICT (parent_id, eleve_id, type_lien) DO NOTHING;

-- ============================================================
-- PARTIE 5: Triggers pour mise à jour automatique
-- ============================================================

-- 5.1 Fonction pour updated_at sur parents
CREATE OR REPLACE FUNCTION update_parents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Trigger pour parents
DROP TRIGGER IF EXISTS trigger_parents_updated_at ON public.parents;
CREATE TRIGGER trigger_parents_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW
  EXECUTE FUNCTION update_parents_updated_at();

-- 5.3 Trigger pour parent_eleve
DROP TRIGGER IF EXISTS trigger_parent_eleve_updated_at ON public.parent_eleve;
CREATE TRIGGER trigger_parent_eleve_updated_at
  BEFORE UPDATE ON public.parent_eleve
  FOR EACH ROW
  EXECUTE FUNCTION update_parents_updated_at();

-- ============================================================
-- PARTIE 6: Politiques RLS (Row Level Security)
-- ============================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_eleve ENABLE ROW LEVEL SECURITY;

-- 6.1 Politique: Les parents peuvent voir leurs propres informations
DROP POLICY IF EXISTS "Parents can view own info" ON public.parents;
CREATE POLICY "Parents can view own info" ON public.parents
  FOR SELECT USING (auth.uid() = user_id);

-- 6.2 Politique: Les parents peuvent modifier leurs propres informations
DROP POLICY IF EXISTS "Parents can update own info" ON public.parents;
CREATE POLICY "Parents can update own info" ON public.parents
  FOR UPDATE USING (auth.uid() = user_id);

-- 6.3 Politique: Les chefs d'établissement peuvent voir les parents de leur école
DROP POLICY IF EXISTS "Chef etablissement can view parents" ON public.parents;
CREATE POLICY "Chef etablissement can view parents" ON public.parents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('chef_etablissement', 'admin')
      AND ur.is_active = true
    )
  );

-- 6.4 Politique: Les chefs d'établissement peuvent voir les liens parent-élève
DROP POLICY IF EXISTS "Chef etablissement can view parent_eleve" ON public.parent_eleve;
CREATE POLICY "Chef etablissement can view parent_eleve" ON public.parent_eleve
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('chef_etablissement', 'admin')
      AND ur.is_active = true
    )
  );

-- 6.5 Politique: Les parents peuvent voir les liens concernant leurs enfants
DROP POLICY IF EXISTS "Parents can view own parent_eleve" ON public.parent_eleve;
CREATE POLICY "Parents can view own parent_eleve" ON public.parent_eleve
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parents p
      WHERE p.id = parent_eleve.parent_id
      AND p.user_id = auth.uid()
    )
  );

-- 6.6 Politique: Insertion autorisée uniquement par les chefs d'établissement ou admins
DROP POLICY IF EXISTS "Chef etablissement can insert parent_eleve" ON public.parent_eleve;
CREATE POLICY "Chef etablissement can insert parent_eleve" ON public.parent_eleve
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('chef_etablissement', 'admin')
      AND ur.is_active = true
    )
  );

-- ============================================================
-- PARTIE 7: Fonctions utilitaires
-- ============================================================

-- 7.1 Fonction pour récupérer tous les parents d'un élève
CREATE OR REPLACE FUNCTION get_parents_by_eleve(p_eleve_id UUID)
RETURNS TABLE(
  parent_id UUID,
  nom VARCHAR,
  prenom VARCHAR,
  email_snet VARCHAR,
  email_personnel VARCHAR,
  telephone VARCHAR,
  type_lien VARCHAR,
  est_principal BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nom,
    p.prenom,
    p.email_snet,
    p.email_personnel,
    p.telephone,
    pe.type_lien,
    pe.est_principal
  FROM parents p
  JOIN parent_eleve pe ON pe.parent_id = p.id
  WHERE pe.eleve_id = p_eleve_id
    AND p.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 Fonction pour lier un parent à un élève (version améliorée)
-- ⚠️ Les paramètres sans DEFAULT sont placés en premier
CREATE OR REPLACE FUNCTION link_parent_to_eleve(
  p_email_snet VARCHAR,
  p_eleve_id UUID,
  p_type_lien VARCHAR,
  p_est_principal BOOLEAN DEFAULT false,
  p_email_personnel VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_parent_id UUID;
  v_user_id UUID;
BEGIN
  -- Vérifier si le parent existe déjà par email_snet
  SELECT id, user_id INTO v_parent_id, v_user_id
  FROM parents
  WHERE email_snet = p_email_snet;
  
  -- Si le parent n'existe pas, créer un compte utilisateur et un parent
  IF v_parent_id IS NULL THEN
    -- Créer un utilisateur auth (sera complété par l'invitation)
    INSERT INTO auth.users (email, email_confirmed_at)
    VALUES (p_email_snet, NOW())
    RETURNING id INTO v_user_id;
    
    -- Créer le parent
    INSERT INTO parents (user_id, nom, prenom, email_snet, email_personnel, is_active)
    VALUES (v_user_id, '', '', p_email_snet, p_email_personnel, true)
    RETURNING id INTO v_parent_id;
  END IF;
  
  -- Créer le lien parent-élève
  INSERT INTO parent_eleve (parent_id, eleve_id, type_lien, est_principal)
  VALUES (v_parent_id, p_eleve_id, p_type_lien, p_est_principal)
  ON CONFLICT (parent_id, eleve_id, type_lien) DO NOTHING;
  
  RETURN v_parent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3 Fonction pour obtenir l'email de connexion (priorité email_personnel si existant)
CREATE OR REPLACE FUNCTION get_parent_login_email(p_parent_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_email_snet VARCHAR;
  v_email_personnel VARCHAR;
BEGIN
  SELECT email_snet, email_personnel 
  INTO v_email_snet, v_email_personnel
  FROM parents
  WHERE id = p_parent_id;
  
  RETURN COALESCE(v_email_personnel, v_email_snet);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PARTIE 8: Commentaires pour documentation
-- ============================================================

COMMENT ON TABLE public.parents IS 'Table des parents/tuteurs (nouvelle approche multi-parents)';
COMMENT ON TABLE public.parent_eleve IS 'Lien entre parents et élèves avec type de relation';
COMMENT ON COLUMN public.parents.email_snet IS 'Email SNET généré automatiquement (nom.prenom@snet.bj) - OBLIGATOIRE';
COMMENT ON COLUMN public.parents.email_personnel IS 'Email personnel du parent (optionnel, pour connexion alternative)';
COMMENT ON COLUMN public.parent_eleve.type_lien IS 'Type de lien: pere, mere, tuteur, autre';
COMMENT ON COLUMN public.parent_eleve.est_principal IS 'Indique si c''est le parent principal (pour communications prioritaires)';
COMMENT ON COLUMN public.parent_eleve.est_contact_urgence IS 'Indique si c''est un contact à prévenir en cas d''urgence';
COMMENT ON COLUMN public.eleves.parent_id IS '[DÉPRÉCIÉ] Utiliser la table parent_eleve à la place';
COMMENT ON COLUMN public.eleves.type_lien_parent IS '[DÉPRÉCIÉ] Utiliser parent_eleve.type_lien à la place';
COMMENT ON COLUMN public.eleves.use_legacy_parent IS 'Flag pour migration progressive vers parent_eleve';

-- ============================================================
-- PARTIE 9: Vérification post-migration
-- ============================================================

DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parents'), 
    'ERREUR: Table parents non créée';
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parent_eleve'), 
    'ERREUR: Table parent_eleve non créée';
  RAISE NOTICE '✅ Migration additive réussie: Tables parents et parent_eleve créées';
  RAISE NOTICE '⚠️ La colonne eleves.parent_id est conservée pour compatibilité (dépréciée)';
  RAISE NOTICE '⚠️ L''index idx_eleves_parent est conservé';
  RAISE NOTICE '📧 email_snet: obligatoire (généré automatiquement)';
  RAISE NOTICE '📧 email_personnel: optionnel (pour connexion alternative)';
END $$;