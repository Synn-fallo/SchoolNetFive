// /home/project/hooks/useSeuilsAppreciation.ts
// Hook pour la gestion des seuils d'appréciation (Excellent, Bien, Assez bien, etc.)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SeuilAppreciation {
  id: string;
  etablissement_id: string;
  note_min: number;
  note_max: number;
  label: string;
  description?: string;
  ordre: number;
}

const DEFAULT_SEUILS: Omit<SeuilAppreciation, 'id' | 'etablissement_id'>[] = [
  { note_min: 16, note_max: 20, label: 'Excellent', description: 'Travail exceptionnel', ordre: 1 },
  { note_min: 14, note_max: 15.99, label: 'Bien', description: 'Très bon travail', ordre: 2 },
  { note_min: 12, note_max: 13.99, label: 'Assez bien', description: 'Bon travail', ordre: 3 },
  { note_min: 10, note_max: 11.99, label: 'Passable', description: 'Travail satisfaisant', ordre: 4 },
  { note_min: 0, note_max: 9.99, label: 'Insuffisant', description: 'Travail à améliorer', ordre: 5 },
];

interface UseSeuilsAppreciationReturn {
  seuils: SeuilAppreciation[];
  loading: boolean;
  error: string | null;
  loadSeuils: (etablissementId: string) => Promise<void>;
  updateSeuil: (id: string, updates: Partial<SeuilAppreciation>) => Promise<boolean>;
  resetToDefaults: (etablissementId: string) => Promise<boolean>;
  getAppreciationFromNote: (note: number) => string;
}

export function useSeuilsAppreciation(): UseSeuilsAppreciationReturn {
  const [seuils, setSeuils] = useState<SeuilAppreciation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSeuils = useCallback(async (etablissementId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('seuils_appreciation')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .order('ordre', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setSeuils(data);
      } else {
        // Créer les seuils par défaut si aucun n'existe
        const defaultSeuils = DEFAULT_SEUILS.map(s => ({
          ...s,
          etablissement_id: etablissementId,
        }));
        
        const { data: inserted, error: insertError } = await supabase
          .from('seuils_appreciation')
          .insert(defaultSeuils)
          .select();

        if (insertError) throw insertError;
        setSeuils(inserted || []);
      }
    } catch (err) {
      console.error('Error loading seuils:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSeuil = useCallback(async (id: string, updates: Partial<SeuilAppreciation>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('seuils_appreciation')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      setSeuils(prev =>
        prev.map(s => (s.id === id ? { ...s, ...updates } : s))
      );
      return true;
    } catch (err) {
      console.error('Error updating seuil:', err);
      return false;
    }
  }, []);

  const resetToDefaults = useCallback(async (etablissementId: string): Promise<boolean> => {
    try {
      const defaultSeuils = DEFAULT_SEUILS.map(s => ({
        ...s,
        etablissement_id: etablissementId,
      }));

      // Supprimer les anciens
      const { error: deleteError } = await supabase
        .from('seuils_appreciation')
        .delete()
        .eq('etablissement_id', etablissementId);

      if (deleteError) throw deleteError;

      // Insérer les nouveaux
      const { data: inserted, error: insertError } = await supabase
        .from('seuils_appreciation')
        .insert(defaultSeuils)
        .select();

      if (insertError) throw insertError;

      setSeuils(inserted || []);
      return true;
    } catch (err) {
      console.error('Error resetting seuils:', err);
      return false;
    }
  }, []);

  const getAppreciationFromNote = useCallback((note: number): string => {
    const seuil = seuils.find(s => note >= s.note_min && note <= s.note_max);
    return seuil?.label || 'Insuffisant';
  }, [seuils]);

  return {
    seuils,
    loading,
    error,
    loadSeuils,
    updateSeuil,
    resetToDefaults,
    getAppreciationFromNote,
  };
}