import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import RequestCard from './RequestCard';
import RequestDetailModal from './RequestDetailModal';
import theme from '@/constants/theme';

interface PartenariatRequest {
  id: string;
  organisation_nom: string;
  type_partenaire: string;
  statut: 'en_attente' | 'valide' | 'rejete' | 'annule';
  proposition: string | null;
  notes_internes: string | null;
  created_at: string;
}

export default function PartenariatRequestsList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PartenariatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PartenariatRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('demandes_partenariat')
        .select('*')
        .eq('demandeur_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching partenariat requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    Alert.alert(
      'Annuler la demande',
      'Êtes-vous sûr de vouloir annuler cette demande de partenariat ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('demandes_partenariat')
                .update({ statut: 'annule' })
                .eq('id', requestId)
                .eq('demandeur_id', user?.id);

              if (error) throw error;
              fetchRequests();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'annuler la demande');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucune demande de partenariat</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            id={item.id}
            title={item.organisation_nom}
            subtitle={item.type_partenaire}
            status={item.statut}
            date={item.created_at}
            onPress={() => {
              setSelectedRequest(item);
              setModalVisible(true);
            }}
            onCancel={() => handleCancel(item.id)}
            showCancelButton={item.statut === 'en_attente'}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      <RequestDetailModal
        visible={modalVisible}
        request={selectedRequest}
        type="partenariat"
        onClose={() => {
          setModalVisible(false);
          setSelectedRequest(null);
        }}
        onRefresh={fetchRequests}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  listContent: {
    paddingBottom: 8,
  },
});