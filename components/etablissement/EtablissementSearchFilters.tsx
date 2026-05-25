import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRegions } from '@/hooks/useRegions';
import { useDepartements } from '@/hooks/useDepartements';
import theme from '@/constants/theme';

interface EtablissementSearchFiltersProps {
  selectedRegionId: string;
  selectedDepartementId: string;
  selectedVille: string;
  selectedType: string;
  villes: string[];
  types: string[];
  onRegionChange: (regionId: string) => void;
  onDepartementChange: (departementId: string) => void;
  onVilleChange: (ville: string) => void;
  onTypeChange: (type: string) => void;
  onReset: () => void;
}

export default function EtablissementSearchFilters({
  selectedRegionId,
  selectedDepartementId,
  selectedVille,
  selectedType,
  villes,
  types,
  onRegionChange,
  onDepartementChange,
  onVilleChange,
  onTypeChange,
  onReset,
}: EtablissementSearchFiltersProps) {
  const { regions } = useRegions();
  const { departements } = useDepartements(selectedRegionId || undefined);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {/* Filtre région */}
      {regions.length > 0 && (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Région</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedRegionId && styles.filterChipActive]}
              onPress={() => onRegionChange('')}
            >
              <Text style={[styles.filterChipText, !selectedRegionId && styles.filterChipTextActive]}>Toutes</Text>
            </TouchableOpacity>
            {regions.map(region => (
              <TouchableOpacity
                key={region.id}
                style={[styles.filterChip, selectedRegionId === region.id && styles.filterChipActive]}
                onPress={() => onRegionChange(region.id)}
              >
                <Text style={[styles.filterChipText, selectedRegionId === region.id && styles.filterChipTextActive]}>
                  {region.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filtre département (si région sélectionnée) */}
      {departements.length > 0 && (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Département</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedDepartementId && styles.filterChipActive]}
              onPress={() => onDepartementChange('')}
            >
              <Text style={[styles.filterChipText, !selectedDepartementId && styles.filterChipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {departements.map(dept => (
              <TouchableOpacity
                key={dept.id}
                style={[styles.filterChip, selectedDepartementId === dept.id && styles.filterChipActive]}
                onPress={() => onDepartementChange(dept.id)}
              >
                <Text style={[styles.filterChipText, selectedDepartementId === dept.id && styles.filterChipTextActive]}>
                  {dept.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filtre ville */}
      {villes.length > 0 && (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Ville</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedVille && styles.filterChipActive]}
              onPress={() => onVilleChange('')}
            >
              <Text style={[styles.filterChipText, !selectedVille && styles.filterChipTextActive]}>Toutes</Text>
            </TouchableOpacity>
            {villes.map(ville => (
              <TouchableOpacity
                key={ville}
                style={[styles.filterChip, selectedVille === ville && styles.filterChipActive]}
                onPress={() => onVilleChange(ville)}
              >
                <Text style={[styles.filterChipText, selectedVille === ville && styles.filterChipTextActive]}>
                  {ville}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filtre type */}
      {types.length > 0 && (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedType && styles.filterChipActive]}
              onPress={() => onTypeChange('')}
            >
              <Text style={[styles.filterChipText, !selectedType && styles.filterChipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {types.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
                onPress={() => onTypeChange(type)}
              >
                <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>
                  {type === 'public' ? 'Public' : type === 'prive' ? 'Privé' : type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bouton reset */}
      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <Text style={styles.resetButtonText}>Réinitialiser</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    paddingVertical: 8,
  },
  filterGroup: {
    marginRight: 16,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: 12,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    alignSelf: 'center',
    marginLeft: 8,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#EF4444',
  },
});