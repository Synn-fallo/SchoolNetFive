// /home/project/components/parametres/OngletNotes.tsx
// Version refactorée avec sections accordéon

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Upload, Download } from 'lucide-react-native';
import { useCoefficientsPeriode } from '@/hooks/useCoefficientsPeriode';
import { useSeuilsAppreciation } from '@/hooks/useSeuilsAppreciation';
import { useClasses } from '@/hooks/useClasses';
import { supabase } from '@/lib/supabase';
import CollapsibleSection from './CollapsibleSection';
import ExportCoefficientsModal from './ExportCoefficientsModal';
import ImportCoefficientsModal from './ImportCoefficientsModal';
import theme from '@/constants/theme';

interface OngletNotesProps {
  etablissementId: string;
}

export default function OngletNotes({ etablissementId }: OngletNotesProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('coefficients');
  
  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([]);
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  const [showCoeffModal, setShowCoeffModal] = useState(false);
  const [coeffValue, setCoeffValue] = useState('');
  const [coeffType, setCoeffType] = useState<'regulier' | 'examen'>('regulier');
  const [coeffMatiereId, setCoeffMatiereId] = useState<string>('');
  const [coeffMatiereNom, setCoeffMatiereNom] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const {
    coefficients,
    loading: coeffLoading,
    loadCoefficients,
    getCurrentCoefficient,
    addCoefficient,
    deleteCoefficient,
    refresh,
    exportCoefficientsToClasses,
    importCoefficientsFromClass,
  } = useCoefficientsPeriode();

  const { classes: allClasses, loadClasses } = useClasses();
  const { seuils, loadSeuils } = useSeuilsAppreciation();

  useEffect(() => {
    loadInitialData();
  }, [etablissementId]);

  const loadInitialData = async () => {
    try {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, nom')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true)
        .order('nom', { ascending: true });

      if (classesData) {
        setClasses(classesData);
        if (classesData.length > 0 && !selectedClasseId) {
          setSelectedClasseId(classesData[0].id);
        }
      }

      const { data: matieresData } = await supabase
        .from('matieres')
        .select('id, nom')
        .eq('etablissement_id', etablissementId)
        .order('nom', { ascending: true });

      if (matieresData) {
        setMatieres(matieresData);
      }

      await loadClasses(etablissementId);
      await loadCoefficients(etablissementId);
      await loadSeuils(etablissementId);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSaveCoefficient = async () => {
    if (!coeffMatiereId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une matière');
      return;
    }

    const valeur = parseFloat(coeffValue);
    if (isNaN(valeur) || valeur <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une valeur valide (ex: 4)');
      return;
    }

    const success = await addCoefficient(selectedClasseId, coeffMatiereId, coeffType, valeur);
    if (success) {
      Alert.alert('Succès', `Coefficient ${isEditing ? 'modifié' : 'ajouté'} avec succès`);
      setShowCoeffModal(false);
      setCoeffValue('');
      setIsEditing(false);
      await refresh(etablissementId);
    } else {
      Alert.alert('Erreur', 'Impossible d\'enregistrer le coefficient');
    }
  };

  const handleDeleteCoefficient = async (id: string) => {
    Alert.alert('Confirmation', 'Supprimer ce coefficient ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteCoefficient(id);
          if (success) {
            Alert.alert('Succès', 'Coefficient supprimé');
            await refresh(etablissementId);
          }
        },
      },
    ]);
  };

  const openCoeffModal = (matiereId: string, matiereNom: string, type: 'regulier' | 'examen') => {
    const currentValue = getCurrentCoefficient(selectedClasseId, matiereId, type);
    setCoeffMatiereId(matiereId);
    setCoeffMatiereNom(matiereNom);
    setCoeffType(type);
    setCoeffValue(currentValue !== null ? currentValue.toString() : '');
    setIsEditing(currentValue !== null);
    setShowCoeffModal(true);
  };

  const getCurrentCoeffValue = (matiereId: string, type: 'regulier' | 'examen'): number | null => {
    return getCurrentCoefficient(selectedClasseId, matiereId, type);
  };

  const handleExport = async (targetClasseIds: string[]) => {
    const result = await exportCoefficientsToClasses(selectedClasseId, targetClasseIds);
    if (result.success) {
      Alert.alert('Succès', result.message);
      await refresh(etablissementId);
    } else {
      Alert.alert('Erreur', result.message);
    }
  };

  const handleImport = async (sourceClasseId: string) => {
    const result = await importCoefficientsFromClass(selectedClasseId, sourceClasseId);
    if (result.success) {
      Alert.alert('Succès', result.message);
      await refresh(etablissementId);
    } else {
      Alert.alert('Erreur', result.message);
    }
  };

  const currentClasse = classes.find(c => c.id === selectedClasseId);

  // Gestion de l'accordéon
  const handleExpandChange = (sectionId: string, expanded: boolean) => {
    if (expanded) {
      setExpandedSection(sectionId);
    } else if (expandedSection === sectionId) {
      setExpandedSection(null);
    }
  };

  // Trier les matières par ordre alphabétique
  const matieresTriees = [...matieres].sort((a, b) => a.nom.localeCompare(b.nom));

  // Rendu de la section des coefficients
  const renderCoefficientsSection = () => (
    <CollapsibleSection
      title="Coefficients par matière"
      icon={<Edit2 size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'coefficients'}
      onExpandChange={(expanded) => handleExpandChange('coefficients', expanded)}
    >
      {/* Sélecteur de classe */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Classe :</Text>
        <View style={styles.pickerContainer}>
          <select
            style={styles.picker}
            value={selectedClasseId}
            onChange={(e) => setSelectedClasseId(e.target.value)}
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </View>
      </View>

      {!selectedClasseId ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Veuillez sélectionner une classe</Text>
        </View>
      ) : (
        <>
          {/* Boutons Exporter / Importer */}
          <View style={styles.exportImportContainer}>
            <TouchableOpacity
              style={[styles.exportImportButton, styles.exportButton]}
              onPress={() => setShowExportModal(true)}
            >
              <Download size={16} color="#FFFFFF" />
              <Text style={styles.exportImportButtonText}>Exporter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportImportButton, styles.importButton]}
              onPress={() => setShowImportModal(true)}
            >
              <Upload size={16} color="#FFFFFF" />
              <Text style={styles.exportImportButtonText}>Importer</Text>
            </TouchableOpacity>
          </View>

          {/* Tableau des coefficients */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.matiereHeader]}>Matière</Text>
              <Text style={[styles.tableHeaderCell, styles.coeffHeader]}>Régulier</Text>
              <Text style={[styles.tableHeaderCell, styles.coeffHeader]}>Examen</Text>
              <Text style={[styles.tableHeaderCell, styles.actionsHeader]}>Actions</Text>
            </View>

            {matieresTriees.map(matiere => {
              const regulierValue = getCurrentCoeffValue(matiere.id, 'regulier');
              const examenValue = getCurrentCoeffValue(matiere.id, 'examen');

              return (
                <View key={matiere.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.matiereCell]}>{matiere.nom}</Text>
                  <Text style={[styles.tableCell, styles.coeffCell]}>
                    {regulierValue !== null ? regulierValue : '—'}
                  </Text>
                  <Text style={[styles.tableCell, styles.coeffCell]}>
                    {examenValue !== null ? examenValue : '—'}
                  </Text>
                  <View style={[styles.tableCell, styles.actionsCell]}>
                    <TouchableOpacity
                      onPress={() => openCoeffModal(matiere.id, matiere.nom, 'regulier')}
                      style={styles.actionIcon}
                    >
                      <Edit2 size={16} color={theme.colors.primary.DEFAULT} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Message d'aide */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              💡 Cliquez sur l'icône ✏️ pour modifier le coefficient d'une matière.
              {'\n'}Utilisez Exporter/Importer pour copier les coefficients vers d'autres classes.
            </Text>
          </View>
        </>
      )}
    </CollapsibleSection>
  );

  // Section Seuils d'appréciation (à implémenter plus tard si besoin)
  const renderSeuilsSection = () => (
    <CollapsibleSection
      title="Seuils d'appréciation"
      icon={<Edit2 size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'seuils'}
      onExpandChange={(expanded) => handleExpandChange('seuils', expanded)}
    >
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>
          Configuration des seuils d'appréciation (à venir)
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  if (coeffLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderCoefficientsSection()}
      {renderSeuilsSection()}

      {/* Modals (inchangés) */}
      <ExportCoefficientsModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        classes={classes}
        currentClasseId={selectedClasseId}
        currentClasseNom={currentClasse?.nom || ''}
        onExport={handleExport}
      />

      <ImportCoefficientsModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        classes={classes}
        currentClasseId={selectedClasseId}
        currentClasseNom={currentClasse?.nom || ''}
        onImport={handleImport}
      />

      {/* Modal d'ajout/modification de coefficient */}
      <Modal visible={showCoeffModal} transparent animationType="fade" onRequestClose={() => setShowCoeffModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Modifier le coefficient' : 'Ajouter un coefficient'} – {coeffMatiereNom}
              </Text>
              <TouchableOpacity onPress={() => setShowCoeffModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Type d'évaluation</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeButton, coeffType === 'regulier' && styles.typeButtonActive]}
                  onPress={() => setCoeffType('regulier')}
                >
                  <Text style={[styles.typeButtonText, coeffType === 'regulier' && styles.typeButtonTextActive]}>
                    Régulier
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, coeffType === 'examen' && styles.typeButtonActive]}
                  onPress={() => setCoeffType('examen')}
                >
                  <Text style={[styles.typeButtonText, coeffType === 'examen' && styles.typeButtonTextActive]}>
                    Examen
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Valeur du coefficient</Text>
              <TextInput
                style={styles.modalInput}
                value={coeffValue}
                onChangeText={setCoeffValue}
                placeholder="Ex: 4"
                keyboardType="numeric"
              />

              {isEditing && (
                <Text style={styles.hintText}>
                  💡 La modification créera un nouvel enregistrement. L'ancienne valeur restera dans l'historique.
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCoeffModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveCoefficient}>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveText}>{isEditing ? 'Modifier' : 'Ajouter'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  filterContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12 },
  filterLabel: { fontSize: 14, color: '#6B7280', width: 60 },
  pickerContainer: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF' },
  picker: { width: '100%', padding: 10, fontSize: 14, border: 'none', backgroundColor: 'transparent' },
  exportImportContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  exportImportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  exportButton: { backgroundColor: '#10B981' },
  importButton: { backgroundColor: '#3B82F6' },
  exportImportButtonText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  tableContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tableHeaderCell: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  matiereHeader: { flex: 2 },
  coeffHeader: { flex: 1, textAlign: 'center' },
  actionsHeader: { flex: 0.5, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  tableCell: { fontSize: 13, color: '#1F2937' },
  matiereCell: { flex: 2 },
  coeffCell: { flex: 1, textAlign: 'center' },
  actionsCell: { flex: 0.5, alignItems: 'center' },
  actionIcon: { padding: 4 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  helpContainer: { marginTop: 16, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8 },
  helpText: { fontSize: 12, color: '#1E40AF', textAlign: 'center' },
  placeholderContainer: { padding: 40, alignItems: 'center' },
  placeholderText: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  comingSoonBadge: { alignSelf: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  comingSoonText: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  typeButtonActive: { backgroundColor: '#EFF6FF', borderColor: theme.colors.primary.DEFAULT },
  typeButtonText: { fontSize: 14, color: '#6B7280' },
  typeButtonTextActive: { color: theme.colors.primary.DEFAULT, fontWeight: '500' },
  modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16 },
  hintText: { fontSize: 11, color: '#6B7280', fontStyle: 'italic', marginTop: -8, marginBottom: 8 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  modalCancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8 },
  modalCancelText: { fontSize: 14, color: '#6B7280' },
  modalSaveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary.DEFAULT, paddingVertical: 12, borderRadius: 8 },
  modalSaveText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
});
