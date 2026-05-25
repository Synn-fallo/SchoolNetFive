// /home/project/components/enseignant/ImportCSVModal.tsx
// Modal d'import CSV avec aperçu et validation

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { Card } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { previewCSV, ImportPreview, importClassesFromCSV } from '@/utils/importCSV';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import theme from '@/constants/theme';

interface ImportCSVModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  enseignantId: string;
}

export default function ImportCSVModal({
  visible,
  onClose,
  onSuccess,
  enseignantId
}: ImportCSVModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'result'>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true
      });
      
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        const fileObj = new File([file.uri], file.name, { type: 'text/csv' });
        setSelectedFile(fileObj);
        
        setLoading(true);
        const previewData = await previewCSV(fileObj);
        setPreview(previewData);
        setStep('preview');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setStep('importing');
    const result = await importClassesFromCSV(selectedFile, enseignantId, supabase);
    setImportResult(result);
    setStep('result');
    
    // Journaliser l'import
    await supabase.from('import_logs').insert({
      user_id: enseignantId,
      type: 'classes',
      filename: selectedFile.name,
      rows_total: result.rowsTotal,
      rows_imported: result.rowsImported,
      rows_skipped: result.rowsSkipped,
      status: result.success ? (result.rowsSkipped > 0 ? 'partial' : 'success') : 'failed',
      error_message: result.errors.join(', '),
      metadata: { warnings: result.warnings }
    });
  };

  const handleClose = () => {
    setStep('select');
    setSelectedFile(null);
    setPreview(null);
    setImportResult(null);
    onClose();
    if (importResult?.success) {
      onSuccess();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Importer des classes (CSV)</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <XCircle size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {step === 'select' && (
            <View style={styles.selectContainer}>
              <TouchableOpacity style={styles.uploadButton} onPress={handlePickFile}>
                <Upload size={48} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.uploadText}>Sélectionner un fichier CSV</Text>
                <Text style={styles.uploadSubtext}>
                  Format attendu : nom, description, matieres, eleves
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'preview' && preview && (
            <View>
              <Card style={styles.previewCard}>
                <Text style={styles.previewTitle}>Aperçu du fichier</Text>
                <Text style={styles.previewStats}>
                  {preview.totalRows} ligne(s) trouvée(s)
                </Text>
                <Text style={styles.previewHeaders}>
                  En-têtes : {preview.headers.join(', ')}
                </Text>
                
                <Text style={styles.sampleTitle}>Aperçu des données :</Text>
                {preview.sampleRows.map((row, idx) => (
                  <View key={idx} style={styles.sampleRow}>
                    <Text style={styles.sampleText}>
                      {JSON.stringify(row, null, 2)}
                    </Text>
                  </View>
                ))}
              </Card>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setStep('select')}
                >
                  <Text style={styles.cancelButtonText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleImport}
                >
                  <Text style={styles.confirmButtonText}>Importer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 'importing' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
              <Text style={styles.loadingText}>Import en cours...</Text>
            </View>
          )}

          {step === 'result' && importResult && (
            <View>
              <Card style={styles.resultCard}>
                {importResult.success ? (
                  <CheckCircle size={48} color="#10B981" style={styles.resultIcon} />
                ) : (
                  <AlertCircle size={48} color="#EF4444" style={styles.resultIcon} />
                )}
                
                <Text style={styles.resultTitle}>
                  {importResult.success ? 'Import réussi' : 'Échec de l\'import'}
                </Text>
                
                <Text style={styles.resultStats}>
                  {importResult.rowsImported} ligne(s) importée(s)
                </Text>
                {importResult.rowsSkipped > 0 && (
                  <Text style={styles.resultWarning}>
                    {importResult.rowsSkipped} ligne(s) ignorée(s)
                  </Text>
                )}
                
                {importResult.errors.length > 0 && (
                  <View style={styles.errorsContainer}>
                    <Text style={styles.errorsTitle}>Erreurs :</Text>
                    {importResult.errors.map((err: string, idx: number) => (
                      <Text key={idx} style={styles.errorText}>• {err}</Text>
                    ))}
                  </View>
                )}
                
                {importResult.warnings.length > 0 && (
                  <View style={styles.warningsContainer}>
                    <Text style={styles.warningsTitle}>Avertissements :</Text>
                    {importResult.warnings.slice(0, 5).map((warn: string, idx: number) => (
                      <Text key={idx} style={styles.warningText}>• {warn}</Text>
                    ))}
                  </View>
                )}
              </Card>
              
              <TouchableOpacity style={styles.closeResultButton} onPress={handleClose}>
                <Text style={styles.closeResultText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  selectContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
    marginTop: 16,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  previewCard: {
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  previewStats: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  previewHeaders: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  sampleRow: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 11,
    color: '#4B5563',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  resultCard: {
    padding: 24,
    alignItems: 'center',
  },
  resultIcon: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  resultStats: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  resultWarning: {
    fontSize: 14,
    color: '#F59E0B',
    marginBottom: 16,
  },
  errorsContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    marginBottom: 4,
  },
  warningsContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: 4,
  },
  closeResultButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeResultText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});