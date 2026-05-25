// /home/project/components/delegations/DelegationFilters.tsx
import FilterBar, { FilterGroup } from '@/components/common/FilterBar';

interface DelegationFiltersProps {
  activeFilters: {
    type: string;
    status: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onClearAll: () => void;
}

export default function DelegationFilters({
  activeFilters,
  onFilterChange,
  onClearAll,
}: DelegationFiltersProps) {
  const filterGroups: FilterGroup[] = [
    {
      id: 'type',
      label: 'Type',
      options: [
        { id: 'all', label: 'Tous', value: '' },
        { id: 'financiere', label: 'Financière', value: 'financiere' },
        { id: 'pedagogique', label: 'Pédagogique', value: 'pedagogique' },
        { id: 'administrative', label: 'Administrative', value: 'administrative' },
      ],
    },
    {
      id: 'status',
      label: 'Statut',
      options: [
        { id: 'all', label: 'Tous', value: '' },
        { id: 'active', label: 'Actif', value: 'active' },
        { id: 'inactive', label: 'Inactif', value: 'inactive' },
        { id: 'expired', label: 'Expiré', value: 'expired' },
      ],
    },
  ];

  return (
    <FilterBar
      groups={filterGroups}
      activeFilters={{
        type: activeFilters.type,
        status: activeFilters.status,
      }}
      onFilterChange={onFilterChange}
      onClearAll={onClearAll}
      showClearAll={true}
    />
  );
}
