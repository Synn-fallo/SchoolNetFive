import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, User, BookOpen, ChevronLeft } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import theme from '@/constants/theme';

export default function EnseignantRendezVousFormScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [parentNom, setParentNom] = useState('');
  const [parentPrenom, setParentPrenom] = useState('');
  const [eleveNom, setEleveNom] = useState('');
  const [elevePrenom, setElevePrenom] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [heure, setHeure] = useState('09:00');
  const [motif, setMotif] = useState('');
  const [lieu, setLieu] = useState('Salle des professeurs');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!parentNom.trim() || !parentPrenom.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom et prénom du parent');
      return;
    }
    if (!motif.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un motif');
      return;
    }

    setSending(true);

    try {
      // Rechercher le parent par nom et prénom
      const { data: parents, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .ilike('nom', parentNom)
        .ilike('prenom', parentPrenom)
        .limit(1);

      if (parentError || !parents || parents.length === 0) {
        Alert.alert('Erreur', 'Parent non trouvé. Vérifiez le nom et prénom.');
        setSending(false);
        return;
      }

      const parentId = parents[0].id;

      // Rechercher l'élève
      let eleveId = null;
      if (eleveNom.trim() && elevePrenom.trim()) {
        const { data: eleves, error: eleveError } = await supabase
          .from('eleves')
          .select('id')
          .ilike('nom', eleveNom)
          .ilike('prenom', elevePrenom)
          .limit(1);

        if (!eleveError && eleves && eleves.length > 0) {
          eleveId = eleves[0].id;
        }
      }

      const dateStr = date.toISOString().split('T')[0];
      const heureFin = `${parseInt(heure.split(':')[0]) + 1}:${heure.split(':')[1]}`;

      const { error: insertError } = await supabase
        .from('rendez_vous')
        .insert({
          parent_id: parentId,
          enseignant_id: user?.id,
          eleve_id: eleveId,
          date_rdv: dateStr,
          heure_debut: heure,
          heure_fin: heureFin,
          motif: motif,
          statut: 'en_attente',
          lieu: lieu,
        });

      if (insertError) throw insertError;

      Alert.alert(
        'Rendez-vous créé',
        'La demande a été envoyée au parent.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Erreur:', err);
      Alert.alert('Erreur', 'Impossible de créer le rendez-vous');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau rendez-vous</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Parent */}
      <View style={styles.section}>
        <Text style={styles.label}>Parent *</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Nom"
            value={parentNom}
            onChangeText={setParentNom}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Prénom"
            value={parentPrenom}
            onChangeText={setParentPrenom}
          />
        </View>
      </View>

      {/* Élève (optionnel) */}
      <View style={styles.section}>
        <Text style={styles.label}>Élève (optionnel)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Nom"
            value={eleveNom}
            onChangeText={setEleveNom}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Prénom"
            value={elevePrenom}
            onChangeText={setElevePrenom}
          />
        </View>
      </View>

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

      {/* Lieu */}
      <View style={styles.section}>
        <Text style={styles.label}>Lieu</Text>
        <TextInput
          style={styles.input}
          placeholder="Salle des professeurs, bureau, etc."
          value={lieu}
          onChangeText={setLieu}
        />
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

      {/* Bouton */}
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
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1F2937' },
  halfInput: { flex: 1 },
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
});