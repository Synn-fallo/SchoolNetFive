// /home/project/components/nominations/UpdateNominationModal.tsx
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { X } from 'lucide-react-native';
import theme from '@/constants/theme';

interface UpdateNominationModalProps {
  visible: boolean;
  nomination: {
    id: string;
    typeAdmin: string;
    justification?: string;
    fonction?: string;
    departement?: string;
  };
  onClose: () => void;
  onUpdate: (id: string, updates: { justification?: string; fonction?: string; departement?: string }) => Promise<void>;
}

export default function UpdateNominationModal({
  visible,
  nomination,
  onClose,
  onUpdate,
}: UpdateNominationModalProps) {
  const [justification, setJustification] = useState(nomination.justification || '');
  const [fonction, setFonction] = useState(nomination.fonction || '');
  const [departement, setDepartement] = useState(nomination.departement || '');
  const [loading, setLoading] = useState(false);

  const showDepartement = nomination.typeAdmin === 'ae';
  const showFonction = nomination.typeAdmin !== 'de' && nomination.typeAdmin !== 'ae';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updates: { justification?: string; fonction?: string; departement?: string } = {};

      if (justification !== nomination.justification) {
        updates.justification = justification || undefined;
      }
      if (showFonction && fonction !== nomination.fonction) {
        updates.fonction = fonction || undefined;
      }
      if (showDepartement && departement !== nomination.departement) {
        updates.departement = departement || undefined;
      }

      await onUpdate(nomination.id, updates);
      Alert.alert('Succès', 'Nomination modifiée avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating nomination:', error);
      Alert.alert('Erreur', 'Impossible de modifier la nomination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier la nomination</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {(showFonction || showDepartement) && (
              <View style={styles.section}>
                <Text style={styles.label}>Informations complémentaires</Text>
                
                {showFonction && (
                  <TextInput
                    style={styles.input}
                    placeholder="Fonction spécifique"
                    value={fonction}
                    onChangeText={setFonction}
                  />
                )}

                {showDepartement && (
                  <TextInput
                    style={styles.input}
                    placeholder="Département"
                    value={departement}
                    onChangeText={setDepartement}
                  />
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>Justification (optionnelle)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Motif de la nomination..."
                multiline
                numberOfLines={3}
                value={justification}
                onChangeText={setJustification}
              />
            </View>
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
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
