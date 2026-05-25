import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Cours {
  id: string;
  matiere_nom: string;
  enseignant_nom: string;
  enseignant_prenom: string;
  heure_debut: string;
  heure_fin: string;
  duree_prevue_heures: number;
  salle?: string;
}

export interface EmploiDuTemps {
  lundi: Cours[];
  mardi: Cours[];
  mercredi: Cours[];
  jeudi: Cours[];
  vendredi: Cours[];
  samedi: Cours[];
}

export function useEmploiDuTempsParent(enfantId: string) {
  const { user } = useAuth();
  const [emploi, setEmploi] = useState<EmploiDuTemps>({
    lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chargerEmploi = useCallback(async () => {
    if (!user || !enfantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer la classe de l'enfant
      const { data: eleve, error: eleveError } = await supabase
        .from('eleves')
        .select('classe_id')
        .eq('id', enfantId)
        .maybeSingle();

      if (eleveError || !eleve?.classe_id) {
        setError('Classe non trouvée');
        setLoading(false);
        return;
      }

      // 2. Récupérer l'emploi du temps de la classe
      const { data: cours, error: coursError } = await supabase
        .from('emplois_du_temps')
        .select(`
          id,
          jour_semaine,
          heure_debut,
          heure_fin,
          duree_prevue_heures,
          matiere:matiere_id (nom),
          enseignant:enseignant_id (nom, prenom)
        `)
        .eq('classe_id', eleve.classe_id)
        .eq('is_active', true)
        .order('heure_debut', { ascending: true });

      if (coursError) throw coursError;

      // 3. Organiser par jour
      const joursMap: EmploiDuTemps = {
        lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: []
      };
      const joursKeys: Record<number, keyof EmploiDuTemps> = {
        1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi'
      };

      for (const coursItem of cours || []) {
        const jourKey = joursKeys[coursItem.jour_semaine];
        if (jourKey) {
          joursMap[jourKey].push({
            id: coursItem.id,
            matiere_nom: coursItem.matiere?.nom || 'Sans matière',
            enseignant_nom: coursItem.enseignant?.nom || '',
            enseignant_prenom: coursItem.enseignant?.prenom || '',
            heure_debut: coursItem.heure_debut.slice(0, 5),
            heure_fin: coursItem.heure_fin.slice(0, 5),
            duree_prevue_heures: coursItem.duree_prevue_heures,
          });
        }
      }

      setEmploi(joursMap);
    } catch (err) {
      console.error('Erreur chargement emploi du temps:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user, enfantId]);

  useEffect(() => {
    chargerEmploi();
  }, [chargerEmploi]);

  return {
    emploi,
    loading,
    error,
    refetch: chargerEmploi,
  };
}