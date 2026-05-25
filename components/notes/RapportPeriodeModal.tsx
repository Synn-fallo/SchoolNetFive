// /home/project/components/notes/RapportPeriodeModal.tsx
// Modal pour la génération du rapport de fin de période

import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { X, FileText, FileSpreadsheet } from 'lucide-react-native';
import { Periode } from '@/types/notes.types';
import theme from '@/constants/theme';

interface RapportPeriodeModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (params: any) => Promise<void>;
  etablissementId: string;
  anneeScolaireId: string;
  periode: Periode;
  classes: { id: string; nom: string }[];
  isSubscribed: boolean;
}

export default function RapportPeriodeModal({
  visible,
  onClose,
  onGenerate,
  etablissementId,
  anneeScolaireId,
  periode,
  classes,
  isSubscribed,
}: RapportPeriodeModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>('pdf');
  const [selectedClasseId, setSelectedClasseId] = useState<string | undefined>(undefined);
  const [inclureTableauHonneur, setInclureTableauHonneur] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPeriodeLabel = () => {
    if (periode === 'S1') return 'Semestre 1';
    if (periode === 'S2') return 'Semestre 2';
    if (periode === 'T1') return 'Trimestre 1';
    if (periode === 'T2') return 'Trimestre 2';
    return 'Trimestre 3';
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await onGenerate({
        format: selectedFormat,
        classeId: selectedClasseId,
        inclureTableauHonneur,
      });
      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedClasseNom = classes.find(c => c.id === selectedClasseId)?.nom;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* En-tête */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📊 Rapport de fin de période</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Période */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Période</Text>
              <Text style={styles.infoValue}>{getPeriodeLabel()}</Text>
            </View>

            {/* Format d'export */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Format d'export</Text>
              <View style={styles.formatButtons}>
                <TouchableOpacity
                  style={[styles.formatButton, selectedFormat === 'pdf' && styles.formatButtonActive]}
                  onPress={() => setSelectedFormat('pdf')}
                >
                  <FileText size={20} color={selectedFormat === 'pdf' ? theme.colors.primary.DEFAULT : '#6B7280'} />
                  <Text style={[styles.formatButtonText, selectedFormat === 'pdf' && styles.formatButtonTextActive]}>
                    PDF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatButton, selectedFormat === 'excel' && styles.formatButtonActive]}
                  onPress={() => setSelectedFormat('excel')}
                >
                  <FileSpreadsheet size={20} color={selectedFormat === 'excel' ? theme.colors.primary.DEFAULT : '#6B7280'} />
                  <Text style={[styles.formatButtonText, selectedFormat === 'excel' && styles.formatButtonTextActive]}>
                    Excel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filtre par classe (optionnel) */}
            {classes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Filtrer par classe (optionnel)</Text>
                <View style={styles.classesContainer}>
                  <TouchableOpacity
                    style={[styles.classeChip, !selectedClasseId && styles.classeChipActive]}
                    onPress={() => setSelectedClasseId(undefined)}
                  >
                    <Text style={[styles.classeChipText, !selectedClasseId && styles.classeChipTextActive]}>
                      Toutes les classes
                    </Text>
                  </TouchableOpacity>
                  {classes.map((classe) => (
                    <TouchableOpacity
                      key={classe.id}
                      style={[styles.classeChip, selectedClasseId === classe.id && styles.classeChipActive]}
                      onPress={() => setSelectedClasseId(classe.id)}
                    >
                      <Text style={[styles.classeChipText, selectedClasseId === classe.id && styles.classeChipTextActive]}>
                        {classe.nom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedClasseId && selectedClasseNom && (
                  <Text style={styles.filterInfo}>Rapport limité à la classe {selectedClasseNom}</Text>
                )}
              </View>
            )}

            {/* Options supplémentaires */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Options supplémentaires</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Inclure le tableau d'honneur</Text>
                <Switch
                  value={inclureTableauHonneur}
                  onValueChange={setInclureTableauHonneur}
                  trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
                  thumbColor={inclureTableauHonneur ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
            </View>
          </ScrollView>

          {/* Boutons d'action */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.generateButton, loading && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.generateButtonText}>Générer</Text>
                  {selectedFormat === 'pdf' ? (
                    <FileText size={16} color="#FFFFFF" />
                  ) : (
                    <FileSpreadsheet size={16} color="#FFFFFF" />
                  )}
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
    maxHeight: '85%',
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
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    maxHeight: 500,
  },
  infoSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    marginVertical: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formatButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  formatButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
  },
  classesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  classeChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  classeChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  classeChipTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  filterInfo: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
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
    borderRadius: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});