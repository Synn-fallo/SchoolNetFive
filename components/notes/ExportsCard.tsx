// /home/project/components/notes/ExportsCard.tsx
// Carte des exports PDF/Excel par classe, matière, période
// Version finale – tous les boutons fonctionnels

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Settings, ChevronDown, Eye } from 'lucide-react-native';
import { ExportOptions } from '@/types/export.types';
import ExportPreviewModal from './ExportPreviewModal';
import theme from '@/constants/theme';

interface ExportsCardProps {
  onExportClasse: (classeId: string, format: 'pdf' | 'excel', options?: Partial<ExportOptions>) => Promise<void>;
  onExportMatiere: (matiereId: string, format: 'pdf' | 'excel', options?: Partial<ExportOptions>) => Promise<void>;
  onExportPeriode: (periodeId: string, periodeLabel: string, format: 'pdf' | 'excel', options?: Partial<ExportOptions>) => Promise<void>;
  onOpenOptions: (type: 'classe' | 'matiere' | 'periode', id?: string, nom?: string) => void;
  classes: { id: string; nom: string }[];
  matieres: { id: string; nom: string }[];
  selectedPeriodeId: string;
  selectedPeriodeLabel: string;
  isSubscribed: boolean;
  etablissementId: string;
  anneeScolaireId: string;
  getPreviewData: (params: any) => Promise<any>;
}

