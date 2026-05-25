import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Send, Building2, Users, Globe, Pin } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Classe {
  id: string;
  nom: string;
  est_animateur: boolean;
}

export default function EnseignantAnnoncesPublierScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [type, setType] = useState<'classe' | 'etablissement'>('classe');
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  const [classes, setClasses] = useState<Classe[]>([]);
  const [visibilite, setVisibilite] = useState<'parents' | 'enseignants' | 'tous'>('parents');
  const [estEpingle, setEstEpingle] = useState(false);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const chargerClasses = useCallback(async () => {
    if (!user) return;

    try {
      // Récupérer les classes où l'enseignant enseigne
      const { data: enseignements, error } = await supabase
        .from('enseignant_classes')
        .select('classe_id')
        .eq('enseignant_id', user.id);

      if (error) throw error;

      const classeIds = enseignements?.map(e => e.classe_id) || [];

      if (classeIds.length === 0) {
        setClasses([]);
        setLoadingClasses(false);
        return;
      }

      // Récupérer les détails des classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, nom, enseignant_principal_id')
        .in('id', classeIds);

      if (classesError) throw classesError;

      const formatted = (classesData || []).map(c => ({
        id: c.id,
        nom: c.nom,
        est_animateur: c.enseignant_principal_id === user.id,
      }));

      setClasses(formatted);
      if (formatted.length > 0 && !selectedClasseId) {
        setSelectedClasseId(formatted[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  }, [user]);

  useEffect(() => {
    chargerClasses();
  }, [chargerClasses]);

  const handleSubmit = async () => {
    if (!titre.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre');
      return;
    }
    if (!contenu.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le contenu');
      return;
    }
    if (type === 'classe' && !selectedClasseId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une classe');
      return;
    }

    setLoading(true);

    try {
      const insertData: any = {
        titre: titre.trim(),
        contenu: contenu.trim(),
        type: type,
        visibilite: visibilite,
        publie_par_id: user?.id,
        est_publiee: true,
        est_epingle: estEpingle,
        created_at: new Date().toISOString(),
      };

      if (type === 'classe') {
        insertData.classe_id = selectedClasseId;
      } else {
        // Récupérer l'établissement de l'enseignant
        const { data: etabData } = await supabase
          .from('enseignant_etablissements')
          .select('etablissement_id')
          .eq('enseignant_id', user?.id)
          .maybeSingle();
        
        if (etabData) {
          insertData.etablissement_id = etabData.etablissement_id;
        }
      }

      if (dateDebut) insertData.date_debut = dateDebut;
      if (dateFin) insertData.date_fin = dateFin;

      const { error: insertError } = await supabase
        .from('publications')
        .insert(insertData);

      if (insertError) throw insertError;

      Alert.alert(
        'Succès',
        'L\'annonce a été publiée',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Erreur publication:', err);
      Alert.alert('Erreur', 'Impossible de publier l\'annonce');
    } finally {
      setLoading(false);
    }
  };

  const selectedClasse = classes.find(c => c.id === selectedClasseId);
  const peutPublierEtablissement = classes.some(c => c.est_animateur);

  if (loadingClasses) {
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
        <Text style={styles.headerTitle}>Publier une annonce</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Type d'annonce */}
      <View style={styles.section}>
        <Text style={styles.label}>Type d'annonce *</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'classe' && styles.typeButtonActive]}
            onPress={() => setType('classe')}
          >
            <Users size={18} color={type === 'classe' ? '#FFFFFF' : theme.colors.primary.DEFAULT} />
            <Text style={[styles.typeButtonText, type === 'classe' && styles.typeButtonTextActive]}>Classe</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, (!peutPublierEtablissement || type === 'classe') && styles.typeButtonDisabled]}
            onPress={() => peutPublierEtablissement && setType('etablissement')}
            disabled={!peutPublierEtablissement}
          >
            <Building2 size={18} color={type === 'etablissement' ? '#FFFFFF' : (peutPublierEtablissement ? theme.colors.primary.DEFAULT : '#9CA3AF')} />
            <Text style={[styles.typeButtonText, type === 'etablissement' && styles.typeButtonTextActive]}>Établissement</Text>
          </TouchableOpacity>
        </View>
        {!peutPublierEtablissement && (
          <Text style={styles.helperText}>Seul un Professeur Principal peut publier une annonce pour l'établissement</Text>
        )}
      </View>

      {/* Sélection de la classe */}
      {type === 'classe' && (
        <View style={styles.section}>
          <Text style={styles.label}>Classe *</Text>
          <View style={styles.classesContainer}>
            {classes.map((classe) => (
              <TouchableOpacity
                key={classe.id}
                style={[styles.classeButton, selectedClasseId === classe.id && styles.classeButtonActive]}
                onPress={() => setSelectedClasseId(classe.id)}
              >
                <Text style={[styles.classeButtonText, selectedClasseId === classe.id && styles.classeButtonTextActive]}>
                  {classe.nom}
                </Text>
                {classe.est_animateur && (
                  <Text style={styles.ppBadge}>PP</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Titre */}
      <View style={styles.section}>
        <Text style={styles.label}>Titre *</Text>
        <TextInput
          style={styles.input}
          placeholder="Titre de l'annonce"
          value={titre}
          onChangeText={setTitre}
          maxLength={100}
        />
      </View>

      {/* Contenu */}
      <View style={styles.section}>
        <Text style={styles.label}>Contenu *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Détail de l'annonce..."
          value={contenu}
          onChangeText={setContenu}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Visibilité */}
      <View style={styles.section}>
        <Text style={styles.label}>Visibilité</Text>
        <View style={styles.visibiliteContainer}>
          <TouchableOpacity
            style={[styles.visibiliteButton, visibilite === 'parents' && styles.visibiliteButtonActive]}
            onPress={() => setVisibilite('parents')}
          >
            <Text style={[styles.visibiliteText, visibilite === 'parents' && styles.visibiliteTextActive]}>Parents uniquement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visibiliteButton, visibilite === 'enseignants' && styles.visibiliteButtonActive]}
            onPress={() => setVisibilite('enseignants')}
          >
            <Text style={[styles.visibiliteText, visibilite === 'enseignants' && styles.visibiliteTextActive]}>Enseignants uniquement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visibiliteButton, visibilite === 'tous' && styles.visibiliteButtonActive]}
            onPress={() => setVisibilite('tous')}
          >
            <Text style={[styles.visibiliteText, visibilite === 'tous' && styles.visibiliteTextActive]}>Tous</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Options supplémentaires */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Pin size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.switchText}>Épingler l'annonce</Text>
          </View>
          <Switch
            value={estEpingle}
            onValueChange={setEstEpingle}
            trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
          />
        </View>
      </View>

      {/* Bouton publication */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Send size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Publier l'annonce</Text>
          </>
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
  typeContainer: { flexDirection: 'row', gap: 12 },
  typeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 10, justifyContent: 'center' },
  typeButtonActive: { backgroundColor: theme.colors.primary.DEFAULT },
  typeButtonDisabled: { opacity: 0.5 },
  typeButtonText: { fontSize: 14, color: theme.colors.primary.DEFAULT, fontWeight: '500' },
  typeButtonTextActive: { color: '#FFFFFF' },
  helperText: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  classesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  classeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  classeButtonActive: { backgroundColor: theme.colors.primary.DEFAULT },
  classeButtonText: { fontSize: 13, color: '#6B7280' },
  classeButtonTextActive: { color: '#FFFFFF' },
  ppBadge: { fontSize: 10, fontWeight: '600', color: '#F59E0B', backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1F2937' },
  textArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#1F2937', minHeight: 120, textAlignVertical: 'top' },
  visibiliteContainer: { flexDirection: 'row', gap: 8 },
  visibiliteButton: { flex: 1, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' },
  visibiliteButtonActive: { backgroundColor: theme.colors.primary.DEFAULT },
  visibiliteText: { fontSize: 13, color: '#6B7280' },
  visibiliteTextActive: { color: '#FFFFFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchText: { fontSize: 14, color: '#374151' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary.DEFAULT, paddingVertical: 14, borderRadius: 10, marginTop: 20 },
  submitButtonDisabled: { backgroundColor: '#9CA3AF' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});