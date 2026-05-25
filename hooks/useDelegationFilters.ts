// /home/project/hooks/useDelegationFilters.ts
import { useState, useMemo } from 'react';
import { Delegation } from './useDelegations';

export interface DelegationFilters {
  type: string;
  status: string;
}

export function useDelegationFilters(delegations: Delegation[]) {
  const [filters, setFilters] = useState<DelegationFilters>({
    type: '',
    status: '',
  });

  const updateFilter = (key: keyof DelegationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({ type: '', status: '' });
  };

  const isDelegationExpired = (delegation: Delegation): boolean => {
    if (!delegation.is_active) return false;
    if (delegation.date_fin) {
      return new Date(delegation.date_fin) < new Date();
    }
    return false;
  };

  const filteredDelegations = useMemo(() => {
    return delegations.filter(del => {
      // Filtre par type
      if (filters.type && del.type !== filters.type) {
        return false;
      }

      // Filtre par statut
      if (filters.status) {
        const isExpired = isDelegationExpired(del);
        if (filters.status === 'active' && (!del.is_active || isExpired)) return false;
        if (filters.status === 'inactive' && del.is_active && !isExpired) return false;
        if (filters.status === 'expired' && !isExpired) return false;
      }

      return true;
    });
  }, [delegations, filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearAllFilters,
    filteredDelegations,
    isDelegationExpired,
  };
}
