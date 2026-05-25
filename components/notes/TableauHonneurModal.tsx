// /home/project/components/notes/TableauHonneurModal.tsx
// Modal pour la génération du tableau d'honneur

import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { X, FileText, FileSpreadsheet, Crown } from 'lucide-react-native';
import { Periode } from '@/types/notes.types';
import theme from '@/constants/theme';

interface TableauHonneurModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (params: any) => Promise<void>;
  etablissementId: string;
  anneeScolaireId: string;
  periode: Periode;
  classes: { id: string; nom: string }[];
  isSubscribed: boolean;
}

export default function TableauHonneurModal({
  visible,
  onClose,
  onGenerate,
  etablissementId,
  anneeScolaireId,
  periode,
  classes,
  isSubscribed,
}: TableauHonneurModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>('pdf');
  const [selectedClasseId, setSelectedClasseId] = useState<string | undefined>(undefined);
  const [seuilMoyenne, setSeuilMoyenne] = useState<number>(14);
  const [topN, setTopN] = useState<number>(5);
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
        seuilMoyenne,
        topN,
      });
      onClose();
    } catch (error) {
      console.error('Error generating tableau honneur:', error);
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
            <View style={styles.headerLeft}>
              <Crown size={20} color="#F59E0B" />
              <Text style={styles.modalTitle}>🏆 Tableau d'honneur</Text>
            </View>
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
              </View>
            )}

            {/* Paramètres */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Paramètres</Text>
              
              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Seuil minimum</Text>
                <View style={styles.paramButtons}>
                  {[12, 13, 14, 15, 16].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.paramButton, seuilMoyenne === value && styles.paramButtonActive]}
                      onPress={() => setSeuilMoyenne(value)}
                    >
                      <Text style={[styles.paramButtonText, seuilMoyenne === value && styles.paramButtonTextActive]}>
                        {value}/20
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Nombre d'élèves</Text>
                <View style={styles.paramButtons}>
                  {[3, 5, 10, 15, 20].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.paramButton, topN === value && styles.paramButtonActive]}
                      onPress={() => setTopN(value)}
                    >
                      <Text style={[styles.paramButtonText, topN === value && styles.paramButtonTextActive]}>
                        Top {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Résumé */}
            <View style={styles.summarySection}>
              <Text style={styles.summaryText}>
                {selectedClasseNom 
                  ? `Tableau d'honneur de la classe ${selectedClasseNom}`
                  : `Tableau d'honneur de l'établissement`}
              </Text>
              <Text style={styles.summarySubtext}>
                Seuil: ≥ {seuilMoyenne}/20 | Top {topN} élèves
              </Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  paramRow: {
    marginBottom: 16,
  },
  paramLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  paramButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paramButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paramButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  paramButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  paramButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  summarySection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 11,
    color: '#B45309',
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