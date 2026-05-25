import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Star, ArrowLeft, Mail } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { useEnseignantEtablissements, EtablissementRattache, InvitationRecue } from '@/hooks/useEnseignantEtablissements';
import theme from '@/constants/theme';

export default function RattachementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    getEtablissementsRattaches,
    getInvitationsRecues,
    accepterInvitation,
    setEtablissementPrincipal,
    retirerRattachement,
    loading,
  } = useEnseignantEtablissements();
  const [rattachements, setRattachements] = useState<EtablissementRattache[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecue[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [rattachementsData, invitationsData] = await Promise.all([
      getEtablissementsRattaches(),
      getInvitationsRecues(),
    ]);
    setRattachements(rattachementsData);
    setInvitations(invitationsData);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSetPrincipal = async (rattachementId: string) => {
    const result = await setEtablissementPrincipal(rattachementId);
    if (result.success) {
      await loadData();
      Alert.alert('Succès', 'Établissement principal défini');
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de définir l\'établissement principal');
    }
  };

  const handleRetirer = async (rattachementId: string, nom: string) => {
    Alert.alert(
      'Retirer l\'établissement',
      `Êtes-vous sûr de vouloir retirer "${nom}" de vos établissements rattachés ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            const result = await retirerRattachement(rattachementId);
            if (result.success) {
              await loadData();
              Alert.alert('Succès', 'Établissement retiré');
            } else {
              Alert.alert('Erreur', result.error || 'Impossible de retirer l\'établissement');
            }
          },
        },
      ]
    );
  };

  const handleAccepterInvitation = async (invitation: InvitationRecue) => {
    Alert.alert(
      'Accepter l\'invitation',
      `Souhaitez-vous rejoindre "${invitation.etablissement_nom}" en tant qu'enseignant ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            setAcceptingId(invitation.id);
            const result = await accepterInvitation(invitation.id, invitation.code);
            setAcceptingId(null);
            if (result.success) {
              await loadData();
              Alert.alert('Succès', `Vous avez rejoint ${invitation.etablissement_nom}`);
            } else {
              Alert.alert('Erreur', result.error || 'Impossible d\'accepter l\'invitation');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes établissements</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Rattachements actuels */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>📌 Établissements rattachés</Text>
        {rattachements.length === 0 ? (
          <Text style={styles.emptyText}>Aucun établissement rattaché</Text>
        ) : (
          rattachements.map((ratt) => (
            <View key={ratt.id} style={styles.rattachementItem}>
              <View style={styles.rattachementInfo}>
                <Building2 size={18} color={theme.colors.primary.DEFAULT} />
                <View>
                  <Text style={styles.rattachementNom}>{ratt.etablissement_nom}</Text>
                  <Text style={styles.rattachementRole}>{ratt.role === 'professeur_principal' ? 'Professeur Principal' : 'Enseignant'}</Text>
                </View>
                {ratt.est_principal && (
                  <View style={styles.principalBadge}>
                    <Star size={10} color="#D97706" />
                    <Text style={styles.principalText}>Principal</Text>
                  </View>
                )}
              </View>
              <View style={styles.rattachementActions}>
                {!ratt.est_principal && (
                  <TouchableOpacity onPress={() => handleSetPrincipal(ratt.id)}>
                    <Star size={18} color={theme.colors.neutral[500]} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleRetirer(ratt.id, ratt.etablissement_nom)}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Invitations reçues */}
      {invitations.filter(i => i.statut === 'en_attente').length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📧 Invitations en attente</Text>
          {invitations.filter(i => i.statut === 'en_attente').map((inv) => (
            <View key={inv.id} style={styles.invitationItem}>
              <View style={styles.invitationInfo}>
                <Mail size={18} color={theme.colors.primary.DEFAULT} />
                <View>
                  <Text style={styles.invitationNom}>{inv.etablissement_nom}</Text>
                  {inv.message && <Text style={styles.invitationMessage}>{inv.message}</Text>}
                  <Text style={styles.invitationDate}>
                    Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccepterInvitation(inv)}
                disabled={acceptingId === inv.id}
              >
                {acceptingId === inv.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.acceptButtonText}>Accepter</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      {/* Informations sur les invitations */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Comment ça marche ?</Text>
        <Text style={styles.infoText}>
          • Un établissement peut vous inviter à rejoindre son équipe enseignante.
        </Text>
        <Text style={styles.infoText}>
          • Vous recevrez un email avec un code d'invitation.
        </Text>
        <Text style={styles.infoText}>
          • Une fois acceptée, vous pourrez gérer vos classes pour cet établissement.
        </Text>
        <Text style={styles.infoText}>
          • Vous pouvez être rattaché à plusieurs établissements.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  rattachementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rattachementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rattachementNom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  rattachementRole: {
    fontSize: 11,
    color: '#6B7280',
  },
  principalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  principalText: {
    fontSize: 9,
    color: '#D97706',
    fontWeight: '500',
  },
  rattachementActions: {
    flexDirection: 'row',
    gap: 12,
  },
  invitationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  invitationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  invitationNom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  invitationMessage: {
    fontSize: 11,
    color: '#6B7280',
  },
  invitationDate: {
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
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
});