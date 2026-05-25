// /home/project/hooks/useCoefficientsPeriode.ts
// Gestion des coefficients – Version avec export/import entre classes

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CoefficientRecord {
  id: string;
  classe_id: string;
  matiere_id: string;
  type_evaluation: 'regulier' | 'examen';
  valeur: number;
  created_at: string;
}

interface UseCoefficientsPeriodeReturn {
  coefficients: CoefficientRecord[];
  loading: boolean;
  loadCoefficients: (etablissementId: string) => Promise<void>;
  getCurrentCoefficient: (classeId: string, matiereId: string, type: 'regulier' | 'examen') => number | null;
  addCoefficient: (classeId: string, matiereId: string, type: 'regulier' | 'examen', valeur: number) => Promise<boolean>;
  deleteCoefficient: (id: string) => Promise<boolean>;
  refresh: (etablissementId: string) => Promise<void>;
  // NOUVELLES FONCTIONS
  exportCoefficientsToClasses: (sourceClasseId: string, targetClasseIds: string[]) => Promise<{ success: boolean; message: string; count: number }>;
  importCoefficientsFromClass: (targetClasseId: string, sourceClasseId: string) => Promise<{ success: boolean; message: string; count: number }>;
}

export function useCoefficientsPeriode(): UseCoefficientsPeriodeReturn {
  const [coefficients, setCoefficients] = useState<CoefficientRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCoefficients = useCallback(async (etablissementId: string) => {
    setLoading(true);
    try {
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('etablissement_id', etablissementId);

      if (!classes || classes.length === 0) {
        setCoefficients([]);
        setLoading(false);
        return;
      }

      const classIds = classes.map(c => c.id);

      const { data, error } = await supabase
        .from('coefficients_periode')
        .select('*')
        .in('classe_id', classIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCoefficients(data || []);
    } catch (err) {
      console.error('Error loading coefficients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (etablissementId: string) => {
    await loadCoefficients(etablissementId);
  }, [loadCoefficients]);

  const getCurrentCoefficient = useCallback(
    (classeId: string, matiereId: string, type: 'regulier' | 'examen'): number | null => {
      const latest = coefficients
        .filter(c => c.classe_id === classeId && c.matiere_id === matiereId && c.type_evaluation === type)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      return latest?.valeur ?? null;
    },
    [coefficients]
  );

  const addCoefficient = useCallback(async (
    classeId: string,
    matiereId: string,
    type: 'regulier' | 'examen',
    valeur: number
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coefficients_periode')
        .insert({
          classe_id: classeId,
          matiere_id: matiereId,
          type_evaluation: type,
          valeur: valeur,
          periode_id: null,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error adding coefficient:', err);
      return false;
    }
  }, []);

  const deleteCoefficient = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coefficients_periode')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting coefficient:', err);
      return false;
    }
  }, []);

  // ============================================================
  // EXPORTER : copier les coefficients d'une classe source vers plusieurs classes cibles
  // ============================================================
  const exportCoefficientsToClasses = useCallback(async (
    sourceClasseId: string,
    targetClasseIds: string[]
  ): Promise<{ success: boolean; message: string; count: number }> => {
    if (!sourceClasseId || targetClasseIds.length === 0) {
      return { success: false, message: 'Aucune classe cible sélectionnée', count: 0 };
    }

    try {
      // 1. Récupérer tous les coefficients de la classe source
      const sourceCoefficients = coefficients.filter(c => c.classe_id === sourceClasseId);
      
      if (sourceCoefficients.length === 0) {
        return { success: false, message: 'Aucun coefficient trouvé dans la classe source', count: 0 };
      }

      // 2. Pour chaque classe cible, copier les coefficients
      let totalCopied = 0;

      for (const targetClasseId of targetClasseIds) {
        for (const coeff of sourceCoefficients) {
          // Insérer un nouveau coefficient pour la classe cible
          const { error } = await supabase
            .from('coefficients_periode')
            .insert({
              classe_id: targetClasseId,
              matiere_id: coeff.matiere_id,
              type_evaluation: coeff.type_evaluation,
              valeur: coeff.valeur,
              periode_id: null,
            });

          if (!error) {
            totalCopied++;
          }
        }
      }

      // 3. Rafraîchir les données
      const { data: classeData } = await supabase
        .from('classes')
        .select('etablissement_id')
        .eq('id', sourceClasseId)
        .single();

      if (classeData) {
        await refresh(classeData.etablissement_id);
      }

      return {
        success: true,
        message: `${totalCopied} coefficient(s) copié(s) vers ${targetClasseIds.length} classe(s)`,
        count: totalCopied,
      };
    } catch (err) {
      console.error('Error exporting coefficients:', err);
      return { success: false, message: 'Erreur lors de l\'export', count: 0 };
    }
  }, [coefficients, refresh]);

  // ============================================================
  // IMPORTER : copier les coefficients d'une classe source vers la classe cible
  // ============================================================
  const importCoefficientsFromClass = useCallback(async (
    targetClasseId: string,
    sourceClasseId: string
  ): Promise<{ success: boolean; message: string; count: number }> => {
    if (!targetClasseId || !sourceClasseId) {
      return { success: false, message: 'Classes source ou cible non spécifiées', count: 0 };
    }

    if (targetClasseId === sourceClasseId) {
      return { success: false, message: 'La classe source et la classe cible sont identiques', count: 0 };
    }

    try {
      // 1. Récupérer tous les coefficients de la classe source
      const sourceCoefficients = coefficients.filter(c => c.classe_id === sourceClasseId);
      
      if (sourceCoefficients.length === 0) {
        return { success: false, message: 'Aucun coefficient trouvé dans la classe source', count: 0 };
      }

      // 2. Supprimer d'abord les anciens coefficients de la classe cible (optionnel, pour éviter les doublons)
      // On ne supprime pas, on ajoute de nouveaux (le dernier en date sera actif)

      // 3. Copier les coefficients vers la classe cible
      let totalCopied = 0;

      for (const coeff of sourceCoefficients) {
        const { error } = await supabase
          .from('coefficients_periode')
          .insert({
            classe_id: targetClasseId,
            matiere_id: coeff.matiere_id,
            type_evaluation: coeff.type_evaluation,
            valeur: coeff.valeur,
            periode_id: null,
          });

        if (!error) {
          totalCopied++;
        }
      }

      // 4. Rafraîchir les données
      const { data: classeData } = await supabase
        .from('classes')
        .select('etablissement_id')
        .eq('id', targetClasseId)
        .single();

      if (classeData) {
        await refresh(classeData.etablissement_id);
      }

      return {
        success: true,
        message: `${totalCopied} coefficient(s) importé(s) depuis ${sourceCoefficients.length} matières`,
        count: totalCopied,
      };
    } catch (err) {
      console.error('Error importing coefficients:', err);
      return { success: false, message: 'Erreur lors de l\'import', count: 0 };
    }
  }, [coefficients, refresh]);

  return {
    coefficients,
    loading,
    loadCoefficients,
    getCurrentCoefficient,
    addCoefficient,
    deleteCoefficient,
    refresh,
    exportCoefficientsToClasses,
    importCoefficientsFromClass,
  };
}