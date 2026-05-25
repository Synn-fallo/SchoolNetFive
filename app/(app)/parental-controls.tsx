import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Shield, UserPlus, ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EleveSimple {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
}

interface Restrictions {
  forums: boolean;
  publications: boolean;
  amis: boolean;
  messages: boolean;
  marketplace: boolean;
  ia: boolean;
  mode_acces: 'libre' | 'controle' | 'differe';
}

export default function ParentalControlsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [enfants, setEnfants] = useState<EleveSimple[]>([]);
  const [selectedEnfantId, setSelectedEnfantId] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState<Restrictions>({
    forums: false,
    publications: false,
    amis: false,
    messages: false,
    marketplace: false,
    ia: false,
    mode_acces: 'libre',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEnfants();
  }, [user]);

  const fetchEnfants = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('parents_eleves')
        .select(`
          eleves:eleve_id (
            id,
            nom,
            prenom,
            matricule
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;

      const enfantsList = (data || []).map(item => ({
        id: (item.eleves as any)?.id,
        nom: (item.eleves as any)?.nom || '',
        prenom: (item.eleves as any)?.prenom || '',
        matricule: (item.eleves as any)?.matricule || '',
      }));

      setEnfants(enfantsList);
      if (enfantsList.length > 0 && !selectedEnfantId) {
        setSelectedEnfantId(enfantsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching enfants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestrictions = async (enfantId: string) => {
    if (!enfantId) return;

    try {
      const { data, error } = await supabase
        .from('parental_controls')
        .select('*')
        .eq('eleve_id', enfantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRestrictions({
          forums: data.forums || false,
          publications: data.publications || false,
          amis: data.amis || false,
          messages: data.messages || false,
          marketplace: data.marketplace || false,
          ia: data.ia || false,
          mode_acces: data.mode_acces || 'libre',
        });
      } else {
        setRestrictions({
          forums: false,
          publications: false,
          amis: false,
          messages: false,
          marketplace: false,
          ia: false,
          mode_acces: 'libre',
        });
      }
    } catch (error) {
      console.error('Error fetching restrictions:', error);
    }
  };

  useEffect(() => {
    if (selectedEnfantId) {
      fetchRestrictions(selectedEnfantId);
    }
  }, [selectedEnfantId]);

  const handleSave = async () => {
    if (!selectedEnfantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('parental_controls')
        .upsert({
          eleve_id: selectedEnfantId,
          forums: restrictions.forums,
          publications: restrictions.publications,
          amis: restrictions.amis,
          messages: restrictions.messages,
          marketplace: restrictions.marketplace,
          ia: restrictions.ia,
          mode_acces: restrictions.mode_acces,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      Alert.alert('Succès', 'Restrictions sauvegardées');
    } catch (error) {
      console.error('Error saving restrictions:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les restrictions');
    } finally {
      setSaving(false);
    }
  };

  const handleLierEnfant = () => {
    router.push('/(app)/enfants/lier');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (enfants.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Shield size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun enfant lié</Text>
        <Text style={styles.emptyText}>
          Pour utiliser les contrôles parentaux, vous devez d'abord lier un enfant à votre compte.
        </Text>
        <TouchableOpacity style={styles.linkButton} onPress={handleLierEnfant}>
          <Text style={styles.linkButtonText}>Lier un enfant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedEnfant = enfants.find(e => e.id === selectedEnfantId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Shield size={28} color={theme.colors.primary.DEFAULT} />
        <Text style={styles.title}>Contrôles parentaux</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.enfantsScroll}>
        {enfants.map((enfant) => (
          <TouchableOpacity
            key={enfant.id}
            style={[styles.enfantChip, selectedEnfantId === enfant.id && styles.enfantChipActive]}
            onPress={() => setSelectedEnfantId(enfant.id)}
          >
            <Text style={[styles.enfantChipText, selectedEnfantId === enfant.id && styles.enfantChipTextActive]}>
              {enfant.prenom} {enfant.nom}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addChip} onPress={handleLierEnfant}>
          <UserPlus size={14} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.addChipText}>Lier</Text>
        </TouchableOpacity>
      </ScrollView>

      {selectedEnfant && (
        <>
          <Card style={styles.infoCard}>
            <Text style={styles.enfantName}>{selectedEnfant.prenom} {selectedEnfant.nom}</Text>
            <Text style={styles.enfantMatricule}>Matricule: {selectedEnfant.matricule}</Text>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Mode d'accès</Text>
            <View style={styles.modeContainer}>
              {['libre', 'controle', 'differe'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeButton, restrictions.mode_acces === mode && styles.modeButtonActive]}
                  onPress={() => setRestrictions({ ...restrictions, mode_acces: mode as any })}
                >
                  <Text style={[styles.modeButtonText, restrictions.mode_acces === mode && styles.modeButtonTextActive]}>
                    {mode === 'libre' ? 'Libre' : mode === 'controle' ? 'Contrôlé' : 'Différé'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Restrictions</Text>

            <View style={styles.restrictionItem}>
              <Text style={styles.restrictionLabel}>Messages privés</Text>
              <Switch
                value={restrictions.messages}
                onValueChange={(value) => setRestrictions({ ...restrictions, messages: value })}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
              />
            </View>

            <View style={styles.restrictionItem}>
              <Text style={styles.restrictionLabel}>Forums et discussions</Text>
              <Switch
                value={restrictions.forums}
                onValueChange={(value) => setRestrictions({ ...restrictions, forums: value })}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
              />
            </View>

            <View style={styles.restrictionItem}>
              <Text style={styles.restrictionLabel}>Publications sur le mur social</Text>
              <Switch
                value={restrictions.publications}
                onValueChange={(value) => setRestrictions({ ...restrictions, publications: value })}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
              />
            </View>

            <View style={styles.restrictionItem}>
              <Text style={styles.restrictionLabel}>Ajout d'amis</Text>
              <Switch
                value={restrictions.amis}
                onValueChange={(value) => setRestrictions({ ...restrictions, amis: value })}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
              />
            </View>

            <View style={styles.restrictionItem}>
              <Text style={styles.restrictionLabel}>Marketplace</Text>
              <Switch
                value={restrictions.marketplace}
                onValueChange={(value) => setRestrictions({ ...restrictions, marketplace: value })}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
              />
            </View>

            <View style={styles.restrictionItem}>
              <Text style={styles.restrictionLabel}>Assistant IA (Chool)</Text>
              <Switch
                value={restrictions.ia}
                onValueChange={(value) => setRestrictions({ ...restrictions, ia: value })}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
              />
            </View>
          </Card>

          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Enregistrer les restrictions</Text>}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  linkButton: { backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  linkButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  enfantsScroll: { flexDirection: 'row', marginBottom: 16 },
  enfantChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 20, marginRight: 8 },
  enfantChipActive: { backgroundColor: theme.colors.primary.DEFAULT },
  enfantChipText: { fontSize: 13, color: '#6B7280' },
  enfantChipTextActive: { color: '#FFFFFF' },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#EFF6FF', borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  addChipText: { fontSize: 12, color: theme.colors.primary.DEFAULT, fontWeight: '500' },
  infoCard: { padding: 16, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  enfantName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  enfantMatricule: { fontSize: 12, color: '#6B7280' },
  card: { padding: 16, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  modeContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  modeButton: { flex: 1, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' },
  modeButtonActive: { backgroundColor: theme.colors.primary.DEFAULT },
  modeButtonText: { fontSize: 13, color: '#6B7280' },
  modeButtonTextActive: { color: '#FFFFFF', fontWeight: '500' },
  restrictionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  restrictionLabel: { fontSize: 14, color: '#374151' },
  saveButton: { backgroundColor: theme.colors.primary.DEFAULT, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { backgroundColor: '#9CA3AF' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});