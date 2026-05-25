// /home/project/hooks/useEligibilite.ts
// Hook pour la gestion de l'éligibilité des élèves

import { useState, useEffect, useCallback } from 'react';
import { isEleveEligibleBulletin, isEleveEligibleBatch, checkAndGetAlertMessage } from '@/services/eligibiliteService';
import { StatutEligibilite, StatutEligibiliteBatch } from '@/types/eligibilite.types';

interface UseEligibiliteEleveReturn {
  eligible: boolean;
  motifs: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook pour vérifier l'éligibilité d'un élève
 */
export function useEligibiliteEleve(
  eleveId: string | null,
  anneeScolaireId: string | null
): UseEligibiliteEleveReturn {
  const [eligible, setEligible] = useState<boolean>(true);
  const [motifs, setMotifs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkEligibility = useCallback(async () => {
    if (!eleveId || !anneeScolaireId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await isEleveEligibleBulletin(eleveId, anneeScolaireId);
      setEligible(result.eligible);
      setMotifs(result.motifs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification');
      setEligible(true); // Par défaut, considérer comme éligible
      setMotifs([]);
    } finally {
      setLoading(false);
    }
  }, [eleveId, anneeScolaireId]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  return {
    eligible,
    motifs,
    loading,
    error,
    refresh: checkEligibility,
  };
}

interface UseEligibiliteBatchReturn {
  statuts: StatutEligibiliteBatch;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getStatut: (eleveId: string) => StatutEligibilite;
  getEligibleCount: () => number;
  getNonEligibleCount: () => number;
  getNonEligibleIds: () => string[];
}

/**
 * Hook pour vérifier l'éligibilité de plusieurs élèves
 */
export function useEligibiliteBatch(
  eleveIds: string[],
  anneeScolaireId: string | null
): UseEligibiliteBatchReturn {
  const [statuts, setStatuts] = useState<StatutEligibiliteBatch>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkBatchEligibility = useCallback(async () => {
    if (!anneeScolaireId || eleveIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await isEleveEligibleBatch(eleveIds, anneeScolaireId);
      setStatuts(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification');
      // En cas d'erreur, considérer tous comme éligibles
      const defaultStatuts: StatutEligibiliteBatch = {};
      for (const id of eleveIds) {
        defaultStatuts[id] = { eligible: true, motifs: [] };
      }
      setStatuts(defaultStatuts);
    } finally {
      setLoading(false);
    }
  }, [eleveIds, anneeScolaireId]);

  useEffect(() => {
    checkBatchEligibility();
  }, [checkBatchEligibility]);

  const getStatut = (eleveId: string): StatutEligibilite => {
    return statuts[eleveId] || { eligible: true, motifs: [] };
  };

  const getEligibleCount = (): number => {
    return Object.values(statuts).filter(s => s.eligible).length;
  };

  const getNonEligibleCount = (): number => {
    return Object.values(statuts).filter(s => !s.eligible).length;
  };

  const getNonEligibleIds = (): string[] => {
    return Object.entries(statuts)
      .filter(([_, statut]) => !statut.eligible)
      .map(([id, _]) => id);
  };

  return {
    statuts,
    loading,
    error,
    refresh: checkBatchEligibility,
    getStatut,
    getEligibleCount,
    getNonEligibleCount,
    getNonEligibleIds,
  };
}

interface UseCheckAndAlertReturn {
  check: (eleveId: string, nomEleve: string) => Promise<boolean>;
  loading: boolean;
}

/**
 * Hook pour vérifier l'éligibilité et afficher une alerte si nécessaire
 */
export function useCheckAndAlert(anneeScolaireId: string): UseCheckAndAlertReturn {
  const [loading, setLoading] = useState<boolean>(false);

  const check = useCallback(async (eleveId: string, nomEleve: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { eligible, message } = await checkAndGetAlertMessage(eleveId, anneeScolaireId, nomEleve);
      if (!eligible && message) {
        // L'alerte sera gérée par le composant appelant
        return false;
      }
      return eligible;
    } finally {
      setLoading(false);
    }
  }, [anneeScolaireId]);

  return {
    check,
    loading,
  };
}