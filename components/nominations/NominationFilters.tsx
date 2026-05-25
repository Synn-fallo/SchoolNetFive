// /home/project/components/nominations/NominationFilters.tsx
import FilterBar, { FilterGroup } from '@/components/common/FilterBar';

interface NominationFiltersProps {
  activeFilters: {
    type: string;
    status: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onClearAll: () => void;
}

export default function NominationFilters({
  activeFilters,
  onFilterChange,
  onClearAll,
}: NominationFiltersProps) {
  const filterGroups: FilterGroup[] = [
    {
      id: 'type',
      label: 'Type',
      options: [
        { id: 'all', label: 'Tous', value: '' },
        { id: 'de', label: 'Directeur des Études', value: 'de' },
        { id: 'ae', label: 'Animateur d\'Établissement', value: 'ae' },
        { id: 'comptable', label: 'Comptable', value: 'comptable' },
        { id: 'caissier', label: 'Caissier', value: 'caissier' },
        { id: 'assistant_comptable', label: 'Assistant comptable', value: 'assistant_comptable' },
        { id: 'administratif', label: 'Personnel Administratif', value: 'administratif' },
        { id: 'vie_scolaire', label: 'Personnel Vie Scolaire', value: 'vie_scolaire' },
      ],
    },
    {
      id: 'status',
      label: 'Statut',
      options: [
        { id: 'all', label: 'Tous', value: '' },
        { id: 'active', label: 'Actif', value: 'active' },
        { id: 'inactive', label: 'Inactif', value: 'inactive' },
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
