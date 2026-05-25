import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface NoteDetail {
  id: string;
  valeur: number;
  type: string;
  date: string;
  appreciation?: string;
  coefficient?: number;
}

export interface MatiereNotes {
  id: string;
  nom: string;
  moyenne: number;
  noteSur: number;
  appreciation?: string;
  notes: NoteDetail[];
}

export function useNotesParent(enfantId: string) {
  const { user } = useAuth();
  const [matieres, setMatieres] = useState<MatiereNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dernieresNotesRef = useRef<Map<string, number>>(new Map());

  const notifierNouvelleNote = useCallback(async (eleveId: string, matiere: string, note: number, noteSur: number, noteId: string) => {
    try {
      // Vérifier si la note a déjà été notifiée
      const dernieresNotes = dernieresNotesRef.current;
      if (dernieresNotes.has(noteId)) {
        console.log(`Note ${noteId} déjà notifiée, ignorée`);
        return;
      }

      // Récupérer les parents de l'élève
      const { data: parents } = await supabase
        .from('parent_eleve')
        .select('parent_id')
        .eq('eleve_id', eleveId);

      if (!parents || parents.length === 0) return;

      // Récupérer les infos de l'élève
      const { data: eleve } = await supabase
        .from('eleves')
        .select('user_id')
        .eq('id', eleveId)
        .single();

      let enfantNom = '';
      if (eleve?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nom, prenom')
          .eq('id', eleve.user_id)
          .single();
        if (profile) enfantNom = `${profile.prenom} ${profile.nom}`;
      }

      for (const parent of parents) {
        await supabase.functions.invoke('notifications-parent', {
          body: {
            parent_id: parent.parent_id,
            type: 'NOUVELLE_NOTE',
            data: {
              enfantNom,
              matiere,
              note,
              noteSur,
            },
            canal: 'IN_APP', // Seulement IN_APP pour éviter le spam
          },
        });
        console.log(`✅ Notification de note envoyée au parent ${parent.parent_id}`);
      }

      // Marquer la note comme notifiée
      dernieresNotesRef.current.set(noteId, Date.now());
    } catch (err) {
      console.error('Erreur notification note:', err);
    }
  }, []);

  const chargerNotes = useCallback(async () => {
    if (!user || !enfantId) {
      setMatieres([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Vérifier que l'enfant appartient bien au parent
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentError || !parentData) {
        setError('Parent non trouvé');
        setMatieres([]);
        setLoading(false);
        return;
      }

      const { data: lien, error: lienError } = await supabase
        .from('parent_eleve')
        .select('id')
        .eq('parent_id', parentData.id)
        .eq('eleve_id', enfantId)
        .maybeSingle();

      if (lienError || !lien) {
        setError('Accès non autorisé à cet enfant');
        setMatieres([]);
        setLoading(false);
        return;
      }

      // 2. Récupérer les notes de l'élève avec les matières
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select(`
          id,
          note,
          appreciation,
          created_at,
          devoir:devoir_id (
            id,
            type,
            titre,
            date_devoir,
            coefficient,
            matiere_id,
            matiere:matieres (
              id,
              nom,
              coefficient
            )
          )
        `)
        .eq('eleve_id', enfantId)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('Erreur récupération notes:', notesError);
        throw notesError;
      }

      // Détecter les nouvelles notes et envoyer des notifications
      if (notesData && notesData.length > 0) {
        for (const noteData of notesData as any[]) {
          const devoir = noteData.devoir;
          if (!devoir || !devoir.matiere) continue;
          
          const noteId = noteData.id;
          const noteValeur = noteData.note;
          const noteSur = 20;
          const matiereNom = devoir.matiere.nom;
          
          // Vérifier si c'est une nouvelle note (pas encore dans le ref)
          if (!dernieresNotesRef.current.has(noteId)) {
            await notifierNouvelleNote(enfantId, matiereNom, noteValeur, noteSur, noteId);
          }
        }
      }

      if (!notesData || notesData.length === 0) {
        setMatieres([]);
        setLoading(false);
        return;
      }

      // 3. Regrouper les notes par matière
      const matieresMap: Map<string, MatiereNotes> = new Map();

      for (const noteData of notesData as any[]) {
        const devoir = noteData.devoir;
        if (!devoir || !devoir.matiere) continue;

        const matiereId = devoir.matiere_id;
        const matiereNom = devoir.matiere.nom;
        const noteValeur = noteData.note;
        const noteSur = 20;

        if (!matieresMap.has(matiereId)) {
          matieresMap.set(matiereId, {
            id: matiereId,
            nom: matiereNom,
            moyenne: 0,
            noteSur: 20,
            appreciation: undefined,
            notes: [],
          });
        }

        const matiere = matieresMap.get(matiereId)!;
        
        // Ajouter la note détaillée
        matiere.notes.push({
          id: noteData.id,
          valeur: noteValeur,
          type: devoir.type || 'devoir',
          date: devoir.date_devoir || noteData.created_at,
          appreciation: noteData.appreciation,
          coefficient: devoir.coefficient,
        });
      }

      // 4. Calculer la moyenne par matière
      for (const matiere of matieresMap.values()) {
        if (matiere.notes.length > 0) {
          let sommeNotes = 0;
          let sommeCoeffs = 0;
          
          for (const note of matiere.notes) {
            const coeff = note.coefficient || 1;
            sommeNotes += note.valeur * coeff;
            sommeCoeffs += coeff;
          }
          
          matiere.moyenne = sommeCoeffs > 0 ? sommeNotes / sommeCoeffs : 0;
          matiere.appreciation = matiere.moyenne >= 16 ? 'Excellent' :
                                  matiere.moyenne >= 13 ? 'Bien' :
                                  matiere.moyenne >= 10 ? 'Passable' : 'À renforcer';
        }
        
        // Trier les notes par date (plus récentes en premier)
        matiere.notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      // 5. Convertir en tableau et trier par nom
      const matieresArray = Array.from(matieresMap.values());
      matieresArray.sort((a, b) => a.nom.localeCompare(b.nom));

      // 6. Séparer matières prioritaires (moyenne < 10)
      const matieresPrioritaires = matieresArray.filter(m => m.moyenne < 10);
      const autresMatieres = matieresArray.filter(m => m.moyenne >= 10);
      const matieresTriees = [...matieresPrioritaires, ...autresMatieres];

      setMatieres(matieresTriees);
    } catch (err) {
      console.error('Erreur chargement notes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setMatieres([]);
    } finally {
      setLoading(false);
    }
  }, [user, enfantId, notifierNouvelleNote]);

  useEffect(() => {
    chargerNotes();
  }, [chargerNotes]);

  return {
    matieres,
    loading,
    error,
    refetch: chargerNotes,
  };
}