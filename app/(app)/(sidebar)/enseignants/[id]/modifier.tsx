import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import RattachementForm from '@/components/enseignant/RattachementForm';
import { ArrowLeft } from 'lucide-react-native';

export default function ModifierEnseignantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [etablissementId, setEtablissementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEtablissementId();
  }, []);

  const loadEtablissementId = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', id)
        .eq('role', 'enseignant')
        .maybeSingle();

      if (error) throw error;
      if (data?.etablissement_id) {
        setEtablissementId(data.etablissement_id);
      }
    } catch (error) {
      console.error('Error loading etablissement id:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!etablissementId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Impossible de charger les données de l'établissement</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier les rattachements</Text>
        <View style={styles.placeholder} />
      </View>

      <RattachementForm
        enseignantId={id}
        etablissementId={etablissementId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  backText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
});