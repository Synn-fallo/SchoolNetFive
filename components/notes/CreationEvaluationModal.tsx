import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { X, Save, Calendar, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import theme from '@/constants/theme';
import { EvaluationType } from '@/types/notes.types';

interface CreationEvaluationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClasseOption {
  id: string;
  nom: string;
  type: 'officielle' | 'personnelle';
  niveau?: string;
}

interface MatiereOption {
  id: string;
  nom: string;
  coefficient: number;
}

export default function CreationEvaluationModal({ visible, onClose, onSuccess }: CreationEvaluationModalProps) {
  const { user, isAffiliated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClasseOption[]>([]);
  const [matieres, setMatieres] = useState<MatiereOption[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string | null>(null);
  const [selectedClasseType, setSelectedClasseType] = useState<'officielle' | 'personnelle' | null>(null);
  const [selectedMatiereId, setSelectedMatiereId] = useState<string | null>(null);
  const [type, setType] = useState<EvaluationType>('interrogation');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateEvaluation, setDateEvaluation] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [noteSur, setNoteSur] = useState('20');
  const [coefficient, setCoefficient] = useState('1');

  // Réinitialisation du formulaire quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      setSelectedClasseId(null);
      setSelectedClasseType(null);
      setSelectedMatiereId(null);
      setTitre('');
      setDescription('');
      setDateEvaluation(new Date());
      setNoteSur('20');
      setCoefficient('1');
      setType('interrogation');
      setErrorMessage(null);
      loadClasses();
    }
  }, [visible]);

  const loadClasses = async () => {
    try {
      const options: ClasseOption[] = [];

      // Classes officielles (si affilié)
      if (isAffiliated) {
        const { data: enseignantClasses, error } = await supabase
          .from('enseignant_classes')
          .select('classe_id, classes(id, nom, niveau)')
          .eq('enseignant_id', user?.id);

        if (!error && enseignantClasses) {
          enseignantClasses.forEach((item: any) => {
            if (item.classes) {
              options.push({
                id: item.classes.id,
                nom: item.classes.nom,
                type: 'officielle',
                niveau: item.classes.niveau
              });
            }
          });
        }
      }

      // Classes personnelles
      const { data: personnelles, error: persoError } = await supabase
        .from('classes_personnelles')
        .select('id, nom')
        .eq('enseignant_id', user?.id);

      if (!persoError && personnelles) {
        personnelles.forEach((classe: any) => {
          options.push({
            id: classe.id,
            nom: classe.nom,
            type: 'personnelle'
          });
        });
      }

      setClasses(options);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadMatieresForClasse = async (classeId: string, classeType: 'officielle' | 'personnelle') => {
    if (classeType === 'officielle') {
      const { data: classeData } = await supabase
        .from('classes')
        .select('etablissement_id')
        .eq('id', classeId)
        .single();

      if (classeData) {
        const { data: matieresData, error } = await supabase
          .from('matieres')
          .select('id, nom, coefficient')
          .eq('etablissement_id', classeData.etablissement_id);

        if (!error && matieresData) {
          setMatieres(matieresData);
        }
      }
    } else {
      const { data: classeData, error } = await supabase
        .from('classes_personnelles')
        .select('matieres')
        .eq('id', classeId)
        .single();

      if (!error && classeData?.matieres) {
        const matieresWithId = classeData.matieres.map((m: any, idx: number) => ({
          id: `perso_${classeId}_${idx}_${m.nom.replace(/\s/g, '_')}`,
          nom: m.nom,
          coefficient: m.coefficient
        }));
        setMatieres(matieresWithId);
      }
    }
  };

  const handleClasseSelect = async (classeId: string, classeType: 'officielle' | 'personnelle') => {
    setSelectedClasseId(classeId);
    setSelectedClasseType(classeType);
    setSelectedMatiereId(null);
    setMatieres([]);
    await loadMatieresForClasse(classeId, classeType);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      console.log('Date sélectionnée:', selectedDate);
      setDateEvaluation(selectedDate);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    if (!selectedClasseId || !titre.trim()) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (selectedClasseType === 'officielle' && !selectedMatiereId) {
      setErrorMessage('Veuillez sélectionner une matière');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setLoading(true);

    try {
      const evaluationData: any = {
        enseignant_id: user?.id,
        type,
        titre: titre.trim(),
        description: description.trim() || null,
        date_devoir: formatDate(dateEvaluation),
        note_sur: parseInt(noteSur, 10),
        coefficient: parseInt(coefficient, 10),
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (selectedClasseType === 'officielle') {
        evaluationData.matiere_id = selectedMatiereId;
        evaluationData.classe_id = selectedClasseId;
        const { data: classeData } = await supabase
          .from('classes')
          .select('etablissement_id')
          .eq('id', selectedClasseId)
          .single();
        if (classeData) {
          evaluationData.etablissement_id = classeData.etablissement_id;
        }
      } else {
        evaluationData.classe_personnelle_id = selectedClasseId;
        evaluationData.etablissement_id = null;
        evaluationData.matiere_id = null;
        if (selectedMatiereId) {
          const matiereChoisie = matieres.find(m => m.id === selectedMatiereId);
          evaluationData.matiere_nom = matiereChoisie?.nom;
        }
      }

      const { error } = await supabase
        .from('devoirs')
        .insert(evaluationData);

      if (error) {
        throw error;
      }

      Alert.alert('Succès', 'Évaluation créée avec succès');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur:', error);
      
      let userMessage = "Impossible de créer l'évaluation. Veuillez vérifier les informations saisies.";
      
      if (error.message?.includes('type_check')) {
        userMessage = "Le type d'évaluation sélectionné n'est pas valide. Veuillez contacter l'administrateur.";
      } else if (error.message?.includes('foreign key')) {
        userMessage = "La classe ou la matière sélectionnée n'existe pas.";
      } else if (error.message?.includes('not null')) {
        userMessage = "Veuillez remplir tous les champs obligatoires.";
      }
      
      setErrorMessage(userMessage);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Créer une évaluation</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

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

          <Text style={styles.label}>Classe *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedClasseId}
              onValueChange={(itemValue, itemIndex) => {
                const selected = classes.find(c => c.id === itemValue);
                if (selected) {
                  handleClasseSelect(selected.id, selected.type);
                }
              }}
              style={styles.picker}
            >
              <Picker.Item label="Sélectionner une classe" value={null} />
              {classes.map((classe) => (
                <Picker.Item 
                  key={classe.id} 
                  label={`${classe.nom} ${classe.type === 'personnelle' ? '(Personnelle)' : ''}`} 
                  value={classe.id} 
                />
              ))}
            </Picker>
          </View>

          {selectedClasseId && matieres.length > 0 && (
            <>
              <Text style={styles.label}>Matière *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedMatiereId}
                  onValueChange={(itemValue) => setSelectedMatiereId(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Sélectionner une matière" value={null} />
                  {matieres.map((matiere) => (
                    <Picker.Item key={matiere.id} label={`${matiere.nom} (coef ${matiere.coefficient})`} value={matiere.id} />
                  ))}
                </Picker>
              </View>
            </>
          )}

          {selectedClasseType === 'personnelle' && selectedClasseId && matieres.length === 0 && (
            <Text style={styles.warningText}>
              Aucune matière. Veuillez d'abord créer des matières dans votre classe personnelle.
            </Text>
          )}

          <Text style={styles.label}>Titre *</Text>
          <TextInput style={styles.input} value={titre} onChangeText={setTitre} placeholder="Ex: Interrogation de Maths" />

          <Text style={styles.label}>Description (optionnelle)</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Description..." multiline numberOfLines={3} />

          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Calendar size={18} color="#6B7280" />
            <Text style={styles.dateButtonText}>
              {dateEvaluation.toLocaleDateString('fr-CA')}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateEvaluation}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              locale="fr-FR"
            />
          )}

          <Text style={styles.label}>Note sur *</Text>
          <TextInput style={styles.input} value={noteSur} onChangeText={setNoteSur} keyboardType="numeric" placeholder="20" />

          <Text style={styles.label}>Coefficient *</Text>
          <TextInput style={styles.input} value={coefficient} onChangeText={setCoefficient} keyboardType="numeric" placeholder="1" />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading || isSubmitting}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Save size={18} color="#FFFFFF" />}
            <Text style={styles.submitButtonText}>Créer</Text>
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
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
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
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  picker: {
    height: 50,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  warningText: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 8,
    marginBottom: 8,
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