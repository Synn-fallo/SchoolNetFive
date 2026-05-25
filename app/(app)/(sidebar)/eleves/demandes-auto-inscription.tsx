// /home/project/app/(app)/(sidebar)/eleves/demandes-auto-inscription.tsx
// Liste des demandes d'auto-inscription pour l'admin

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { getDemandesAutoInscription, DemandeListe, countDemandesEnAttente } from '@/services/autoInscriptionService';
import { Clock, CheckCircle, XCircle, Eye, Calendar, User, Building2 } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

type FilterType = 'pending' | 'accepted' | 'rejected' | 'all';

export default function DemandesAutoInscriptionScreen() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const { activeEtablissement } = useActiveEtablissement();
  
  const [demandes, setDemandes] = useState<DemandeListe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<FilterType>('pending');

  const loadDemandes = useCallback(async () => {
    if (!activeEtablissement) return;
    
    setLoading(true);
    try {
      const data = await getDemandesAutoInscription({
        etablissement_id: activeEtablissement.id,
        statut: filter === 'all' ? undefined : filter,
      });
      setDemandes(data);
      
      const count = await countDemandesEnAttente(activeEtablissement.id);
      setPendingCount(count);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
    }
  }, [activeEtablissement, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDemandes();
    setRefreshing(false);
  }, [loadDemandes]);

  useEffect(() => {
    loadDemandes();
  }, [loadDemandes]);

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#D97706', label: 'En attente', icon: Clock };
      case 'accepted':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Acceptée', icon: CheckCircle };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Refusée', icon: XCircle };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', label: statut, icon: Clock };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDemandeCard = ({ item }: { item: DemandeListe }) => {
    const status = getStatusBadge(item.statut);
    const StatusIcon = status.icon;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/(sidebar)/eleves/demande/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.eleveName}>
                {item.eleve_prenom} {item.eleve_nom}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <StatusIcon size={12} color={status.text} />
                <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>
            <Text style={styles.dateText}>{formatDate(item.date_soumission)}</Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <User size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.detailLabel}>Parent:</Text>
              <Text style={styles.detailValue}>{item.parent_prenom} {item.parent_nom}</Text>
            </View>
            <View style={styles.detailRow}>
              <Building2 size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.detailLabel}>Classe souhaitée:</Text>
              <Text style={styles.detailValue}>{item.classe_souhaitee || 'Non spécifiée'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Calendar size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.detailLabel}>EducMaster:</Text>
              <Text style={styles.detailValue}>{item.educmaster}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.phoneContainer}>
              <Text style={styles.phoneLabel}>📞 {item.parent_telephone}</Text>
            </View>
            <TouchableOpacity style={styles.viewButton}>
              <Eye size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.viewButtonText}>Voir détails</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Clock size={48} color={theme.colors.neutral[400]} />
      </View>
      <Text style={styles.emptyTitle}>Aucune demande</Text>
      <Text style={styles.emptyText}>
        {filter === 'pending'
          ? 'Aucune demande d\'auto-inscription en attente'
          : filter === 'accepted'
          ? 'Aucune demande acceptée'
          : filter === 'rejected'
          ? 'Aucune demande refusée'
          : 'Aucune demande trouvée'}
      </Text>
    </View>
  );

  const filterTabs: { id: FilterType; label: string; count?: number }[] = [
    { id: 'pending', label: 'En attente', count: pendingCount },
    { id: 'accepted', label: 'Acceptées' },
    { id: 'rejected', label: 'Refusées' },
    { id: 'all', label: 'Toutes' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Demandes d'auto-inscription</Text>
        <Text style={styles.subtitle}>
          Gérez les demandes d'inscription des parents
        </Text>
      </View>

      <View style={styles.tabContainer}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, filter === tab.id && styles.tabActive]}
            onPress={() => setFilter(tab.id)}
          >
            <Text style={[styles.tabText, filter === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Chargement des demandes...</Text>
        </View>
      ) : (
        <FlatList
          data={demandes}
          renderItem={renderDemandeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: theme.colors.primary.DEFAULT,
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  eleveName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
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
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 110,
  },
  detailValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  phoneContainer: {
    flex: 1,
  },
  phoneLabel: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});