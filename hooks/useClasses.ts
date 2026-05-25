// /home/project/hooks/useClasses.ts
// Hook pour récupérer la liste des classes d’un établissement

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Classe {
  id: string;
  nom: string;
  niveau?: string;
  effectif?: number;
}

interface UseClassesReturn {
  classes: Classe[];
  loading: boolean;
  error: string | null;
  loadClasses: (etablissementId: string, anneeScolaireId?: string) => Promise<void>;
  getClasseById: (id: string) => Classe | undefined;
}

export function useClasses(): UseClassesReturn {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = useCallback(async (etablissementId: string, anneeScolaireId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true);

      if (anneeScolaireId) {
        query = query.eq('annee_scolaire_id', anneeScolaireId);
      }

      const { data, error: fetchError } = await query.order('nom', { ascending: true });

      if (fetchError) throw fetchError;

      setClasses(data || []);
    } catch (err) {
      console.error('Error loading classes:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des classes');
    } finally {
      setLoading(false);
    }
  }, []);

  const getClasseById = useCallback((id: string) => {
    return classes.find(c => c.id === id);
  }, [classes]);

  return {
    classes,
    loading,
    error,
    loadClasses,
    getClasseById,
  };
}