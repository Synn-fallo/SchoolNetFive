// /home/project/components/common/FilterBar.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Filter, X } from 'lucide-react-native';
import theme from '@/constants/theme';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  groups: FilterGroup[];
  activeFilters: Record<string, string>;
  onFilterChange: (groupId: string, value: string) => void;
  onClearAll?: () => void;
  showClearAll?: boolean;
}

export default function FilterBar({
  groups,
  activeFilters,
  onFilterChange,
  onClearAll,
  showClearAll = true,
}: FilterBarProps) {
  const hasActiveFilters = Object.values(activeFilters).some(v => v !== '');

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Filter size={16} color={theme.colors.neutral[500]} />
        <Text style={styles.title}>Filtres</Text>
        {showClearAll && hasActiveFilters && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton}>
            <X size={14} color={theme.colors.neutral[500]} />
            <Text style={styles.clearAllText}>Tout effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {groups.map((group) => (
          <View key={group.id} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.optionsContainer}>
              {group.options.map((option) => {
                const isActive = activeFilters[group.id] === option.value;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.option, isActive && styles.optionActive]}
                    onPress={() => onFilterChange(group.id, isActive ? '' : option.value)}
                  >
                    <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearAllText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
  },
  scrollView: {
    flexDirection: 'row',
  },
  group: {
    marginRight: 16,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  optionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  optionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
});
