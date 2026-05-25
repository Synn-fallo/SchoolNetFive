import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { X, ChevronDown, Check } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import theme from '@/constants/theme';

const { height } = Dimensions.get('window');

interface FilterBarProps {
  visible: boolean;
  onClose: () => void;
  regions: { id: string; nom: string }[];
  departements: { id: string; nom: string; region_id: string }[];
  types: string[];
  options: string[];
  selectedRegionId: string;
  selectedDepartementId: string;
  selectedType: string;
  selectedCycle: string;
  selectedOption: string;
  onRegionChange: (regionId: string) => void;
  onDepartementChange: (departementId: string) => void;
  onTypeChange: (type: string) => void;
  onCycleChange: (cycle: string) => void;
  onOptionChange: (option: string) => void;
  onReset: () => void;
}

const CYCLE_OPTIONS = [
  { label: 'Tous', value: 'tous' },
  { label: '1er cycle', value: 'premier' },
  { label: '2nd cycle', value: 'second' },
];

const TYPE_OPTIONS = [
  { label: 'Tous', value: 'tous' },
  { label: 'Public', value: 'public' },
  { label: 'Privé', value: 'prive' },
  { label: 'Mixte', value: 'mixte' },
];

export default function FilterBar({
  visible,
  onClose,
  regions,
  departements,
  types,
  options,
  selectedRegionId,
  selectedDepartementId,
  selectedType,
  selectedCycle,
  selectedOption,
  onRegionChange,
  onDepartementChange,
  onTypeChange,
  onCycleChange,
  onOptionChange,
  onReset,
}: FilterBarProps) {
  // États locaux pour les modifications avant validation
  const [localRegionId, setLocalRegionId] = useState(selectedRegionId);
  const [localDepartementId, setLocalDepartementId] = useState(selectedDepartementId);
  const [localType, setLocalType] = useState(selectedType);
  const [localCycle, setLocalCycle] = useState(selectedCycle);
  const [localOption, setLocalOption] = useState(selectedOption);

  // Synchroniser les états locaux avec les props quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      setLocalRegionId(selectedRegionId);
      setLocalDepartementId(selectedDepartementId);
      setLocalType(selectedType);
      setLocalCycle(selectedCycle);
      setLocalOption(selectedOption);
    }
  }, [visible, selectedRegionId, selectedDepartementId, selectedType, selectedCycle, selectedOption]);

  // Filtrer les départements par région sélectionnée
  const filteredDepartements = localRegionId 
    ? departements.filter(d => d.region_id === localRegionId)
    : departements;

  // Appliquer tous les filtres en une fois
  const applyFilters = () => {
    onRegionChange(localRegionId);
    onDepartementChange(localDepartementId);
    onTypeChange(localType);
    onCycleChange(localCycle);
    onOptionChange(localOption);
    onClose();
  };

  // Réinitialiser tous les filtres locaux et fermer
  const resetLocalFilters = () => {
    setLocalRegionId('');
    setLocalDepartementId('');
    setLocalType('tous');
    setLocalCycle('tous');
    setLocalOption('tous');
    onReset();  // Déjà correct
    onClose();  // Déjà correct
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* En-tête */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          {/* Corps du modal avec scroll */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            
            {/* Filtre Région */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Région</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                <TouchableOpacity
                  style={[styles.optionChip, !localRegionId && styles.optionChipActive]}
                  onPress={() => {
                    setLocalRegionId('');
                    setLocalDepartementId('');
                  }}
                >
                  <Text style={[styles.optionChipText, !localRegionId && styles.optionChipTextActive]}>
                    Toutes
                  </Text>
                  {!localRegionId && <Check size={12} color="#FFFFFF" />}
                </TouchableOpacity>
                {regions.map((region) => (
                  <TouchableOpacity
                    key={region.id}
                    style={[styles.optionChip, localRegionId === region.id && styles.optionChipActive]}
                    onPress={() => {
                      setLocalRegionId(region.id);
                      setLocalDepartementId('');
                    }}
                  >
                    <Text style={[styles.optionChipText, localRegionId === region.id && styles.optionChipTextActive]}>
                      {region.nom}
                    </Text>
                    {localRegionId === region.id && <Check size={12} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtre Département */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Département</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                <TouchableOpacity
                  style={[styles.optionChip, !localDepartementId && styles.optionChipActive]}
                  onPress={() => setLocalDepartementId('')}
                  disabled={!localRegionId}
                >
                  <Text style={[styles.optionChipText, !localDepartementId && styles.optionChipTextActive]}>
                    Tous
                  </Text>
                  {!localDepartementId && <Check size={12} color="#FFFFFF" />}
                </TouchableOpacity>
                {filteredDepartements.map((dept) => (
                  <TouchableOpacity
                    key={dept.id}
                    style={[styles.optionChip, localDepartementId === dept.id && styles.optionChipActive]}
                    onPress={() => setLocalDepartementId(dept.id)}
                  >
                    <Text style={[styles.optionChipText, localDepartementId === dept.id && styles.optionChipTextActive]}>
                      {dept.nom}
                    </Text>
                    {localDepartementId === dept.id && <Check size={12} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {!localRegionId && (
                <Text style={styles.disabledHint}>Sélectionnez d'abord une région</Text>
              )}
            </View>

            {/* Filtre Type d'établissement */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Type d'établissement</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                {TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionChip, localType === option.value && styles.optionChipActive]}
                    onPress={() => setLocalType(option.value)}
                  >
                    <Text style={[styles.optionChipText, localType === option.value && styles.optionChipTextActive]}>
                      {option.label}
                    </Text>
                    {localType === option.value && <Check size={12} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtre Cycle proposé */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Cycle proposé</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                {CYCLE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionChip, localCycle === option.value && styles.optionChipActive]}
                    onPress={() => setLocalCycle(option.value)}
                  >
                    <Text style={[styles.optionChipText, localCycle === option.value && styles.optionChipTextActive]}>
                      {option.label}
                    </Text>
                    {localCycle === option.value && <Check size={12} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtre Option / Filière (visible seulement s'il y a des options) */}
            {options.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Option / Filière</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                  <TouchableOpacity
                    style={[styles.optionChip, localOption === 'tous' && styles.optionChipActive]}
                    onPress={() => setLocalOption('tous')}
                  >
                    <Text style={[styles.optionChipText, localOption === 'tous' && styles.optionChipTextActive]}>
                      Toutes
                    </Text>
                    {localOption === 'tous' && <Check size={12} color="#FFFFFF" />}
                  </TouchableOpacity>
                  {options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.optionChip, localOption === option && styles.optionChipActive]}
                      onPress={() => setLocalOption(option)}
                    >
                      <Text style={[styles.optionChipText, localOption === option && styles.optionChipTextActive]}>
                        {option}
                      </Text>
                      {localOption === option && <Check size={12} color="#FFFFFF" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Pied de page avec boutons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={resetLocalFilters}>
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: theme.colors.neutral[800],
  },
  modalBody: {
    padding: theme.spacing[4],
  },
  filterGroup: {
    marginBottom: theme.spacing[5],
  },
  filterGroupTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing[2],
  },
  optionsScroll: {
    flexDirection: 'row',
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.full,
    marginRight: 8,
  },
  optionChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  optionChipText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.neutral[600],
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  disabledHint: {
    fontSize: 11,
    color: theme.colors.neutral[400],
    marginTop: 6,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    gap: theme.spacing[3],
  },
  resetButton: {
    flex: 1,
    paddingVertical: theme.spacing[2],
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.DEFAULT,
  },
  resetButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
  },
  applyButton: {
    flex: 1,
    paddingVertical: theme.spacing[2],
    alignItems: 'center',
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: theme.borderRadius.DEFAULT,
  },
  applyButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});