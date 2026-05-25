// /home/project/components/notes/ExportPreviewModal.tsx
// Modal de prévisualisation des données avant export

import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Eye, Download } from 'lucide-react-native';
import { ExportParams } from '@/hooks/useNotesExport';
import theme from '@/constants/theme';

interface ExportPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  previewData: any;
  isLoading: boolean;
  title: string;
}

export default function ExportPreviewModal({
  visible,
  onClose,
  onExport,
  previewData,
  isLoading,
  title,
}: ExportPreviewModalProps) {
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);

  useEffect(() => {
    if (previewData && previewData.eleves) {
      // Pour l'export par classe
      const eleves = previewData.eleves.slice(0, 5);
      setPreviewRows(eleves);
      setPreviewHeaders(['Rang', 'Matricule', 'Nom', 'Prénom', 'Moyenne', 'Appréciation']);
    } else if (previewData && previewData.eleves && previewData.matiereNom) {
      // Pour l'export par matière
      const eleves = previewData.eleves.slice(0, 5);
      setPreviewRows(eleves);
      setPreviewHeaders(['Rang', 'Matricule', 'Nom', 'Prénom', 'Note', 'Appréciation']);
    } else if (previewData && previewData.classesStats) {
      // Pour l'export par période
      const classes = previewData.classesStats.slice(0, 5);
      setPreviewRows(classes);
      setPreviewHeaders(['Classe', 'Effectif', 'Moyenne', 'Rang', 'Taux réussite']);
    } else if (previewData && previewData.eleves && previewData.seuilMoyenne) {
      // Pour le tableau d'honneur
      const eleves = previewData.eleves.slice(0, 5);
      setPreviewRows(eleves);
      setPreviewHeaders(['Rang', 'Classe', 'Nom', 'Prénom', 'Moyenne', 'Mention']);
    }
  }, [previewData]);

  const renderPreviewRow = (row: any, index: number) => {
    if (previewHeaders.includes('Moyenne') && !previewHeaders.includes('Note')) {
      // Export par classe
      return (
        <View key={index} style={styles.previewRow}>
          <Text style={[styles.previewCell, styles.rangCell]}>{row.rang}</Text>
          <Text style={[styles.previewCell, styles.matriculeCell]} numberOfLines={1}>{row.matricule}</Text>
          <Text style={[styles.previewCell, styles.nomCell]}>{row.nom}</Text>
          <Text style={[styles.previewCell, styles.prenomCell]}>{row.prenom}</Text>
          <Text style={[styles.previewCell, styles.moyenneCell]}>{row.moyenneGenerale}</Text>
          <Text style={[styles.previewCell, styles.appreciationCell]}>{row.appreciation}</Text>
        </View>
      );
    } else if (previewHeaders.includes('Note')) {
      // Export par matière
      return (
        <View key={index} style={styles.previewRow}>
          <Text style={[styles.previewCell, styles.rangCell]}>{row.rang}</Text>
          <Text style={[styles.previewCell, styles.matriculeCell]} numberOfLines={1}>{row.matricule}</Text>
          <Text style={[styles.previewCell, styles.nomCell]}>{row.nom}</Text>
          <Text style={[styles.previewCell, styles.prenomCell]}>{row.prenom}</Text>
          <Text style={[styles.previewCell, styles.noteCell]}>{row.note}</Text>
          <Text style={[styles.previewCell, styles.appreciationCell]}>{row.appreciation}</Text>
        </View>
      );
    } else if (previewHeaders.includes('Classe')) {
      // Export par période
      return (
        <View key={index} style={styles.previewRow}>
          <Text style={[styles.previewCell, styles.classeCell]}>{row.nom}</Text>
          <Text style={[styles.previewCell, styles.effectifCell]}>{row.effectif}</Text>
          <Text style={[styles.previewCell, styles.moyenneCell]}>{row.moyenneGenerale}</Text>
          <Text style={[styles.previewCell, styles.rangCell]}>{row.rang}</Text>
          <Text style={[styles.previewCell, styles.tauxCell]}>{row.tauxReussite}%</Text>
        </View>
      );
    } else if (previewHeaders.includes('Mention')) {
      // Tableau d'honneur
      return (
        <View key={index} style={styles.previewRow}>
          <Text style={[styles.previewCell, styles.rangCell]}>{row.rang}</Text>
          <Text style={[styles.previewCell, styles.classeCell]}>{row.classe}</Text>
          <Text style={[styles.previewCell, styles.nomCell]}>{row.nom}</Text>
          <Text style={[styles.previewCell, styles.prenomCell]}>{row.prenom}</Text>
          <Text style={[styles.previewCell, styles.moyenneCell]}>{row.moyenne}</Text>
          <Text style={[styles.previewCell, styles.mentionCell]}>{row.mention}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Eye size={20} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.modalTitle}>Aperçu - {title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
              <Text style={styles.loadingText}>Chargement de l'aperçu...</Text>
            </View>
          ) : previewRows.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune donnée à afficher</Text>
              <Text style={styles.emptySubtext}>Sélectionnez des filtres pour visualiser les données</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* En-tête */}
                  <View style={styles.previewHeader}>
                    {previewHeaders.map((header, idx) => (
                      <Text key={idx} style={[styles.headerCell, styles[`${header.toLowerCase()}Cell`]]}>
                        {header}
                      </Text>
                    ))}
                  </View>
                  {/* Lignes */}
                  <ScrollView style={styles.previewBody} showsVerticalScrollIndicator={false}>
                    {previewRows.map((row, idx) => renderPreviewRow(row, idx))}
                  </ScrollView>
                </View>
              </ScrollView>
              <Text style={styles.previewNote}>
                Affichage des 5 premiers résultats sur {previewData?.eleves?.length || previewData?.classesStats?.length || 0} ligne(s)
              </Text>
            </>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={onExport}>
              <Download size={18} color="#FFFFFF" />
              <Text style={styles.exportText}>Exporter</Text>
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  previewHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  previewBody: {
    maxHeight: 300,
  },
  previewRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  previewCell: {
    fontSize: 11,
    color: '#1F2937',
  },
  rangCell: { width: 40, textAlign: 'center' },
  matriculeCell: { width: 100 },
  nomCell: { width: 80 },
  prenomCell: { width: 80 },
  moyenneCell: { width: 60, textAlign: 'center' },
  noteCell: { width: 50, textAlign: 'center' },
  appreciationCell: { width: 80, textAlign: 'center' },
  classeCell: { width: 120 },
  effectifCell: { width: 60, textAlign: 'center' },
  tauxCell: { width: 80, textAlign: 'center' },
  mentionCell: { width: 100, textAlign: 'center' },
  previewNote: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});