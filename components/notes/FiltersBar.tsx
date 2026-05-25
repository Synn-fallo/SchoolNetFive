// /home/project/components/notes/FiltersBar.tsx
// Barre de filtres pour la page Notes (cycle, classe, matière, période, statut)

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { ChevronDown, Filter, X } from 'lucide-react-native';
import { Periode, NoteStatus, ALL_STATUSES } from '@/types/notes.types';
import theme from '@/constants/theme';

interface FiltersBarProps {
  cycles: { id: string; nom: string }[];
  classes: { id: string; nom: string }[];
  matieres: { id: string; nom: string }[];
  selectedCycleId: string | null;
  selectedClasseId: string | null;
  selectedMatiereId: string | null;
  selectedPeriode: Periode;
  selectedStatut: NoteStatus | 'tous';
  onCycleChange: (cycleId: string | null) => void;
  onClasseChange: (classeId: string | null) => void;
  onMatiereChange: (matiereId: string | null) => void;
  onPeriodeChange: (periode: Periode) => void;
  onStatutChange: (statut: NoteStatus | 'tous') => void;
  isSubscribed: boolean;
  disabled?: boolean;
}

const STATUT_OPTIONS: { value: NoteStatus | 'tous'; label: string; color: string }[] = [
  { value: 'tous', label: 'Tous', color: '#6B7280' },
  { value: 'publiee', label: 'Publiée', color: '#3B82F6' },
  { value: 'livree', label: 'Livrée', color: '#10B981' },
  { value: 'revisee', label: 'Révisée', color: '#F59E0B' },
];

const PERIODE_OPTIONS: { value: Periode; label: string }[] = [
  { value: 'S1', label: 'Semestre 1' },
  { value: 'S2', label: 'Semestre 2' },
  { value: 'T1', label: 'Trimestre 1' },
  { value: 'T2', label: 'Trimestre 2' },
  { value: 'T3', label: 'Trimestre 3' },
];

