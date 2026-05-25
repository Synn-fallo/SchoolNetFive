// /home/project/contexts/NominationContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNominations, Nomination } from '@/hooks/useNominations';

interface NominationContextType {
  activeNominations: Nomination[];
  activeNominatedRoles: string[];
  loading: boolean;
  hasNominationForRole: (typeAdmin: string) => boolean;
  refreshNominations: () => Promise<void>;
}

const NominationContext = createContext<NominationContextType | undefined>(undefined);

export function NominationProvider({ children }: { children: ReactNode }) {
  const { user, activeEtablissementId } = useAuth();
  const { getNominations } = useNominations();
  const [activeNominations, setActiveNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);

  const activeNominatedRoles = activeNominations.map(n => n.type_admin);

  const hasNominationForRole = useCallback((typeAdmin: string): boolean => {
    return activeNominatedRoles.includes(typeAdmin);
  }, [activeNominatedRoles]);

  const refreshNominations = useCallback(async () => {
    if (!user || !activeEtablissementId) {
      setActiveNominations([]);
      setLoading(false);
      return;
    }

    try {
      const nominations = await getNominations({
        etablissementId: activeEtablissementId,
        is_active: true,
      });
      setActiveNominations(nominations);
    } catch (error) {
      console.error('Error refreshing nominations:', error);
      setActiveNominations([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeEtablissementId, getNominations]);

  useEffect(() => {
    refreshNominations();
  }, [refreshNominations]);

  // Écouter les changements dans user_roles (real-time)
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('user_roles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshNominations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, refreshNominations]);

  return (
    <NominationContext.Provider
      value={{
        activeNominations,
        activeNominatedRoles,
        loading,
        hasNominationForRole,
        refreshNominations,
      }}
    >
      {children}
    </NominationContext.Provider>
  );
}

export function useNominationContext() {
  const context = useContext(NominationContext);
  if (context === undefined) {
    throw new Error('useNominationContext must be used within a NominationProvider');
  }
  return context;
}
