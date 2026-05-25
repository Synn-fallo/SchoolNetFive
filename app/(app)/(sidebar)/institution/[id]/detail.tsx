import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import RequestDetail from '@/components/institution/RequestDetail';
import AdminRequestReview from '@/components/institution/AdminRequestReview';

type RequestType = 'etablissement' | 'partenariat';

export default function DemandeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [type, setType] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);

  useEffect(() => {
    setIsAdmin(hasRole('admin'));
  }, [hasRole]);

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    try {
      // Try to fetch from demandes_etablissement
      const { data: etabData, error: etabError } = await supabase
        .from('demandes_etablissement')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (etabData) {
        setRequest(etabData);
        setType('etablissement');
        setLoading(false);
        return;
      }

      // Try to fetch from demandes_partenariat
      const { data: partData, error: partError } = await supabase
        .from('demandes_partenariat')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (partData) {
        setRequest(partData);
        setType('partenariat');
        setLoading(false);
        return;
      }

      throw new Error('Demande non trouvée');
    } catch (error) {
      console.error('Error fetching request:', error);
      Alert.alert('Erreur', 'Impossible de charger la demande');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!type) return;

    const table = type === 'etablissement' ? 'demandes_etablissement' : 'demandes_partenariat';
    
    const { error } = await supabase
      .from(table)
      .update({ statut: 'annule' })
      .eq('id', requestId);

    if (error) {
      Alert.alert('Erreur', 'Impossible d\'annuler la demande');
      return;
    }

    Alert.alert('Succès', 'La demande a été annulée');
    fetchRequest();
  };

  const handleProcessed = () => {
    fetchRequest();
    setShowAdminView(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!request || !type) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Demande non trouvée</Text>
      </View>
    );
  }

  if (isAdmin && showAdminView) {
    return (
      <AdminRequestReview
        request={request}
        type={type}
        onProcessed={handleProcessed}
        onClose={() => setShowAdminView(false)}
      />
    );
  }

  return (
    <RequestDetail
      request={request}
      type={type}
      onCancel={handleCancel}
      onBack={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
});