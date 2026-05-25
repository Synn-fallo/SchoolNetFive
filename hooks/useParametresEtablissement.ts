// /home/project/hooks/useParametresEtablissement.ts
// Hook pour la gestion des paramètres de l'établissement

import { useState, useEffect, useCallback } from 'react';
import { 
  getParametreBlocageBulletins, 
  getParametreBlocageCertificats,
  updateParametreBlocageBulletins,
  updateConditionsEligibilite,
  setBlocageBulletinsActif
} from '@/services/parametresService';
import { ParametreBlocageBulletins, ParametreBlocageCertificats, ConditionsEligibilite } from '@/types/eligibilite.types';

interface UseParametreBlocageBulletinsReturn {
  parametres: ParametreBlocageBulletins | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateActif: (actif: boolean) => Promise<boolean>;
  updateConditions: (conditions: Partial<ConditionsEligibilite>) => Promise<boolean>;
  updateFull: (params: ParametreBlocageBulletins) => Promise<boolean>;
}

/**
 * Hook pour gérer les paramètres de blocage des bulletins
 */
export function useParametreBlocageBulletins(
  etablissementId: string | null
): UseParametreBlocageBulletinsReturn {
  const [parametres, setParametres] = useState<ParametreBlocageBulletins | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadParametres = useCallback(async () => {
    if (!etablissementId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getParametreBlocageBulletins(etablissementId);
      setParametres(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [etablissementId]);

  useEffect(() => {
    loadParametres();
  }, [loadParametres]);

  const updateActif = useCallback(async (actif: boolean): Promise<boolean> => {
    if (!etablissementId) return false;

    try {
      const success = await setBlocageBulletinsActif(etablissementId, actif);
      if (success) {
        await loadParametres();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return false;
    }
  }, [etablissementId, loadParametres]);

  const updateConditions = useCallback(async (conditions: Partial<ConditionsEligibilite>): Promise<boolean> => {
    if (!etablissementId) return false;

    try {
      const success = await updateConditionsEligibilite(etablissementId, conditions);
      if (success) {
        await loadParametres();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return false;
    }
  }, [etablissementId, loadParametres]);

  const updateFull = useCallback(async (params: ParametreBlocageBulletins): Promise<boolean> => {
    if (!etablissementId) return false;

    try {
      const success = await updateParametreBlocageBulletins(etablissementId, params);
      if (success) {
        await loadParametres();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return false;
    }
  }, [etablissementId, loadParametres]);

  return {
    parametres,
    loading,
    error,
    refresh: loadParametres,
    updateActif,
    updateConditions,
    updateFull,
  };
}

interface UseParametreBlocageCertificatsReturn {
  parametres: ParametreBlocageCertificats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook pour gérer les paramètres de blocage des certificats de scolarité
 */
export function useParametreBlocageCertificats(
  etablissementId: string | null
): UseParametreBlocageCertificatsReturn {
  const [parametres, setParametres] = useState<ParametreBlocageCertificats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadParametres = useCallback(async () => {
    if (!etablissementId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getParametreBlocageCertificats(etablissementId);
      setParametres(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [etablissementId]);

  useEffect(() => {
    loadParametres();
  }, [loadParametres]);

  return {
    parametres,
    loading,
    error,
    refresh: loadParametres,
  };
}