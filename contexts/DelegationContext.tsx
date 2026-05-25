import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Delegation, useDelegations } from '@/hooks/useDelegations';

interface DelegationContextType {
  /** Délégations actives pour l'utilisateur connecté (menus fusionnés) */
  activeDelegations: Delegation[];
  /** Chargement des délégations */
  loading: boolean;
  /** Rôles délégués actifs (liste des role_delegue) */
  activeDelegatedRoles: string[];
  /** Vérifier si un rôle est délégué à l'utilisateur */
  hasDelegationForRole: (roleDelegue: string) => boolean;
  /** Rafraîchir les délégations */
  refreshDelegations: () => Promise<void>;
}

const DelegationContext = createContext<DelegationContextType | undefined>(undefined);

export function DelegationProvider({ children }: { children: ReactNode }) {
  const { user, activeEtablissementId } = useAuth();
  const { getActiveDelegationsForUser } = useDelegations();
  const [activeDelegations, setActiveDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);

  const activeDelegatedRoles = activeDelegations.map(d => d.role_delegue);

  const hasDelegationForRole = useCallback((roleDelegue: string): boolean => {
    return activeDelegatedRoles.includes(roleDelegue);
  }, [activeDelegatedRoles]);

  const refreshDelegations = useCallback(async () => {
    if (!user) {
      setActiveDelegations([]);
      setLoading(false);
      return;
    }

    try {
      const delegations = await getActiveDelegationsForUser(user.id, activeEtablissementId);
      setActiveDelegations(delegations);
    } catch (error) {
      console.error('Error refreshing delegations:', error);
      setActiveDelegations([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeEtablissementId, getActiveDelegationsForUser]);

  useEffect(() => {
    refreshDelegations();
  }, [refreshDelegations]);

  // Écouter les changements dans la table delegations (real-time)
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('delegations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delegations',
          filter: `delegue_id=eq.${user.id}`,
        },
        () => {
          refreshDelegations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, refreshDelegations]);

  return (
    <DelegationContext.Provider
      value={{
        activeDelegations,
        loading,
        activeDelegatedRoles,
        hasDelegationForRole,
        refreshDelegations,
      }}
    >
      {children}
    </DelegationContext.Provider>
  );
}

export function useDelegationContext() {
  const context = useContext(DelegationContext);
  if (context === undefined) {
    throw new Error('useDelegationContext must be used within a DelegationProvider');
  }
  return context;
}