import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { X, Save } from 'lucide-react-native';
import theme from '@/constants/theme';
import { EvaluationType } from '@/types/notes.types';

interface ModificationEvaluationModalProps {
  visible: boolean;
  evaluation: {
    id: string;
    titre: string;
    type: EvaluationType;
    date_evaluation: string;
    note_sur: number;
    coefficient: number;
    description?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModificationEvaluationModal({ visible, evaluation, onClose, onSuccess }: ModificationEvaluationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [titre, setTitre] = useState(evaluation.titre);
  const [type, setType] = useState<EvaluationType>(evaluation.type);
  const [description, setDescription] = useState(evaluation.description || '');
  const [dateEvaluation, setDateEvaluation] = useState(evaluation.date_evaluation.split('T')[0]);
  const [noteSur, setNoteSur] = useState(evaluation.note_sur.toString());
  const [coefficient, setCoefficient] = useState(evaluation.coefficient.toString());

  const handleSubmit = async () => {
    if (!titre.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('devoirs')
        .update({
          titre: titre.trim(),
          type,
          description: description.trim() || null,
          date_devoir: dateEvaluation,
          note_sur: parseInt(noteSur, 10),
          coefficient: parseInt(coefficient, 10),
          updated_at: new Date().toISOString()
        })
        .eq('id', evaluation.id)
        .eq('enseignant_id', user?.id);

      if (error) throw error;

      Alert.alert('Succès', 'Évaluation modifiée');
      onSuccess();
    } catch (error) {
      console.error('Error updating evaluation:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'évaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Modifier l'évaluation</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.label}>Type d'évaluation *</Text>
          <View style={styles.typeContainer}>
            {(['interrogation', 'devoir', 'examen_blanc'] as EvaluationType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeButton, type === t && styles.typeButtonActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                  {t === 'interrogation' ? 'Interrogation' : t === 'devoir' ? 'Devoir' : 'Examen blanc'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Titre *</Text>
          <TextInput style={styles.input} value={titre} onChangeText={setTitre} />

          <Text style={styles.label}>Description (optionnelle)</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={3} />

          <Text style={styles.label}>Date *</Text>
          <TextInput style={styles.input} value={dateEvaluation} onChangeText={setDateEvaluation} />

          <Text style={styles.label}>Note sur *</Text>
          <TextInput style={styles.input} value={noteSur} onChangeText={setNoteSur} keyboardType="numeric" />

          <Text style={styles.label}>Coefficient *</Text>
          <TextInput style={styles.input} value={coefficient} onChangeText={setCoefficient} keyboardType="numeric" />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Save size={18} color="#FFFFFF" />}
            <Text style={styles.submitButtonText}>Enregistrer</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  typeButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});