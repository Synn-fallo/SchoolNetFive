import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useSidebar() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const isMobile = width < 768;

  // Charger la préférence utilisateur
  useEffect(() => {
    const loadPreference = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.preferences?.sidebar?.isOpen !== undefined) {
          setIsOpen(data.preferences.sidebar.isOpen);
        } else {
          // Par défaut, sur mobile la sidebar est fermée, sur desktop ouverte
          setIsOpen(!isMobile);
        }
      } catch (error) {
        console.error('Error loading sidebar preference:', error);
        setIsOpen(!isMobile);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, [user, isMobile]);

  // Sauvegarder la préférence
  const savePreference = async (open: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: {
            sidebar: { isOpen: open },
          },
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving sidebar preference:', error);
    }
  };

  const toggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    savePreference(newState);
  };

  const open = () => {
    if (!isOpen) {
      setIsOpen(true);
      savePreference(true);
    }
  };

  const close = () => {
    if (isOpen) {
      setIsOpen(false);
      savePreference(false);
    }
  };

  return {
    isOpen,
    isMobile,
    isLoading,
    toggle,
    open,
    close,
  };
}