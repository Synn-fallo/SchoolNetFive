import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import RequestCard from './RequestCard';
import RequestDetailModal from './RequestDetailModal';
import theme from '@/constants/theme';

interface RoleRequest {
  id: string;
  role_souhaite: string;
  statut: 'en_attente' | 'valide' | 'rejete';
  message: string | null;
  justificatif_url: string | null;
  commentaire_admin: string | null;
  created_at: string;
  metadata: any;
}

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'chef_etablissement': return 'Chef d\'établissement';
    case 'autorite': return 'Autorité';
    case 'partenaire': return 'Partenaire';
    case 'eleve': return 'Élève';
    case 'parent': return 'Parent';
    case 'enseignant': return 'Enseignant';
    default: return role;
  }
};

export default function RoleRequestsList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('demandes_role')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching role requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    Alert.alert(
      'Annuler la demande',
      'Êtes-vous sûr de vouloir annuler cette demande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('demandes_role')
                .update({ statut: 'annule' })
                .eq('id', requestId)
                .eq('user_id', user?.id);

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
        <Text style={styles.emptyText}>Aucune demande de rôle</Text>
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
            title={getRoleLabel(item.role_souhaite)}
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
        type="role"
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