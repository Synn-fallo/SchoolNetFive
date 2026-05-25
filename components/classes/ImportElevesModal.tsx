import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useEleves } from '@/hooks/useEleves';
import { useEducMaster } from '@/hooks/useEducMaster';
import theme from '@/constants/theme';

interface ImportElevesModalProps {
  visible: boolean;
  onClose: () => void;
  classeId: string;
  etablissementId: string;
  onSuccess: () => void;
}

interface CSVRow {
  educmaster: string;
  nom: string;
  prenom: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
}

export default function ImportElevesModal({
  visible,
  onClose,
  classeId,
  etablissementId,
  onSuccess,
}: ImportElevesModalProps) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const { createEleve } = useEleves();
  const { generateIdentifiant } = useEducMaster();

  const parseCSV = (content: string): CSVRow[] => {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const requiredColumns = ['educmaster', 'nom', 'prenom'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`);
    }
    
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push({
        educmaster: row.educmaster,
        nom: row.nom.toUpperCase(),
        prenom: row.prenom,
        date_naissance: row.date_naissance,
        email: row.email,
        telephone: row.telephone,
      });
    }
    
    return rows;
  };

  const importEleves = async (rows: CSVRow[]) => {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    setProgress({ current: 0, total: rows.length });
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgress({ current: i + 1, total: rows.length });
      
      try {
        // Générer l'identifiant de connexion
        const result = await generateIdentifiant(row.nom, row.educmaster);
        if (!result.success) {
          errors.push(`Ligne ${i + 2}: ${result.error}`);
          errorCount++;
          continue;
        }
        
        // Créer l'élève
        const createResult = await createEleve(
          {
            etablissement_id: etablissementId,
            educmaster: row.educmaster,
            nom: row.nom,
            prenom: row.prenom,
            date_naissance: row.date_naissance,
            email: row.email,
            telephone: row.telephone,
            classe_id: classeId,
          },
          result.identifiant
        );
        
        if (!createResult.success) {
          errors.push(`Ligne ${i + 2}: ${createResult.error}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        errors.push(`Ligne ${i + 2}: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        errorCount++;
      }
    }
    
    return { successCount, errorCount, errors };
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) return;
      
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      
      setImporting(true);
      setError(null);
      
      const rows = parseCSV(content);
      
      if (rows.length === 0) {
        throw new Error('Aucune donnée trouvée dans le fichier');
      }
      
      const importResult = await importEleves(rows);
      
      if (importResult.errorCount > 0) {
        Alert.alert(
          'Import partiel',
          `${importResult.successCount} élèves importés avec succès\n${importResult.errorCount} échecs\n\n${importResult.errors.slice(0, 5).join('\n')}${importResult.errors.length > 5 ? `\n... et ${importResult.errors.length - 5} autres erreurs` : ''}`,
          [{ text: 'OK', onPress: () => onSuccess() }]
        );
      } else {
        Alert.alert('Succès', `${importResult.successCount} élèves importés avec succès`);
        onSuccess();
      }
      
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const getCSVTemplate = () => {
    const headers = ['educmaster', 'nom', 'prenom', 'date_naissance', 'email', 'telephone'];
    const example = ['108090199031', 'GANDO', 'Modeste', '1999-01-01', 'parent@email.com', '90123456'];
    return [headers.join(','), example.join(',')].join('\n');
  };

  const downloadTemplate = async () => {
    const template = getCSVTemplate();
    const date = new Date().toISOString().split('T')[0];
    const filename = `import_eleves_template_${date}.csv`;
    
    // Dans un environnement web, créer un blob et télécharger
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Importer des élèves</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.infoCard}>
              <FileText size={20} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.infoTitle}>Format du fichier CSV</Text>
              <Text style={styles.infoText}>
                Le fichier doit contenir les colonnes suivantes:
              </Text>
              <Text style={styles.infoCode}>
                educmaster,nom,prenom,date_naissance,email,telephone
              </Text>
              <Text style={styles.infoExample}>
                Exemple: 108090199031,GANDO,Modeste,1999-01-01,parent@email.com,90123456
              </Text>
            </View>

            <TouchableOpacity style={styles.templateButton} onPress={downloadTemplate}>
              <FileText size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.templateButtonText}>Télécharger le modèle CSV</Text>
            </TouchableOpacity>

            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {importing && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
                <Text style={styles.progressText}>
                  Import en cours... ({progress.current}/{progress.total})
                </Text>
              </View>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importButton, importing && styles.importButtonDisabled]}
              onPress={handleImportCSV}
              disabled={importing}
            >
              <Upload size={16} color="#FFFFFF" />
              <Text style={styles.importButtonText}>Importer CSV</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1F2937',
    marginBottom: 4,
  },
  infoCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: '#E5E7EB',
    padding: 6,
    borderRadius: 4,
    marginVertical: 6,
    color: '#1F2937',
  },
  infoExample: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginBottom: 16,
  },
  templateButtonText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
  importButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
  },
  importButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});