import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface EleveMapping {
  elevePersonnel: { nom: string; prenom: string; matricule?: string };
  eleveOfficielId: string;
}

export function useTransferNotesToOfficielle() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Transfère les notes d'une classe personnelle vers une classe officielle
   * @param classePersonnelleId - ID de la classe personnelle source
   * @param classeOfficielleId - ID de la classe officielle cible
   * @param mapping - Correspondance entre élèves personnels et officiels
   */
  const transfererNotes = async (
    classePersonnelleId: string,
    classeOfficielleId: string,
    mapping: EleveMapping[]
  ): Promise<boolean> => {
    if (!user) {
      setError('Utilisateur non authentifié');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer tous les devoirs de la classe personnelle
      const { data: devoirs, error: devoirsError } = await supabase
        .from('devoirs')
        .select(`
          id,
          titre,
          description,
          type,
          date_devoir,
          note_sur,
          coefficient,
          matiere_nom,
          enseignant_id
        `)
        .eq('classe_personnelle_id', classePersonnelleId);

      if (devoirsError) throw devoirsError;

      if (!devoirs || devoirs.length === 0) {
        console.log('Aucun devoir à transférer');
        return true;
      }

      // 2. Pour chaque devoir, créer un équivalent dans la classe officielle
      for (const devoir of devoirs) {
        // Vérifier si le devoir existe déjà dans la classe officielle
        const { data: existingDevoir, error: checkError } = await supabase
          .from('devoirs')
          .select('id')
          .eq('classe_id', classeOfficielleId)
          .eq('titre', devoir.titre)
          .eq('date_devoir', devoir.date_devoir)
          .maybeSingle();

        if (checkError) throw checkError;

        let nouveauDevoirId = existingDevoir?.id;

        // Créer le devoir s'il n'existe pas
        if (!existingDevoir) {
          const { data: newDevoir, error: createError } = await supabase
            .from('devoirs')
            .insert({
              enseignant_id: user.id,
              classe_id: classeOfficielleId,
              titre: devoir.titre,
              description: devoir.description,
              type: devoir.type,
              date_devoir: devoir.date_devoir,
              note_sur: devoir.note_sur,
              coefficient: devoir.coefficient,
              matiere_nom: devoir.matiere_nom,
              is_published: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) throw createError;
          nouveauDevoirId = newDevoir.id;
        }

        // 3. Récupérer les notes de ce devoir pour les élèves personnels
        for (const map of mapping) {
          const { data: notesPersonnelles, error: notesError } = await supabase
            .from('notes')
            .select('note, appreciation')
            .eq('devoir_id', devoir.id)
            .eq('eleve_nom', map.elevePersonnel.nom)
            .eq('eleve_prenom', map.elevePersonnel.prenom)
            .maybeSingle();

          if (notesError) throw notesError;

          if (notesPersonnelles && notesPersonnelles.note > 0) {
            // Vérifier si la note existe déjà
            const { data: existingNote, error: existingNoteError } = await supabase
              .from('notes')
              .select('id')
              .eq('devoir_id', nouveauDevoirId)
              .eq('eleve_id', map.eleveOfficielId)
              .maybeSingle();

            if (existingNoteError) throw existingNoteError;

            if (!existingNote) {
              // Créer la note
              const { error: insertNoteError } = await supabase
                .from('notes')
                .insert({
                  devoir_id: nouveauDevoirId,
                  eleve_id: map.eleveOfficielId,
                  note: notesPersonnelles.note,
                  appreciation: notesPersonnelles.appreciation || null,
                  statut: 'en_attente',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (insertNoteError) throw insertNoteError;
            }
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Error transferring notes:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du transfert');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    transfererNotes,
    loading,
    error
  };
}