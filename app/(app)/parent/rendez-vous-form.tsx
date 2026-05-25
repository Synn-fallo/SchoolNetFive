import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRendezVous } from '@/hooks/useRendezVous';
import { useEnfants } from '@/hooks/useEnfants';
import { Calendar, Clock, User, BookOpen, ChevronLeft, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import theme from '@/constants/theme';

export default function RendezVousFormScreen() {
  const router = useRouter();
  const { enfantId: paramEnfantId } = useLocalSearchParams<{ enfantId: string }>();
  const { enfants, loading: loadingEnfants } = useEnfants();
  const { getEnseignantsForEleve, demanderRendezVous, sending } = useRendezVous();
  
  const [selectedEnfantId, setSelectedEnfantId] = useState(paramEnfantId || '');
  const [selectedEnseignantId, setSelectedEnseignantId] = useState('');
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [heure, setHeure] = useState('09:00');
  const [motif, setMotif] = useState('');
  const [loadingEnseignants, setLoadingEnseignants] = useState(false);

  const enfant = enfants.find(e => e.id === selectedEnfantId);

  useEffect(() => {
    if (selectedEnfantId) {
      loadEnseignants();
    }
  }, [selectedEnfantId]);

  const loadEnseignants = async () => {
    setLoadingEnseignants(true);
    const list = await getEnseignantsForEleve(selectedEnfantId);
    setEnseignants(list);
    setLoadingEnseignants(false);
  };

  const handleSubmit = async () => {
    if (!selectedEnfantId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un enfant');
      return;
    }
    if (!selectedEnseignantId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un enseignant');
      return;
    }
    if (!motif.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un motif');
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    const result = await demanderRendezVous(
      selectedEnseignantId,
      selectedEnfantId,
      dateStr,
      heure,
      motif
    );

    if (result.success) {
      Alert.alert(
        'Demande envoyée',
        'Votre demande de rendez-vous a été envoyée à l\'enseignant. Vous recevrez une notification dès qu\'il répondra.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Erreur', result.error || 'Impossible d\'envoyer la demande');
    }
  };

  if (loadingEnfants) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau rendez-vous</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Sélection de l'enfant */}
      <View style={styles.section}>
        <Text style={styles.label}>Enfant *</Text>
        <View style={styles.selectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {enfants.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.selectorButton, selectedEnfantId === e.id && styles.selectorButtonActive]}
                onPress={() => setSelectedEnfantId(e.id)}
              >
                <Text style={[styles.selectorButtonText, selectedEnfantId === e.id && styles.selectorButtonTextActive]}>
                  {e.prenom} {e.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Sélection de l'enseignant */}
      {selectedEnfantId && (
        <View style={styles.section}>
          <Text style={styles.label}>Enseignant *</Text>
          {loadingEnseignants ? (
            <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
          ) : enseignants.length === 0 ? (
            <Text style={styles.emptyText}>Aucun enseignant trouvé pour cette classe</Text>
          ) : (
            enseignants.map((ens) => (
              <TouchableOpacity
                key={ens.id}
                style={[styles.enseignantCard, selectedEnseignantId === ens.id && styles.enseignantCardActive]}
                onPress={() => setSelectedEnseignantId(ens.id)}
              >
                <User size={20} color={selectedEnseignantId === ens.id ? '#FFFFFF' : theme.colors.primary.DEFAULT} />
                <View style={styles.enseignantInfo}>
                  <Text style={[styles.enseignantName, selectedEnseignantId === ens.id && styles.enseignantNameActive]}>
                    {ens.prenom} {ens.nom}
                  </Text>
                  <Text style={[styles.enseignantMatiere, selectedEnseignantId === ens.id && styles.enseignantMatiereActive]}>
                    {ens.matieres.join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Date */}
      <View style={styles.section}>
        <Text style={styles.label}>Date *</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Calendar size={20} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.dateText}>{date.toLocaleDateString('fr-FR')}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Heure */}
      <View style={styles.section}>
        <Text style={styles.label}>Heure *</Text>
        <View style={styles.heureContainer}>
          {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.heureButton, heure === h && styles.heureButtonActive]}
              onPress={() => setHeure(h)}
            >
              <Clock size={14} color={heure === h ? '#FFFFFF' : theme.colors.primary.DEFAULT} />
              <Text style={[styles.heureText, heure === h && styles.heureTextActive]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Motif */}
      <View style={styles.section}>
        <Text style={styles.label}>Motif *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Décrivez le motif du rendez-vous..."
          value={motif}
          onChangeText={setMotif}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Bouton d'envoi */}
      <TouchableOpacity
        style={[styles.submitButton, sending && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Envoyer la demande</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerRight: { width: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  selectorContainer: { flexDirection: 'row' },
  selectorButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 20, marginRight: 8 },
  selectorButtonActive: { backgroundColor: theme.colors.primary.DEFAULT },
  selectorButtonText: { fontSize: 14, color: '#6B7280' },
  selectorButtonTextActive: { color: '#FFFFFF' },
  enseignantCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  enseignantCardActive: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  enseignantInfo: { flex: 1 },
  enseignantName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  enseignantNameActive: { color: '#FFFFFF' },
  enseignantMatiere: { fontSize: 12, color: '#6B7280' },
  enseignantMatiereActive: { color: '#BFDBFE' },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dateText: { fontSize: 14, color: '#1F2937', flex: 1 },
  heureContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heureButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  heureButtonActive: { backgroundColor: theme.colors.primary.DEFAULT },
  heureText: { fontSize: 13, color: '#6B7280' },
  heureTextActive: { color: '#FFFFFF' },
  textArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#1F2937', minHeight: 100, textAlignVertical: 'top' },
  submitButton: { backgroundColor: theme.colors.primary.DEFAULT, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { backgroundColor: '#9CA3AF' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 },
});