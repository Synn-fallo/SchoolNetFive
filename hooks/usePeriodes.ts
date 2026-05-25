// /home/project/hooks/usePeriodes.ts
// Hook pour la gestion des périodes

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Periode {
  id: string;
  libelle: string;
  type: 'semestre' | 'trimestre';
  categorie: 'normale' | 'examen_blanc' | 'bac_blanc';
  ordre: number;
  date_debut: string;
  date_fin: string;
  is_archived: boolean;
  etablissement_id: string;
  annee_scolaire_id: string;
}

export interface PeriodeParDefaut {
  periode_id: string;
  periode_libelle: string;
}

interface UsePeriodesReturn {
  periodes: Periode[];
  periodeParDefaut: PeriodeParDefaut | null;
  loading: boolean;
  error: string | null;
  loadPeriodes: (etablissementId: string, anneeScolaireId: string) => Promise<void>;
  setPeriodeParDefaut: (periodeId: string) => Promise<boolean>;
  getPeriodeParDefaut: (etablissementId: string) => Promise<PeriodeParDefaut | null>;
}

export function usePeriodes(): UsePeriodesReturn {
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [periodeParDefaut, setPeriodeParDefautState] = useState<PeriodeParDefaut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeriodes = useCallback(async (etablissementId: string, anneeScolaireId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('periodes')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .eq('annee_scolaire_id', anneeScolaireId)
        .eq('categorie', 'normale')
        .order('ordre', { ascending: true });

      if (fetchError) throw fetchError;

      setPeriodes(data || []);
    } catch (err) {
      console.error('Error loading periodes:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const getPeriodeParDefaut = useCallback(async (etablissementId: string): Promise<PeriodeParDefaut | null> => {
    try {
      // Récupérer la période par défaut depuis la configuration de l'établissement
      // ou depuis les préférences utilisateur
      const { data, error } = await supabase
        .from('parametres_etablissement')
        .select('valeur')
        .eq('etablissement_id', etablissementId)
        .eq('clef', 'periode_par_defaut')
        .maybeSingle();

      if (error) throw error;

      if (data?.valeur) {
        const periodeId = data.valeur;
        const { data: periode } = await supabase
          .from('periodes')
          .select('id, libelle')
          .eq('id', periodeId)
          .single();
        
        if (periode) {
          return { periode_id: periode.id, periode_libelle: periode.libelle };
        }
      }
      return null;
    } catch (err) {
      console.error('Error getting periode par defaut:', err);
      return null;
    }
  }, []);

  const setPeriodeParDefaut = useCallback(async (periodeId: string): Promise<boolean> => {
    try {
      // Récupérer l'établissement associé à cette période
      const { data: periode } = await supabase
        .from('periodes')
        .select('etablissement_id')
        .eq('id', periodeId)
        .single();

      if (!periode) return false;

      const { error } = await supabase
        .from('parametres_etablissement')
        .upsert({
          etablissement_id: periode.etablissement_id,
          clef: 'periode_par_defaut',
          valeur: periodeId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'etablissement_id, clef' });

      if (error) throw error;

      const { data: periodeData } = await supabase
        .from('periodes')
        .select('libelle')
        .eq('id', periodeId)
        .single();

      setPeriodeParDefautState({
        periode_id: periodeId,
        periode_libelle: periodeData?.libelle || '',
      });
      
      return true;
    } catch (err) {
      console.error('Error setting periode par defaut:', err);
      return false;
    }
  }, []);

  return {
    periodes,
    periodeParDefaut,
    loading,
    error,
    loadPeriodes,
    setPeriodeParDefaut,
    getPeriodeParDefaut,
  };
}