export default function ExportsCard({
  onExportClasse,
  onExportMatiere,
  onExportPeriode,
  onOpenOptions,
  classes,
  matieres,
  selectedPeriodeId,
  selectedPeriodeLabel,
  isSubscribed,
  etablissementId,
  anneeScolaireId,
  getPreviewData,
}: ExportsCardProps) {
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [selectedClasseId, setSelectedClasseId] = useState<string | null>(null);
  const [selectedMatiereId, setSelectedMatiereId] = useState<string | null>(null);
  const [showClasseSelector, setShowClasseSelector] = useState(false);
  const [showMatiereSelector, setShowMatiereSelector] = useState(false);
  
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewType, setPreviewType] = useState<'classe' | 'matiere' | 'periode'>('classe');
  const [previewTitle, setPreviewTitle] = useState('');

  const handleExport = async (type: string, id: string | null, format: 'pdf' | 'excel') => {
    if (!isSubscribed) {
      Alert.alert('Abonnement requis', 'L\'export nécessite un abonnement actif.');
      return;
    }

    setExportingType(`${type}_${format}`);
    try {
      if (type === 'classe' && id) {
        await onExportClasse(id, format);
        Alert.alert('Succès', `Export ${format.toUpperCase()} de la classe généré`);
      } else if (type === 'matiere' && id) {
        if (!selectedClasseId) {
          Alert.alert('Erreur', 'Veuillez d\'abord sélectionner une classe');
          return;
        }
        await onExportMatiere(id, format);
        Alert.alert('Succès', `Export ${format.toUpperCase()} de la matière généré`);
      } else if (type === 'periode') {
        if (!selectedPeriodeId) {
          Alert.alert('Erreur', 'Aucune période sélectionnée');
          return;
        }
        await onExportPeriode(selectedPeriodeId, selectedPeriodeLabel, format);
        Alert.alert('Succès', `Export ${format.toUpperCase()} de la période généré`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', 'L\'export a échoué');
    } finally {
      setExportingType(null);
    }
  };

  const handleOpenOptions = (type: 'classe' | 'matiere' | 'periode', id?: string, nom?: string) => {
    if (!isSubscribed) {
      Alert.alert('Abonnement requis', 'Les options d\'export nécessitent un abonnement actif.');
      return;
    }
    onOpenOptions(type, id, nom);
  };

  const handlePreview = async (type: 'classe' | 'matiere' | 'periode', id?: string, nom?: string) => {
    if (!isSubscribed) {
      Alert.alert('Abonnement requis', 'L\'aperçu nécessite un abonnement actif.');
      return;
    }

    setPreviewLoading(true);
    setPreviewVisible(true);
    setPreviewType(type);
    setPreviewTitle(nom || (type === 'periode' ? selectedPeriodeLabel : ''));

    try {
      let params: any = {
        type: type === 'classe' ? 'eleves' : type === 'matiere' ? 'matieres' : 'rapport',
        etablissementId,
        anneeScolaireId,
        periode: selectedPeriodeId,
        format: 'excel',
      };

      if (type === 'classe' && id) {
        params.classeId = id;
        params.classeNom = nom;
      } else if (type === 'matiere' && id) {
        params.matiereId = id;
        params.matiereNom = nom;
        params.classeId = selectedClasseId;
        params.classeNom = getSelectedClasseNom();
      }

      const data = await getPreviewData(params);
      setPreviewData(data);
    } catch (error) {
      console.error('Preview error:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'aperçu.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const getSelectedClasseNom = () => {
    const classe = classes.find(c => c.id === selectedClasseId);
    return classe?.nom || 'Sélectionner une classe';
  };

  const getSelectedMatiereNom = () => {
    const matiere = matieres.find(m => m.id === selectedMatiereId);
    return matiere?.nom || 'Sélectionner une matière';
  };

  const handleExportAfterPreview = () => {
    setPreviewVisible(false);
    if (previewType === 'classe' && selectedClasseId) {
      handleExport('classe', selectedClasseId, 'excel');
    } else if (previewType === 'matiere' && selectedMatiereId && selectedClasseId) {
      handleExport('matiere', selectedMatiereId, 'excel');
    } else if (previewType === 'periode') {
      handleExport('periode', null, 'excel');
    }
  };

  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📎 Exports</Text>
        <View style={styles.disabledCard}>
          <Download size={20} color="#9CA3AF" />
          <Text style={styles.disabledText}>Abonnement requis pour exporter</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📎 Exports</Text>

      {/* Export par classe */}
      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Par classe</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowClasseSelector(true)}
        >
          <Text style={styles.selectorText}>{getSelectedClasseNom()}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.excelButton]}
            onPress={() => handleExport('classe', selectedClasseId, 'excel')}
            disabled={!selectedClasseId || exportingType !== null}
          >
            {exportingType === 'classe_excel' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><FileSpreadsheet size={16} color="#FFFFFF" /><Text style={styles.actionButtonText}>Excel</Text></>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.pdfButton]}
            onPress={() => handleExport('classe', selectedClasseId, 'pdf')}
            disabled={!selectedClasseId || exportingType !== null}
          >
            {exportingType === 'classe_pdf' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><FileText size={16} color="#FFFFFF" /><Text style={styles.actionButtonText}>PDF</Text></>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => handlePreview('classe', selectedClasseId || undefined, getSelectedClasseNom())}
            disabled={!selectedClasseId}
          >
            <Eye size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.previewButtonText}>Aperçu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => handleOpenOptions('classe', selectedClasseId || undefined, getSelectedClasseNom())}
            disabled={!selectedClasseId}
          >
            <Settings size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.optionsButtonText}>Options</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Export par matière */}
      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Par matière</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowMatiereSelector(true)}
        >
          <Text style={styles.selectorText}>{getSelectedMatiereNom()}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.excelButton]}
            onPress={() => handleExport('matiere', selectedMatiereId, 'excel')}
            disabled={!selectedMatiereId || !selectedClasseId || exportingType !== null}
          >
            {exportingType === 'matiere_excel' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><FileSpreadsheet size={16} color="#FFFFFF" /><Text style={styles.actionButtonText}>Excel</Text></>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.pdfButton]}
            onPress={() => handleExport('matiere', selectedMatiereId, 'pdf')}
            disabled={!selectedMatiereId || !selectedClasseId || exportingType !== null}
          >
            {exportingType === 'matiere_pdf' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><FileText size={16} color="#FFFFFF" /><Text style={styles.actionButtonText}>PDF</Text></>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => handlePreview('matiere', selectedMatiereId || undefined, getSelectedMatiereNom())}
            disabled={!selectedMatiereId || !selectedClasseId}
          >
            <Eye size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.previewButtonText}>Aperçu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => handleOpenOptions('matiere', selectedMatiereId || undefined, getSelectedMatiereNom())}
            disabled={!selectedMatiereId}
          >
            <Settings size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.optionsButtonText}>Options</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Export par période */}
      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Par période</Text>
        <View style={styles.periodInfo}>
          <Text style={styles.periodText}>{selectedPeriodeLabel || 'Aucune période sélectionnée'}</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.excelButton, !selectedPeriodeId && styles.actionButtonDisabled]}
            onPress={() => handleExport('periode', null, 'excel')}
            disabled={!selectedPeriodeId || exportingType !== null}
          >
            {exportingType === 'periode_excel' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><FileSpreadsheet size={16} color="#FFFFFF" /><Text style={styles.actionButtonText}>Excel complet</Text></>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.pdfButton, !selectedPeriodeId && styles.actionButtonDisabled]}
            onPress={() => handleExport('periode', null, 'pdf')}
            disabled={!selectedPeriodeId || exportingType !== null}
          >
            {exportingType === 'periode_pdf' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><FileText size={16} color="#FFFFFF" /><Text style={styles.actionButtonText}>PDF complet</Text></>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => handlePreview('periode', undefined, selectedPeriodeLabel)}
            disabled={!selectedPeriodeId}
          >
            <Eye size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.previewButtonText}>Aperçu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => handleOpenOptions('periode')}
          >
            <Settings size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.optionsButtonText}>Options</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <Modal visible={showClasseSelector} transparent animationType="fade" onRequestClose={() => setShowClasseSelector(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une classe</Text>
              <TouchableOpacity onPress={() => setShowClasseSelector(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <FlatList data={classes} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <TouchableOpacity style={[styles.modalOption, selectedClasseId === item.id && styles.modalOptionActive]} onPress={() => { setSelectedClasseId(item.id); setShowClasseSelector(false); }}>
                <Text style={[styles.modalOptionText, selectedClasseId === item.id && styles.modalOptionTextActive]}>{item.nom}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>

      <Modal visible={showMatiereSelector} transparent animationType="fade" onRequestClose={() => setShowMatiereSelector(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une matière</Text>
              <TouchableOpacity onPress={() => setShowMatiereSelector(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <FlatList data={matieres} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <TouchableOpacity style={[styles.modalOption, selectedMatiereId === item.id && styles.modalOptionActive]} onPress={() => { setSelectedMatiereId(item.id); setShowMatiereSelector(false); }}>
                <Text style={[styles.modalOptionText, selectedMatiereId === item.id && styles.modalOptionTextActive]}>{item.nom}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>

      <ExportPreviewModal visible={previewVisible} onClose={() => setPreviewVisible(false)} onExport={handleExportAfterPreview} previewData={previewData} isLoading={previewLoading} title={previewTitle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  exportSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: '#6B7280', marginBottom: 10 },
  selectorButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  selectorText: { fontSize: 14, color: '#1F2937' },
  periodInfo: { marginBottom: 12 },
  periodText: { fontSize: 14, fontWeight: '500', color: theme.colors.primary.DEFAULT },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  actionButtonDisabled: { opacity: 0.5 },
  excelButton: { backgroundColor: '#10B981' },
  pdfButton: { backgroundColor: theme.colors.primary.DEFAULT },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  previewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  previewButtonText: { fontSize: 12, fontWeight: '500', color: theme.colors.primary.DEFAULT },
  optionsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  optionsButtonText: { fontSize: 12, fontWeight: '500', color: theme.colors.primary.DEFAULT },
  disabledCard: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  disabledText: { fontSize: 13, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxHeight: '70%', backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  modalClose: { fontSize: 18, color: '#6B7280', padding: 4 },
  modalOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionActive: { backgroundColor: '#EFF6FF' },
  modalOptionText: { fontSize: 15, color: '#1F2937' },
  modalOptionTextActive: { color: theme.colors.primary.DEFAULT, fontWeight: '500' },
});