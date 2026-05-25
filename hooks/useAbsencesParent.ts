import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Absence {
  id: string;
  eleve_id: string;
  date_absence: string;
  heure_debut?: string;
  heure_fin?: string;
  motif?: string;
  justifie: boolean;
  justificatif_url?: string;
  declare_par?: string;
  declare_le?: string;
  created_at: string;
}

export function useAbsencesParent(enfantId: string) {
  const { user } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dernieresAbsencesRef = useRef<Set<string>>(new Set());

  const notifierAbsence = useCallback(async (eleveId: string, date: string, motif?: string, absenceId?: string) => {
    try {
      // Vérifier si l'absence a déjà été notifiée
      if (absenceId && dernieresAbsencesRef.current.has(absenceId)) {
        console.log(`Absence ${absenceId} déjà notifiée, ignorée`);
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

      // Formater la date pour l'affichage
      const dateFormatee = new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      for (const parent of parents) {
        await supabase.functions.invoke('notifications-parent', {
          body: {
            parent_id: parent.parent_id,
            type: 'ABSENCE_SIGNALEE',
            data: {
              enfantNom,
              date: dateFormatee,
              motif: motif || 'Non précisé',
            },
            canal: 'IN_APP', // Seulement IN_APP pour éviter le spam
          },
        });
        console.log(`✅ Notification d'absence envoyée au parent ${parent.parent_id}`);
      }

      // Marquer l'absence comme notifiée
      if (absenceId) {
        dernieresAbsencesRef.current.add(absenceId);
      }
    } catch (err) {
      console.error('Erreur notification absence:', err);
    }
  }, []);

  const chargerAbsences = useCallback(async () => {
    if (!user || !enfantId) {
      setAbsences([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier que l'enfant appartient bien au parent
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentError || !parentData) {
        setAbsences([]);
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
        setAbsences([]);
        setLoading(false);
        return;
      }

      // Récupérer les absences
      const { data, error: absencesError } = await supabase
        .from('absences')
        .select('*')
        .eq('eleve_id', enfantId)
        .order('date_absence', { ascending: false });

      if (absencesError) throw absencesError;

      // Détecter les nouvelles absences et envoyer des notifications
      if (data && data.length > 0) {
        for (const absence of data) {
          const absenceId = absence.id;
          // Vérifier si c'est une nouvelle absence (pas encore dans le ref)
          if (!dernieresAbsencesRef.current.has(absenceId)) {
            await notifierAbsence(enfantId, absence.date_absence, absence.motif, absenceId);
          }
        }
      }

      setAbsences(data || []);
    } catch (err) {
      console.error('Erreur chargement absences:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setAbsences([]);
    } finally {
      setLoading(false);
    }
  }, [user, enfantId, notifierAbsence]);

  useEffect(() => {
    chargerAbsences();
  }, [chargerAbsences]);

  return {
    absences,
    loading,
    error,
    refetch: chargerAbsences,
    notifierAbsence, // Exporter la fonction pour une utilisation manuelle si besoin
  };
}