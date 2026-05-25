import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Building2 } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';
import { useEnseignantEtablissements } from '@/hooks/useEnseignantEtablissements';

interface Invitation {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  statut: string;
  expires_at: string;
  created_at: string;
}

export default function EnseignantInvitationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: etablissementId } = useLocalSearchParams<{ id: string }>();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [etablissementNom, setEtablissementNom] = useState<string>('');
  const { getInvitationsRecues, accepterInvitation } = useEnseignantEtablissements();
  const [invitationsEtablissement, setInvitationsEtablissement] = useState<any[]>([]);

  useEffect(() => {
    if (etablissementId) {
      fetchInvitations();
      fetchEtablissementNom();
    } else {
      setLoading(false);
    }
    loadInvitationsEtablissement();
  }, [etablissementId]);

  const fetchEtablissementNom = async () => {
    if (!etablissementId) return;
    
    try {
      const { data, error } = await supabase
        .from('etablissements')
        .select('nom')
        .eq('id', etablissementId)
        .single();
      
      if (error) throw error;
      setEtablissementNom(data?.nom || '');
    } catch (error) {
      console.error('Error fetching etablissement nom:', error);
    }
  };

  const fetchInvitations = async () => {
    if (!etablissementId) return;

    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .eq('role', 'enseignant')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedInvitations: Invitation[] = (data || []).map(item => ({
        id: item.id,
        email: item.email || '',
        nom: item.nom || '',
        prenom: item.prenom || '',
        role: item.role,
        statut: item.statut || (item.is_active && new Date(item.expires_at) > new Date() ? 'en_attente' : 'expiree'),
        expires_at: item.expires_at,
        created_at: item.created_at,
      }));

      setInvitations(formattedInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      Alert.alert('Erreur', 'Impossible de charger les invitations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadInvitationsEtablissement = async () => {
    const data = await getInvitationsRecues();
    setInvitationsEtablissement(data.filter(i => i.statut === 'en_attente'));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvitations();
    loadInvitationsEtablissement();
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      const { error } = await supabase.functions.invoke('send-enseignant-invitation', {
        body: {
          invitation_id: invitation.id,
          email: invitation.email,
          etablissement_id: etablissementId,
          nom: invitation.nom,
          prenom: invitation.prenom,
        },
      });

      if (error) throw error;
      Alert.alert('Succès', 'Invitation renvoyée avec succès');
    } catch (error) {
      console.error('Error resending invitation:', error);
      Alert.alert('Erreur', 'Impossible de renvoyer l\'invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    Alert.alert(
      'Annuler l\'invitation',
      'Êtes-vous sûr de vouloir annuler cette invitation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('invitation_codes')
                .update({ is_active: false, statut: 'expiree' })
                .eq('id', invitationId);

              if (error) throw error;
              fetchInvitations();
              Alert.alert('Succès', 'Invitation annulée');
            } catch (error) {
              console.error('Error canceling invitation:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler l\'invitation');
            }
          },
        },
      ]
    );
  };

  const handleAccepterInvitationEtablissement = async (invitation: any) => {
    const result = await accepterInvitation(invitation.id, invitation.code);
    if (result.success) {
      Alert.alert('Succès', `Vous avez rejoint ${invitation.etablissement_nom}`);
      loadInvitationsEtablissement();
    } else {
      Alert.alert('Erreur', result.error || 'Impossible d\'accepter l\'invitation');
    }
  };

  const getStatusConfig = (statut: string, expires_at?: string) => {
    if (statut === 'acceptee') {
      return { icon: CheckCircle, color: '#10B981', label: 'Acceptée' };
    }
    if (statut === 'expiree') {
      return { icon: XCircle, color: '#EF4444', label: 'Expirée' };
    }
    if (expires_at && new Date(expires_at) < new Date()) {
      return { icon: XCircle, color: '#EF4444', label: 'Expirée' };
    }
    return { icon: Clock, color: '#F59E0B', label: 'En attente' };
  };

  // Format avec date ET heure
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des invitations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Invitations</Text>
          {etablissementNom && (
            <View style={styles.subtitleContainer}>
              <Building2 size={12} color={theme.colors.neutral[500]} />
              <Text style={styles.subtitle}> {etablissementNom}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
          <RefreshCw size={20} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {/* Invitations à rejoindre un établissement */}
      {invitationsEtablissement.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🏫 Invitations à rejoindre un établissement</Text>
          {invitationsEtablissement.map((inv) => (
            <View key={inv.id} style={styles.invitationItem}>
              <View>
                <Text style={styles.invitationName}>{inv.etablissement_nom}</Text>
                {inv.message && <Text style={styles.invitationMessage}>{inv.message}</Text>}
                <Text style={styles.invitationExpiry}>
                  Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccepterInvitationEtablissement(inv)}
              >
                <Text style={styles.acceptButtonText}>Accepter</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      {invitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Mail size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucune invitation</Text>
          <Text style={styles.emptyText}>
            Vous n'avez envoyé aucune invitation à un enseignant.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push(`/(app)/(sidebar)/enseignants/inviter?id=${etablissementId}`)}
          >
            <Text style={styles.emptyButtonText}>Inviter un enseignant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {invitations.map((invitation) => {
            const statusConfig = getStatusConfig(invitation.statut, invitation.expires_at);
            const StatusIcon = statusConfig.icon;
            const statusColor = statusConfig.color;
            
            return (
              <Card key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationHeader}>
                  <Mail size={20} color={theme.colors.primary.DEFAULT} />
                  <View style={styles.invitationInfo}>
                    <Text style={styles.invitationName}>
                      {invitation.prenom} {invitation.nom}
                    </Text>
                    <Text style={styles.invitationEmail}>{invitation.email}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <StatusIcon size={12} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.invitationDetails}>
                  <Text style={styles.detailText}>
                    Envoyée le {formatDateTime(invitation.created_at)}
                  </Text>
                  {invitation.expires_at && (
                    <Text style={styles.detailText}>
                      Expire le {formatDateTime(invitation.expires_at)}
                    </Text>
                  )}
                </View>

                {statusConfig.label === 'En attente' && (
                  <View style={styles.invitationActions}>
                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={() => handleResendInvitation(invitation)}
                    >
                      <RefreshCw size={14} color={theme.colors.primary.DEFAULT} />
                      <Text style={styles.resendButtonText}>Renvoyer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelInvitation(invitation.id)}
                    >
                      <XCircle size={14} color="#EF4444" />
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  refreshButton: {
    padding: 8,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  invitationCard: {
    padding: 16,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  invitationEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  invitationDetails: {
    marginBottom: 12,
    paddingLeft: 32,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  resendButtonText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    margin: 16,
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  invitationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  invitationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  invitationMessage: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  invitationExpiry: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  acceptButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});