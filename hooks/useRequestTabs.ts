import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type RequestTabType = 'roles' | 'etablissements' | 'partenariats';

export function useRequestTabs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<RequestTabType>('roles');
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

        const savedTab = data?.preferences?.requests_active_tab;
        if (savedTab && ['roles', 'etablissements', 'partenariats'].includes(savedTab)) {
          setActiveTab(savedTab as RequestTabType);
        }
      } catch (error) {
        console.error('Error loading request tab preference:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreference();
  }, [user]);

  // Sauvegarder la préférence
  const saveActiveTab = async (tab: RequestTabType) => {
    if (!user) return;

    setActiveTab(tab);

    try {
      const { data: existingPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('id, preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      const newPreferences = {
        ...(existingPrefs?.preferences || {}),
        requests_active_tab: tab,
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
      console.error('Error saving request tab preference:', error);
    }
  };

  return { activeTab, setActiveTab: saveActiveTab, loading };
}