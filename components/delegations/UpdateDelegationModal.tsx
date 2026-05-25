// /home/project/components/delegations/UpdateDelegationModal.tsx
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, Switch, ScrollView } from 'react-native';
import { useState } from 'react';
import { X } from 'lucide-react-native';
import DateRangePicker from '@/components/common/DateRangePicker';
import theme from '@/constants/theme';

interface UpdateDelegationModalProps {
  visible: boolean;
  delegation: {
    id: string;
    dateFin: string | null;
    departement?: string;
    plafond?: number;
    role_delegue: string;
  };
  onClose: () => void;
  onUpdate: (id: string, updates: { date_fin?: string | null; departement?: string; plafond?: number }) => Promise<void>;
}

export default function UpdateDelegationModal({
  visible,
  delegation,
  onClose,
  onUpdate,
}: UpdateDelegationModalProps) {
  const [dateFin, setDateFin] = useState(delegation.dateFin || '');
  const [departement, setDepartement] = useState(delegation.departement || '');
  const [plafond, setPlafond] = useState(delegation.plafond?.toString() || '');
  const [isTemporary, setIsTemporary] = useState(!!delegation.dateFin);
  const [loading, setLoading] = useState(false);

  const showDepartement = delegation.role_delegue === 'ae';
  const showPlafond = delegation.role_delegue === 'ae';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updates: { date_fin?: string | null; departement?: string; plafond?: number } = {};

      if (isTemporary && dateFin) {
        updates.date_fin = dateFin;
      } else if (!isTemporary) {
        updates.date_fin = null;
      }

      if (showDepartement && departement !== delegation.departement) {
        updates.departement = departement || null;
      }

      if (showPlafond && plafond !== delegation.plafond?.toString()) {
        updates.plafond = plafond ? parseInt(plafond) : undefined;
      }

      await onUpdate(delegation.id, updates);
      Alert.alert('Succès', 'Délégation modifiée avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating delegation:', error);
      Alert.alert('Erreur', 'Impossible de modifier la délégation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier la délégation</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Durée */}
            <View style={styles.section}>
              <Text style={styles.label}>Durée</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Délégation temporaire</Text>
                <Switch
                  value={isTemporary}
                  onValueChange={setIsTemporary}
                  trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {isTemporary && (
                <View style={styles.dateSection}>
                  <DateRangePicker
                    startDate=""
                    endDate={dateFin}
                    onStartDateChange={() => {}}
                    onEndDateChange={setDateFin}
                    showEndDate={true}
                    placeholderEnd="Date de fin"
                  />
                </View>
              )}
            </View>

            {/* Département (AE) */}
            {showDepartement && (
              <View style={styles.section}>
                <Text style={styles.label}>Département (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Sciences, Lettres"
                  value={departement}
                  onChangeText={setDepartement}
                />
              </View>
            )}

            {/* Plafond (AE) */}
            {showPlafond && (
              <View style={styles.section}>
                <Text style={styles.label}>Plafond d'enseignants (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre maximum"
                  value={plafond}
                  onChangeText={setPlafond}
                  keyboardType="numeric"
                />
                <Text style={styles.hintText}>Laissez vide pour aucun plafond</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: '#1F2937',
  },
  dateSection: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
