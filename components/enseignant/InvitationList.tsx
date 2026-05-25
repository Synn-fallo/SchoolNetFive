import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import InvitationStatus from './InvitationStatus';
import { Mail, Phone, Calendar, RefreshCw } from 'lucide-react-native';

interface Invitation {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  statut: 'en_attente' | 'acceptee' | 'expiree' | 'annulee';
  expires_at: string;
  created_at: string;
  metadata?: {
    matieres?: string[];
    classes?: string[];
    departement?: string;
  };
}

interface InvitationListProps {
  etablissementId: string;
  onInvitationUpdate?: () => void;
}

export default function InvitationList({ etablissementId, onInvitationUpdate }: InvitationListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .eq('role', 'enseignant')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvitations();
    if (onInvitationUpdate) onInvitationUpdate();
  };

  useEffect(() => {
    loadInvitations();
  }, [etablissementId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyText}>Aucune invitation envoyée</Text>
      </Card>
    );
  }

  return (
    <FlatList
      data={invitations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const expired = item.statut === 'expiree' || isExpired(item.expires_at);
        const status = expired && item.statut === 'en_attente' ? 'expiree' : item.statut;
        
        return (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.name}>{item.prenom} {item.nom}</Text>
                <View style={styles.contactRow}>
                  <Mail size={12} color="#9CA3AF" />
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                {item.telephone && (
                  <View style={styles.contactRow}>
                    <Phone size={12} color="#9CA3AF" />
                    <Text style={styles.phone}>{item.telephone}</Text>
                  </View>
                )}
              </View>
              <InvitationStatus status={status as any} />
            </View>
            
            {item.metadata?.departement && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Département:</Text>
                <Text style={styles.metadataValue}>{item.metadata.departement}</Text>
              </View>
            )}
            
            {item.metadata?.matieres && item.metadata.matieres.length > 0 && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Matières:</Text>
                <Text style={styles.metadataValue}>{item.metadata.matieres.length} sélectionnée(s)</Text>
              </View>
            )}
            
            {item.metadata?.classes && item.metadata.classes.length > 0 && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Classes:</Text>
                <Text style={styles.metadataValue}>{item.metadata.classes.length} sélectionnée(s)</Text>
              </View>
            )}
            
            <View style={styles.footer}>
              <View style={styles.dateRow}>
                <Calendar size={12} color="#9CA3AF" />
                <Text style={styles.dateText}>
                  Envoyée le {formatDate(item.created_at)}
                </Text>
              </View>
              {item.statut === 'en_attente' && !expired && (
                <Text style={styles.expiresText}>
                  Expire le {formatDate(item.expires_at)}
                </Text>
              )}
            </View>
          </Card>
        );
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3B82F6']} />
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: 12,
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    color: '#6B7280',
  },
  phone: {
    fontSize: 12,
    color: '#6B7280',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metadataLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    width: 90,
  },
  metadataValue: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  expiresText: {
    fontSize: 11,
    color: '#F59E0B',
  },
});