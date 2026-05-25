// ============================================================
// PHASE 3 – WORKFLOW ENSEIGNANT
// Hook : useEnseignantClassesOfficielles
// Objectif : Récupérer les classes officielles auxquelles l'enseignant est affilié
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ClasseOfficielle {
  id: string;
  nom: string;
  niveau: string;
  etablissement_id: string;
  etablissement_nom: string;
  annee_scolaire_id: string;
  est_principal: boolean;
  role: string;
}

interface UseEnseignantClassesOfficiellesReturn {
  classes: ClasseOfficielle[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEnseignantClassesOfficielles(): UseEnseignantClassesOfficiellesReturn {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClasseOfficielle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!user) {
      setClasses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('enseignant_etablissements')
        .select(`
          est_principal,
          role,
          etablissement:etablissement_id (
            id,
            nom
          ),
          classes:classe_id (
            id,
            nom,
            niveau,
            annee_scolaire_id
          )
        `)
        .eq('enseignant_id', user.id)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const formattedClasses: ClasseOfficielle[] = (data || [])
        .filter(item => item.classes) // Filtrer les lignes sans classe
        .map(item => ({
          id: item.classes.id,
          nom: item.classes.nom,
          niveau: item.classes.niveau,
          etablissement_id: item.etablissement.id,
          etablissement_nom: item.etablissement.nom,
          annee_scolaire_id: item.classes.annee_scolaire_id,
          est_principal: item.est_principal || false,
          role: item.role || 'enseignant'
        }));

      setClasses(formattedClasses);
    } catch (err) {
      console.error('Error fetching official classes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return { classes, loading, error, refresh: fetchClasses };
}