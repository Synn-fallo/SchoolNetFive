// /home/project/components/parametres/ExportCoefficientsModal.tsx
// Modale pour exporter les coefficients vers plusieurs classes

import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useState } from 'react';
import theme from '@/constants/theme';

interface ExportCoefficientsModalProps {
  visible: boolean;
  onClose: () => void;
  classes: { id: string; nom: string }[];
  currentClasseId: string;
  currentClasseNom: string;
  onExport: (targetClasseIds: string[]) => Promise<void>;
  loading?: boolean;
}

export default function ExportCoefficientsModal({
  visible,
  onClose,
  classes,
  currentClasseId,
  currentClasseNom,
  onExport,
  loading = false,
}: ExportCoefficientsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Filtrer pour exclure la classe courante
  const otherClasses = classes.filter(c => c.id !== currentClasseId);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(otherClasses.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      return;
    }
    setIsExporting(true);
    await onExport(selectedIds);
    setIsExporting(false);
    setSelectedIds([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Exporter les coefficients</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.infoText}>
              Exporter les coefficients de <Text style={styles.bold}>{currentClasseNom}</Text> vers :
            </Text>

            {otherClasses.length === 0 ? (
              <Text style={styles.emptyText}>Aucune autre classe disponible</Text>
            ) : (
              <>
                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={selectAll} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Tout sélectionner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={deselectAll} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Tout désélectionner</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={otherClasses}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.classItem, selectedIds.includes(item.id) && styles.classItemSelected]}
                      onPress={() => toggleSelect(item.id)}
                    >
                      <Text style={[styles.className, selectedIds.includes(item.id) && styles.classNameSelected]}>
                        {item.nom}
                      </Text>
                      {selectedIds.includes(item.id) && <Check size={18} color={theme.colors.primary.DEFAULT} />}
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, (selectedIds.length === 0 || isExporting) && styles.exportButtonDisabled]}
              onPress={handleExport}
              disabled={selectedIds.length === 0 || isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.exportButtonText}>
                  Exporter vers {selectedIds.length} classe(s)
                </Text>
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
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
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
  exportButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});