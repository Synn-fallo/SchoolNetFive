// /home/project/hooks/usePeriodValidation.ts
// Version finale – Ouvre et ferme les périodes directement via Supabase

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSubscriptionCheck } from './useSubscriptionCheck';
import { PeriodStatus } from '@/types/notes.types';

interface UsePeriodValidationReturn {
  periodStatus: PeriodStatus;
  loading: boolean;
  error: string | null;
  closePeriod: (periodeId: string, periodeLibelle: string) => Promise<boolean>;
  openPeriod: (periodeId: string, periodeLibelle: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  isSubscribed: boolean | null;
  subscriptionLoading: boolean;
}

export function usePeriodValidation(
  etablissementId: string,
  anneeScolaireId: string
): UsePeriodValidationReturn {
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isSubscribed, loading: subscriptionLoading } = useSubscriptionCheck(etablissementId);

  // Charger le statut des périodes
  const loadPeriodStatus = useCallback(async () => {
    if (!etablissementId || !anneeScolaireId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: periodes, error: periodesError } = await supabase
        .from('periodes')
        .select('id, libelle, ordre')
        .eq('etablissement_id', etablissementId)
        .eq('annee_scolaire_id', anneeScolaireId)
        .eq('categorie', 'normale')
        .order('ordre', { ascending: true });

      if (periodesError) throw periodesError;

      if (!periodes || periodes.length === 0) {
        setPeriodStatus({});
        setLoading(false);
        return;
      }

      const periodeIds = periodes.map(p => p.id);
      const { data: validations, error: validationsError } = await supabase
        .from('periodes_validation')
        .select('periode_id, is_open, is_validated')
        .in('periode_id', periodeIds);

      if (validationsError) throw validationsError;

      const status: PeriodStatus = {};
      for (const periode of periodes) {
        const validation = validations?.find(v => v.periode_id === periode.id);
        status[periode.libelle] = {
          isOpen: validation?.is_open ?? true,
          isValidated: validation?.is_validated ?? false,
        };
      }

      setPeriodStatus(status);
    } catch (err) {
      console.error('Error loading period status:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [etablissementId, anneeScolaireId]);

  // Ouvrir une période
  const openPeriod = useCallback(async (periodeId: string, periodeLibelle: string): Promise<boolean> => {
    if (!isSubscribed) return false;

    try {
      // Vérifier si l'enregistrement existe
      const { data: existing } = await supabase
        .from('periodes_validation')
        .select('id')
        .eq('periode_id', periodeId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('periodes_validation')
          .update({ is_open: true, updated_at: new Date().toISOString() })
          .eq('periode_id', periodeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('periodes_validation')
          .insert({ periode_id: periodeId, is_open: true });
        if (error) throw error;
      }

      setPeriodStatus(prev => ({
        ...prev,
        [periodeLibelle]: { ...prev[periodeLibelle], isOpen: true },
      }));

      return true;
    } catch (err) {
      console.error('Error opening period:', err);
      return false;
    }
  }, [isSubscribed]);

  // Fermer une période
  const closePeriod = useCallback(async (periodeId: string, periodeLibelle: string): Promise<boolean> => {
    if (!isSubscribed) return false;

    try {
      const { data: existing } = await supabase
        .from('periodes_validation')
        .select('id')
        .eq('periode_id', periodeId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('periodes_validation')
          .update({ is_open: false, updated_at: new Date().toISOString() })
          .eq('periode_id', periodeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('periodes_validation')
          .insert({ periode_id: periodeId, is_open: false });
        if (error) throw error;
      }

      setPeriodStatus(prev => ({
        ...prev,
        [periodeLibelle]: { ...prev[periodeLibelle], isOpen: false },
      }));

      return true;
    } catch (err) {
      console.error('Error closing period:', err);
      return false;
    }
  }, [isSubscribed]);

  const refresh = useCallback(async () => {
    await loadPeriodStatus();
  }, [loadPeriodStatus]);

  useEffect(() => {
    loadPeriodStatus();
  }, [loadPeriodStatus]);

  return {
    periodStatus,
    loading: loading || subscriptionLoading,
    error,
    closePeriod,
    openPeriod,
    refresh,
    isSubscribed,
    subscriptionLoading,
  };
}