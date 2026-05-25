import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Upload, Download, FileSpreadsheet } from 'lucide-react-native';

interface NoteImportProps {
  devoirId: string;
  classeId: string;
  noteSur: number;
  onComplete?: () => void;
}

export default function NoteImport({ devoirId, classeId, noteSur, onComplete }: NoteImportProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);

  const downloadTemplate = () => {
    // Générer un fichier CSV/Excel template
    // Pour le MVP, on peut simplement alerter
    Alert.alert('Modèle Excel', 'Téléchargement du modèle à implémenter');
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setSelectedFile(result);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const uploadAndProcess = async () => {
    if (!selectedFile?.assets?.[0]) {
      Alert.alert('Fichier manquant', 'Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);

    try {
      // Upload du fichier vers Supabase Storage
      const file = selectedFile.assets[0];
      const fileName = `import_notes_${devoirId}_${Date.now()}.xlsx`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('imports')
        .upload(fileName, file.uri, {
          contentType: file.mimeType,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Appeler une Edge Function pour traiter le fichier
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/process-note-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          file_path: data?.path,
          devoir_id: devoirId,
          classe_id: classeId,
          note_sur: noteSur,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Succès', `${result.imported_count} notes importées avec succès`);
        if (onComplete) onComplete();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error importing notes:', error);
      Alert.alert('Erreur', 'Échec de l\'import des notes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <FileSpreadsheet size={24} color="#3B82F6" />
        <Text style={styles.title}>Import Excel</Text>
        <Text style={styles.description}>
          Importez les notes depuis un fichier Excel ou CSV
        </Text>
      </View>

      <TouchableOpacity style={styles.templateButton} onPress={downloadTemplate}>
        <Download size={18} color="#3B82F6" />
        <Text style={styles.templateButtonText}>Télécharger le modèle</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.uploadButton} onPress={pickFile} disabled={loading}>
        <Upload size={18} color="#6B7280" />
        <Text style={styles.uploadButtonText}>
          {selectedFile?.assets?.[0]?.name || 'Sélectionner un fichier Excel'}
        </Text>
      </TouchableOpacity>

      {selectedFile?.assets?.[0] && (
        <TouchableOpacity
          style={styles.processButton}
          onPress={uploadAndProcess}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FileSpreadsheet size={18} color="#FFFFFF" />
              <Text style={styles.processButtonText}>Importer les notes</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    marginBottom: 12,
  },
  templateButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  processButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});