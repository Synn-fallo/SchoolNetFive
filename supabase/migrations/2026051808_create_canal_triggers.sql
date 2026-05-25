-- Migration: Création des triggers pour la gestion automatique des canaux
-- Date: 2026-05-18
-- Description: Création et mise à jour automatique des canaux lors des changements de PP

-- ============================================================
-- FONCTION: Créer un canal pour une classe
-- ============================================================
CREATE OR REPLACE FUNCTION creer_canal_pour_classe(
  p_classe_id UUID,
  p_animateur_id UUID,
  p_annee_scolaire_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_canal_id UUID;
  v_classe_nom TEXT;
  v_annee_libelle TEXT;
BEGIN
  -- Récupérer le nom de la classe
  SELECT nom INTO v_classe_nom FROM classes WHERE id = p_classe_id;
  
  -- Récupérer le libellé de l'année scolaire
  SELECT libelle INTO v_annee_libelle FROM annees_scolaires WHERE id = p_annee_scolaire_id;
  
  -- Créer le canal
  INSERT INTO canaux_classe (classe_id, annee_scolaire_id, animateur_id, nom, mode)
  VALUES (p_classe_id, p_annee_scolaire_id, p_animateur_id, 
          CONCAT('Classe ', v_classe_nom, ' - ', v_annee_libelle), 'moderation')
  RETURNING id INTO v_canal_id;
  
  -- Ajouter l'animateur comme membre
  INSERT INTO membres_canal (canal_id, user_id, role, peut_ecrire, est_actif)
  VALUES (v_canal_id, p_animateur_id, 'animateur', true, true)
  ON CONFLICT (canal_id, user_id) DO NOTHING;
  
  -- ✅ AJOUT : Ajouter tous les parents déjà liés aux élèves de cette classe
  INSERT INTO membres_canal (canal_id, user_id, role, peut_ecrire, est_actif)
  SELECT DISTINCT
    v_canal_id,
    p.user_id,
    'membre',
    true,
    true
  FROM eleves e
  JOIN parent_eleve pe ON pe.eleve_id = e.id
  JOIN parents p ON p.id = pe.parent_id
  WHERE e.classe_id = p_classe_id
    AND p.user_id IS NOT NULL
  ON CONFLICT (canal_id, user_id) DO NOTHING;
  
  RETURN v_canal_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FONCTION: Transférer l'animation d'un canal
-- ============================================================
CREATE OR REPLACE FUNCTION transferer_animation_canal(
  p_classe_id UUID,
  p_ancien_animateur_id UUID,
  p_nouveau_animateur_id UUID,
  p_annee_scolaire_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_canal_id UUID;
BEGIN
  -- Récupérer le canal
  SELECT id INTO v_canal_id FROM canaux_classe 
  WHERE classe_id = p_classe_id AND annee_scolaire_id = p_annee_scolaire_id;
  
  IF v_canal_id IS NOT NULL THEN
    -- Ancien animateur devient simple membre (peut encore écrire si mode libre)
    UPDATE membres_canal 
    SET role = 'membre', peut_ecrire = true
    WHERE canal_id = v_canal_id AND user_id = p_ancien_animateur_id;
    
    -- Nouvel animateur prend le rôle
    INSERT INTO membres_canal (canal_id, user_id, role, peut_ecrire, est_actif)
    VALUES (v_canal_id, p_nouveau_animateur_id, 'animateur', true, true)
    ON CONFLICT (canal_id, user_id) 
    DO UPDATE SET role = 'animateur', peut_ecrire = true, est_actif = true;
    
    -- Mettre à jour l'animateur du canal
    UPDATE canaux_classe SET animateur_id = p_nouveau_animateur_id
    WHERE id = v_canal_id;
    
    -- Notification à l'ancien animateur
    INSERT INTO notifications (user_id, titre, contenu, type, data)
    VALUES (
      p_ancien_animateur_id,
      'Fin de votre rôle d''animateur',
      'Vous n''êtes plus l''animateur du canal de la classe. Un nouveau professeur principal a été assigné.',
      'ANIMATEUR_TRANSFERE',
      jsonb_build_object('classe_id', p_classe_id)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FONCTION: Désactiver un canal sans animateur
-- ============================================================
CREATE OR REPLACE FUNCTION desactiver_canal_sans_animateur(
  p_classe_id UUID,
  p_annee_scolaire_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_canal_id UUID;
BEGIN
  SELECT id INTO v_canal_id FROM canaux_classe 
  WHERE classe_id = p_classe_id AND annee_scolaire_id = p_annee_scolaire_id;
  
  IF v_canal_id IS NOT NULL THEN
    -- Canal passe en mode 'ferme'
    UPDATE canaux_classe SET mode = 'ferme' WHERE id = v_canal_id;
    
    -- Notification aux membres
    INSERT INTO notifications (user_id, titre, contenu, type, data)
    SELECT 
      m.user_id,
      'Canal temporairement fermé',
      'Le canal de la classe est temporairement fermé car aucun professeur principal n''est assigné.',
      'CANAL_SANS_ANIMATEUR',
      jsonb_build_object('classe_id', p_classe_id)
    FROM membres_canal m WHERE m.canal_id = v_canal_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Gestion des canaux lors des changements de PP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_classe_canal_on_pp_change()
RETURNS TRIGGER AS $$
DECLARE
  v_annee_scolaire_id UUID;
BEGIN
  -- Récupérer l'année scolaire active (si non renseignée)
  v_annee_scolaire_id := COALESCE(
    NEW.annee_scolaire_id,
    (SELECT id FROM annees_scolaires WHERE is_active = true LIMIT 1)
  );
  
  -- Cas 1: PP vient d'être assigné (NULL → valeur)
  IF (OLD.enseignant_principal_id IS NULL AND NEW.enseignant_principal_id IS NOT NULL) THEN
    PERFORM creer_canal_pour_classe(NEW.id, NEW.enseignant_principal_id, v_annee_scolaire_id);
  
  -- Cas 2: PP a changé (valeur A → valeur B)
  ELSIF (OLD.enseignant_principal_id IS NOT NULL AND NEW.enseignant_principal_id IS NOT NULL 
         AND OLD.enseignant_principal_id != NEW.enseignant_principal_id) THEN
    PERFORM transferer_animation_canal(NEW.id, OLD.enseignant_principal_id, NEW.enseignant_principal_id, v_annee_scolaire_id);
  
  -- Cas 3: PP a été retiré (valeur → NULL)
  ELSIF (OLD.enseignant_principal_id IS NOT NULL AND NEW.enseignant_principal_id IS NULL) THEN
    PERFORM desactiver_canal_sans_animateur(NEW.id, v_annee_scolaire_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CRÉATION DU TRIGGER SUR classes
-- ============================================================
DROP TRIGGER IF EXISTS trigger_classe_canal_on_pp_change ON classes;

CREATE TRIGGER trigger_classe_canal_on_pp_change
  AFTER UPDATE OF enseignant_principal_id ON classes
  FOR EACH ROW
  EXECUTE FUNCTION handle_classe_canal_on_pp_change();

-- ============================================================
-- FONCTION: Ajouter un parent au canal (appelée par trigger parent_eleve)
-- ============================================================
CREATE OR REPLACE FUNCTION ajouter_parent_au_canal(
  p_parent_user_id UUID,
  p_eleve_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_classe_id UUID;
  v_canal_id UUID;
  v_annee_scolaire_id UUID;
BEGIN
  -- Récupérer la classe de l'élève
  SELECT classe_id INTO v_classe_id FROM eleves WHERE id = p_eleve_id;
  
  IF v_classe_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Récupérer l'année scolaire active
  SELECT id INTO v_annee_scolaire_id FROM annees_scolaires WHERE is_active = true LIMIT 1;
  
  -- Récupérer le canal de la classe
  SELECT id INTO v_canal_id FROM canaux_classe 
  WHERE classe_id = v_classe_id AND annee_scolaire_id = v_annee_scolaire_id;
  
  IF v_canal_id IS NOT NULL THEN
    -- Ajouter le parent comme membre (s'il n'existe pas déjà)
    INSERT INTO membres_canal (canal_id, user_id, role, peut_ecrire, est_actif)
    VALUES (v_canal_id, p_parent_user_id, 'membre', true, true)
    ON CONFLICT (canal_id, user_id) 
    DO UPDATE SET est_actif = true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Ajouter automatiquement les parents au canal lors du lien parent-élève
-- ============================================================
CREATE OR REPLACE FUNCTION handle_parent_eleve_canal()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_user_id UUID;
BEGIN
  -- Récupérer le user_id du parent
  SELECT user_id INTO v_parent_user_id FROM parents WHERE id = NEW.parent_id;
  
  IF v_parent_user_id IS NOT NULL THEN
    PERFORM ajouter_parent_au_canal(v_parent_user_id, NEW.eleve_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_parent_eleve_canal ON parent_eleve;

CREATE TRIGGER trigger_parent_eleve_canal
  AFTER INSERT ON parent_eleve
  FOR EACH ROW
  EXECUTE FUNCTION handle_parent_eleve_canal();

-- ============================================================
-- FONCTION: Archivage automatique des canaux en fin d'année
-- ============================================================
CREATE OR REPLACE FUNCTION archiver_canaux_fin_annee()
RETURNS void AS $$
BEGIN
  -- Archiver les canaux des années scolaires terminées
  UPDATE canaux_classe
  SET est_archive = true, archived_at = NOW()
  WHERE annee_scolaire_id IN (
    SELECT id FROM annees_scolaires WHERE date_fin < CURRENT_DATE
  )
  AND est_archive = false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INITIALISATION: Créer les canaux pour les classes existantes avec PP
-- ============================================================
DO $$
DECLARE
  v_classe RECORD;
  v_annee_scolaire_id UUID;
BEGIN
  -- Récupérer l'année scolaire active
  SELECT id INTO v_annee_scolaire_id FROM annees_scolaires WHERE is_active = true LIMIT 1;
  
  IF v_annee_scolaire_id IS NOT NULL THEN
    FOR v_classe IN 
      SELECT id, enseignant_principal_id FROM classes 
      WHERE enseignant_principal_id IS NOT NULL
    LOOP
      PERFORM creer_canal_pour_classe(v_classe.id, v_classe.enseignant_principal_id, v_annee_scolaire_id);
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;