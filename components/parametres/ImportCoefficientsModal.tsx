// /home/project/components/parametres/ImportCoefficientsModal.tsx
// Modale pour importer les coefficients depuis une autre classe

import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import theme from '@/constants/theme';

interface ImportCoefficientsModalProps {
  visible: boolean;
  onClose: () => void;
  classes: { id: string; nom: string }[];
  currentClasseId: string;
  currentClasseNom: string;
  onImport: (sourceClasseId: string) => Promise<void>;
  loading?: boolean;
}

export default function ImportCoefficientsModal({
  visible,
  onClose,
  classes,
  currentClasseId,
  currentClasseNom,
  onImport,
  loading = false,
}: ImportCoefficientsModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Filtrer pour exclure la classe courante
  const otherClasses = classes.filter(c => c.id !== currentClasseId);

  const handleImport = async () => {
    if (!selectedId) return;
    setIsImporting(true);
    await onImport(selectedId);
    setIsImporting(false);
    setSelectedId(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Importer des coefficients</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.infoText}>
              Importer les coefficients vers <Text style={styles.bold}>{currentClasseNom}</Text> depuis :
            </Text>

            {otherClasses.length === 0 ? (
              <Text style={styles.emptyText}>Aucune autre classe disponible</Text>
            ) : (
              <FlatList
                data={otherClasses}
                keyExtractor={(item) => item.id}
                style={styles.list}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.classItem, selectedId === item.id && styles.classItemSelected]}
                    onPress={() => setSelectedId(item.id)}
                  >
                    <Text style={[styles.className, selectedId === item.id && styles.classNameSelected]}>
                      {item.nom}
                    </Text>
                    {selectedId === item.id && <ChevronRight size={18} color={theme.colors.primary.DEFAULT} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importButton, (!selectedId || isImporting) && styles.importButtonDisabled]}
              onPress={handleImport}
              disabled={!selectedId || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.importButtonText}>Importer</Text>
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
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  bold: {
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  list: {
    maxHeight: 400,
  },
  classItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  classItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  className: {
    fontSize: 15,
    color: '#1F2937',
  },
  classNameSelected: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
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
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  importButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 8,
  },
  importButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});