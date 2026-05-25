// /home/project/hooks/useExportPreferences.ts
// Hook pour la gestion des préférences d'export utilisateur
// Stockage : Table user_preferences → preferences.export_options

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ExportOptions, DEFAULT_EXPORT_OPTIONS } from '@/types/export.types';

interface UseExportPreferencesReturn {
  preferences: Partial<ExportOptions> | null;
  loading: boolean;
  error: string | null;
  savePreferences: (options: Partial<ExportOptions>) => Promise<boolean>;
  resetPreferences: () => Promise<boolean>;
  refresh: () => Promise<void>;
  hasSavedPreferences: boolean;
}

const STORAGE_KEY = 'export_options';

export function useExportPreferences(etablissementId: string): UseExportPreferencesReturn {
  const [preferences, setPreferences] = useState<Partial<ExportOptions> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedPreferences, setHasSavedPreferences] = useState(false);

  /**
   * Charge les préférences depuis Supabase (user_preferences)
   */
  const loadPreferences = useCallback(async () => {
    if (!etablissementId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Récupérer l'utilisateur courant
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!userData.user) {
        setLoading(false);
        return;
      }

      // Récupérer les préférences utilisateur
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      // Extraire les préférences d'export
      const savedPrefs = prefs?.preferences?.[STORAGE_KEY] || null;
      
      if (savedPrefs) {
        setHasSavedPreferences(true);
        // Fusionner avec les valeurs par défaut (pour les nouvelles options)
        const mergedPrefs = {
          ...DEFAULT_EXPORT_OPTIONS,
          ...savedPrefs,
        };
        setPreferences(mergedPrefs);
      } else {
        setHasSavedPreferences(false);
        setPreferences(DEFAULT_EXPORT_OPTIONS);
      }
    } catch (err) {
      console.error('Error loading export preferences:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des préférences');
      setPreferences(DEFAULT_EXPORT_OPTIONS);
    } finally {
      setLoading(false);
    }
  }, [etablissementId]);

  /**
   * Sauvegarde les préférences dans Supabase
   */
  const savePreferences = useCallback(async (options: Partial<ExportOptions>): Promise<boolean> => {
    if (!etablissementId) return false;

    setLoading(true);
    setError(null);

    try {
      // Récupérer l'utilisateur courant
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!userData.user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer les préférences existantes
      const { data: existingPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('id, preferences')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      // Fusionner les nouvelles préférences avec les existantes
      const currentPreferences = existingPrefs?.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        [STORAGE_KEY]: {
          ...(currentPreferences[STORAGE_KEY] || {}),
          ...options,
        },
      };

      // Sauvegarder en base
      if (existingPrefs) {
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({ preferences: updatedPreferences })
          .eq('id', existingPrefs.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userData.user.id,
            preferences: updatedPreferences,
          });
        if (insertError) throw insertError;
      }

      // Mettre à jour l'état local
      setPreferences(prev => ({
        ...DEFAULT_EXPORT_OPTIONS,
        ...prev,
        ...options,
      }));
      setHasSavedPreferences(true);

      return true;
    } catch (err) {
      console.error('Error saving export preferences:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des préférences');
      return false;
    } finally {
      setLoading(false);
    }
  }, [etablissementId]);

  /**
   * Réinitialise les préférences aux valeurs par défaut
   */
  const resetPreferences = useCallback(async (): Promise<boolean> => {
    const success = await savePreferences(DEFAULT_EXPORT_OPTIONS);
    if (success) {
      setHasSavedPreferences(false);
    }
    return success;
  }, [savePreferences]);

  /**
   * Rafraîchit les préférences
   */
  const refresh = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    savePreferences,
    resetPreferences,
    refresh,
    hasSavedPreferences,
  };
}