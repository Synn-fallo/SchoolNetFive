-- Migration: Insertion des annonces mockées dans la table annonces_institutionnelles
-- Date: 2026-05-18

-- Remarque: Ces inserts supposent que l'établissement et le profil 'Direction' existent
-- À adapter selon l'ID réel de l'établissement et du profil

DO $$
DECLARE
  v_etablissement_id UUID;
  v_profil_direction_id UUID;
BEGIN
  -- Récupérer l'ID du premier établissement (ou celui par défaut)
  SELECT id INTO v_etablissement_id FROM etablissements LIMIT 1;
  
  -- Récupérer l'ID du profil 'Direction' (ou premier profil admin)
  SELECT id INTO v_profil_direction_id FROM profiles 
  WHERE nom = 'Direction' OR id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  LIMIT 1;
  
  -- Si aucun profil trouvé, utiliser l'ID du premier user
  IF v_profil_direction_id IS NULL THEN
    SELECT id INTO v_profil_direction_id FROM profiles LIMIT 1;
  END IF;

  -- Annonce 1: Réunion parents-enseignants (publiée)
  INSERT INTO annonces_institutionnelles (
    titre, contenu, type, visibilite, etablissement_id, publie_par_id, est_publiee, date_debut, created_at
  ) VALUES (
    'Réunion parents-enseignants',
    'La réunion trimestrielle aura lieu le samedi 15 mai à 10h. Merci de confirmer votre présence.',
    'etablissement',
    'tous',
    v_etablissement_id,
    v_profil_direction_id,
    true,
    '2026-05-15',
    '2026-04-20 00:00:00+00'
  );

  -- Annonce 2: Fermeture exceptionnelle (publiée)
  INSERT INTO annonces_institutionnelles (
    titre, contenu, type, visibilite, etablissement_id, publie_par_id, est_publiee, date_debut, created_at
  ) VALUES (
    'Fermeture exceptionnelle',
    'L''établissement sera fermé le lundi 1er mai pour cause de fête du travail.',
    'etablissement',
    'tous',
    v_etablissement_id,
    v_profil_direction_id,
    true,
    '2026-05-01',
    '2026-04-25 00:00:00+00'
  );

  -- Annonce 3: Nouveau règlement intérieur (brouillon)
  INSERT INTO annonces_institutionnelles (
    titre, contenu, type, visibilite, etablissement_id, publie_par_id, est_publiee, created_at
  ) VALUES (
    'Nouveau règlement intérieur',
    'Le nouveau règlement intérieur est disponible. Veuillez en prendre connaissance.',
    'etablissement',
    'enseignants',
    v_etablissement_id,
    v_profil_direction_id,
    false,
    '2026-04-26 00:00:00+00'
  );

  RAISE NOTICE 'Migration terminée. Établissement utilisé: %, Profil utilisé: %', v_etablissement_id, v_profil_direction_id;
END $$;