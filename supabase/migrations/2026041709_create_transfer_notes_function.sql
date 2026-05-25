-- ============================================================
-- PHASE 6a – MIGRATION IN-APP
-- Fonction PostgreSQL pour la transaction de transfert des notes
-- Appelée par l'Edge Function transferer-notes-bloc
-- ============================================================

CREATE OR REPLACE FUNCTION transferer_notes_transaction(
  p_classe_personnelle_id UUID,
  p_classe_officielle_id UUID,
  p_matiere_officielle_id UUID,
  p_enseignant_id UUID,
  p_evaluations JSONB,
  p_eleves_personnels JSONB,
  p_eleve_mapping JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_evaluation RECORD;
  v_eleve RECORD;
  v_eleve_officiel_id UUID;
  v_devoir_id UUID;
  v_note_existante RECORD;
  v_evaluations_transferees INT := 0;
  v_notes_transferees INT := 0;
  v_notes_ecrasees INT := 0;
  v_notes_ignorees INT := 0;
  v_details JSONB := '[]'::JSONB;
  v_detail JSONB;
BEGIN
  -- Parcourir chaque évaluation sélectionnée
  FOR v_evaluation IN SELECT * FROM jsonb_to_recordset(p_evaluations) AS e(
    id TEXT,
    type TEXT,
    titre TEXT,
    date DATE,
    note_sur NUMERIC,
    coefficient INT
  )
  LOOP
    BEGIN
      -- 1. Créer ou récupérer le devoir officiel
      INSERT INTO devoirs (
        id,
        etablissement_id,
        classe_id,
        matiere_id,
        enseignant_id,
        type,
        titre,
        date_devoir,
        note_sur,
        coefficient,
        source,
        periode_id,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        (SELECT etablissement_id FROM classes WHERE id = p_classe_officielle_id),
        p_classe_officielle_id,
        p_matiere_officielle_id,
        p_enseignant_id,
        v_evaluation.type,
        v_evaluation.titre,
        v_evaluation.date,
        v_evaluation.note_sur,
        v_evaluation.coefficient,
        'transfert_independant',
        NULL,
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM devoirs
        WHERE classe_id = p_classe_officielle_id
          AND matiere_id = p_matiere_officielle_id
          AND enseignant_id = p_enseignant_id
          AND titre = v_evaluation.titre
          AND date_devoir = v_evaluation.date
      )
      RETURNING id INTO v_devoir_id;

      -- Si le devoir existe déjà, récupérer son ID
      IF v_devoir_id IS NULL THEN
        SELECT id INTO v_devoir_id FROM devoirs
        WHERE classe_id = p_classe_officielle_id
          AND matiere_id = p_matiere_officielle_id
          AND enseignant_id = p_enseignant_id
          AND titre = v_evaluation.titre
          AND date_devoir = v_evaluation.date
        LIMIT 1;
      END IF;

      -- 2. Parcourir chaque élève personnel
      FOR v_eleve IN SELECT * FROM jsonb_to_recordset(p_eleves_personnels) AS e(
        nom TEXT,
        prenom TEXT,
        matricule TEXT,
        note NUMERIC
      )
      LOOP
        -- Récupérer l'ID de l'élève officiel correspondant
        v_eleve_officiel_id := (p_eleve_mapping->>(v_eleve.nom || '|' || v_eleve.prenom))::UUID;

        IF v_eleve_officiel_id IS NULL THEN
          v_notes_ignorees := v_notes_ignorees + 1;
          CONTINUE;
        END IF;

        -- Vérifier si une note existe déjà pour ce devoir et cet élève
        SELECT id, note INTO v_note_existante
        FROM notes
        WHERE devoir_id = v_devoir_id AND eleve_id = v_eleve_officiel_id
        LIMIT 1;

        IF FOUND THEN
          -- Historiser l'ancienne note
          INSERT INTO note_history (
            note_id,
            old_status,
            new_status,
            reason,
            user_id,
            user_role
          ) VALUES (
            v_note_existante.id,
            (SELECT statut FROM notes WHERE id = v_note_existante.id),
            'livree',
            'Écrasement lors du transfert indépendant → affilié',
            p_enseignant_id,
            'enseignant'
          );

          -- Mettre à jour la note existante
          UPDATE notes
          SET
            note = v_eleve.note,
            statut = 'livree',
            source = 'transfert_independant',
            note_originale = v_note_existante.note,
            updated_at = NOW()
          WHERE id = v_note_existante.id;

          v_notes_ecrasees := v_notes_ecrasees + 1;
        ELSE
          -- Créer une nouvelle note
          INSERT INTO notes (
            id,
            devoir_id,
            eleve_id,
            note,
            statut,
            source,
            created_by,
            created_at,
            updated_at,
            date_livraison
          ) VALUES (
            gen_random_uuid(),
            v_devoir_id,
            v_eleve_officiel_id,
            v_eleve.note,
            'livree',
            'transfert_independant',
            p_enseignant_id,
            NOW(),
            NOW(),
            NOW()
          );

          v_notes_transferees := v_notes_transferees + 1;
        END IF;
      END LOOP;

      v_evaluations_transferees := v_evaluations_transferees + 1;

      -- Ajouter au détail
      v_detail := jsonb_build_object(
        'evaluation', v_evaluation.titre,
        'statut', 'success',
        'message', format('Transfert réussi : %s', v_evaluation.titre)
      );
      v_details := v_details || v_detail;

    EXCEPTION WHEN OTHERS THEN
      -- En cas d'erreur sur une évaluation, tout est annulé (ROLLBACK)
      RAISE EXCEPTION 'Erreur lors du transfert de l''évaluation % : %', v_evaluation.titre, SQLERRM;
    END;
  END LOOP;

  -- Retourner le rapport
  RETURN jsonb_build_object(
    'evaluations_transferees', v_evaluations_transferees,
    'notes_transferees', v_notes_transferees,
    'notes_ecrasees', v_notes_ecrasees,
    'notes_ignorees', v_notes_ignorees,
    'details', v_details
  );
END;
$$;

-- Commentaire
COMMENT ON FUNCTION transferer_notes_transaction IS
'Transaction PostgreSQL pour le transfert des notes d''un enseignant indépendant vers un établissement affilié. Tout ou rien.';