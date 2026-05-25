import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type ViewMode = 'cards' | 'grid' | 'table';

export function useEtablissementsViewMode() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [loading, setLoading] = useState(true);

  // Charger la préférence depuis user_preferences
  useEffect(() => {
    const loadPreference = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        const savedMode = data?.preferences?.etablissements_view_mode;
        if (savedMode && ['cards', 'grid', 'table'].includes(savedMode)) {
          setViewMode(savedMode as ViewMode);
        }
      } catch (error) {
        console.error('Error loading view mode preference:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreference();
  }, [user]);

  // Sauvegarder la préférence
  const saveViewMode = async (mode: ViewMode) => {
    if (!user) return;

    setViewMode(mode);

    try {
      const { data: existingPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('id, preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      const newPreferences = {
        ...(existingPrefs?.preferences || {}),
        etablissements_view_mode: mode,
      };

      if (existingPrefs) {
        await supabase
          .from('user_preferences')
          .update({ preferences: newPreferences })
          .eq('id', existingPrefs.id);
      } else {
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            preferences: newPreferences,
          });
      }
    } catch (error) {
      console.error('Error saving view mode preference:', error);
    }
  };

  return { viewMode, setViewMode: saveViewMode, loading };
}