export default function FiltersBar({
  cycles,
  classes,
  matieres,
  selectedCycleId,
  selectedClasseId,
  selectedMatiereId,
  selectedPeriode,
  selectedStatut,
  onCycleChange,
  onClasseChange,
  onMatiereChange,
  onPeriodeChange,
  onStatutChange,
  isSubscribed,
  disabled = false,
}: FiltersBarProps) {
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showClasseModal, setShowClasseModal] = useState(false);
  const [showMatiereModal, setShowMatiereModal] = useState(false);
  const [showPeriodeModal, setShowPeriodeModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);

  const getSelectedCycleNom = () => {
    if (!selectedCycleId) return 'Tous les cycles';
    const cycle = cycles.find(c => c.id === selectedCycleId);
    return cycle?.nom || 'Tous les cycles';
  };

  const getSelectedClasseNom = () => {
    if (!selectedClasseId) return 'Toutes les classes';
    const classe = classes.find(c => c.id === selectedClasseId);
    return classe?.nom || 'Toutes les classes';
  };

  const getSelectedMatiereNom = () => {
    if (!selectedMatiereId) return 'Toutes les matières';
    const matiere = matieres.find(m => m.id === selectedMatiereId);
    return matiere?.nom || 'Toutes les matières';
  };

  const getSelectedPeriodeLabel = () => {
    const option = PERIODE_OPTIONS.find(o => o.value === selectedPeriode);
    return option?.label || selectedPeriode;
  };

  const getSelectedStatutLabel = () => {
    const option = STATUT_OPTIONS.find(o => o.value === selectedStatut);
    return option?.label || 'Tous';
  };

  const getSelectedStatutColor = () => {
    const option = STATUT_OPTIONS.find(o => o.value === selectedStatut);
    return option?.color || '#6B7280';
  };

  const FilterButton = ({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
      disabled={disabled || !isSubscribed}
    >
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
        {label}
      </Text>
      <ChevronDown size={14} color={active ? theme.colors.primary.DEFAULT : '#6B7280'} />
    </TouchableOpacity>
  );

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    items: { id: string; label: string }[],
    selectedId: string | null,
    onSelect: (id: string | null) => void
  ) => (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: 'all', label: 'Tous' }, ...items]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  (item.id === 'all' ? !selectedId : selectedId === item.id) && styles.modalOptionActive,
                ]}
                onPress={() => {
                  onSelect(item.id === 'all' ? null : item.id);
                  onClose();
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  (item.id === 'all' ? !selectedId : selectedId === item.id) && styles.modalOptionTextActive,
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.modalList}
          />
        </View>
      </View>
    </Modal>
  );

  const cycleItems = cycles.map(c => ({ id: c.id, label: c.nom }));
  const classeItems = classes.map(c => ({ id: c.id, label: c.nom }));
  const matiereItems = matieres.map(m => ({ id: m.id, label: m.nom }));

  if (!isSubscribed) {
    return (
      <View style={styles.disabledContainer}>
        <Filter size={16} color="#9CA3AF" />
        <Text style={styles.disabledText}>
          Filtres disponibles uniquement avec un abonnement actif
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FilterButton
          label={getSelectedCycleNom()}
          onPress={() => setShowCycleModal(true)}
          active={!!selectedCycleId}
        />
        <FilterButton
          label={getSelectedClasseNom()}
          onPress={() => setShowClasseModal(true)}
          active={!!selectedClasseId}
        />
        <FilterButton
          label={getSelectedMatiereNom()}
          onPress={() => setShowMatiereModal(true)}
          active={!!selectedMatiereId}
        />
        <FilterButton
          label={getSelectedPeriodeLabel()}
          onPress={() => setShowPeriodeModal(true)}
          active={true}
        />
        <TouchableOpacity
          style={[styles.statutButton, { backgroundColor: `${getSelectedStatutColor()}15` }]}
          onPress={() => setShowStatutModal(true)}
        >
          <View style={[styles.statutDot, { backgroundColor: getSelectedStatutColor() }]} />
          <Text style={[styles.statutText, { color: getSelectedStatutColor() }]}>
            {getSelectedStatutLabel()}
          </Text>
          <ChevronDown size={14} color={getSelectedStatutColor()} />
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      {renderModal(showCycleModal, () => setShowCycleModal(false), 'Sélectionner un cycle', cycleItems, selectedCycleId, onCycleChange)}
      {renderModal(showClasseModal, () => setShowClasseModal(false), 'Sélectionner une classe', classeItems, selectedClasseId, onClasseChange)}
      {renderModal(showMatiereModal, () => setShowMatiereModal(false), 'Sélectionner une matière', matiereItems, selectedMatiereId, onMatiereChange)}

      {/* Modal Période */}
      <Modal visible={showPeriodeModal} transparent={true} animationType="fade" onRequestClose={() => setShowPeriodeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une période</Text>
              <TouchableOpacity onPress={() => setShowPeriodeModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {PERIODE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  selectedPeriode === option.value && styles.modalOptionActive,
                ]}
                onPress={() => {
                  onPeriodeChange(option.value);
                  setShowPeriodeModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedPeriode === option.value && styles.modalOptionTextActive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal Statut */}
      <Modal visible={showStatutModal} transparent={true} animationType="fade" onRequestClose={() => setShowStatutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un statut</Text>
              <TouchableOpacity onPress={() => setShowStatutModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {STATUT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  selectedStatut === option.value && styles.modalOptionActive,
                ]}
                onPress={() => {
                  onStatutChange(option.value);
                  setShowStatutModal(false);
                }}
              >
                <View style={styles.statutOptionRow}>
                  <View style={[styles.statutDot, { backgroundColor: option.color }]} />
                  <Text style={[
                    styles.modalOptionText,
                    selectedStatut === option.value && styles.modalOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    borderColor: theme.colors.primary.DEFAULT,
    backgroundColor: '#EFF6FF',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  statutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statutText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalList: {
    padding: 8,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#1F2937',
  },
  modalOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  statutOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  disabledText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});