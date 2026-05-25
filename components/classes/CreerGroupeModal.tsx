// /home/project/components/classes/CreerGroupeModal.tsx
// Modal pour créer un groupe manuellement

import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { X, Plus } from 'lucide-react-native';
import theme from '@/constants/theme';

interface CreerGroupeModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (nom: string, description?: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CreerGroupeModal({
  visible,
  onClose,
  onCreate,
  isLoading = false,
}: CreerGroupeModalProps) {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!nom.trim()) return;
    await onCreate(nom.trim(), description.trim() || undefined);
    // Réinitialiser le formulaire après soumission (le parent fera onClose)
    setNom('');
    setDescription('');
  };

  const handleClose = () => {
    setNom('');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Créer un groupe</Text>
              <Text style={styles.modalSubtitle}>Ajoutez un nouveau groupe à la classe</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <X size={20} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nom du groupe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Groupe A, Atelier 1, Groupe de TP"
              value={nom}
              onChangeText={setNom}
              placeholderTextColor={theme.colors.neutral[400]}
            />

            <Text style={styles.label}>Description (optionnelle)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description du groupe"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor={theme.colors.neutral[400]}
            />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, (!nom.trim() || isLoading) && styles.createButtonDisabled]}
              onPress={handleSubmit}
              disabled={!nom.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Créer le groupe</Text>
                </>
              )}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});