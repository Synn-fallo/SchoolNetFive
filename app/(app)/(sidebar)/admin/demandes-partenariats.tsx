import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import RequestStatus from '@/components/institution/RequestStatus';
import AdminRequestReview from '@/components/institution/AdminRequestReview';
import SearchBar from '@/components/public/SearchBar';
import { Filter, RefreshCw } from 'lucide-react-native';

interface DemandePartenariat {
  id: string;
  organisation_nom: string;
  type_partenaire: string;
  type_collaboration: string;
  contact_nom: string;
  contact_email: string;
  contact_telephone: string;
  proposition: string;
  statut: 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'annule';
  created_at: string;
  demandeur_id: string;
  demandeur_nom?: string;
  demandeur_prenom?: string;
}

type StatutFiltre = 'tous' | 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'annule';

const STATUT_FILTRES: { label: string; value: StatutFiltre }[] = [
  { label: 'Tous', value: 'tous' },
  { label: 'En attente', value: 'en_attente' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Validé', value: 'valide' },
  { label: 'Rejeté', value: 'rejete' },
  { label: 'Annulé', value: 'annule' },
];

export default function DemandesPartenariatsScreen() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<DemandePartenariat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statutFiltre, setStatutFiltre] = useState<StatutFiltre>('tous');
  const [selectedDemande, setSelectedDemande] = useState<DemandePartenariat | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !hasRole('admin')) {
      router.replace('/(app)/(tabs)');
    }
  }, [authLoading, hasRole]);

  useEffect(() => {
    fetchDemandes();
  }, [statutFiltre]);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('demandes_partenariat')
        .select(`
          *,
          profiles:demandeur_id (
            nom,
            prenom
          )
        `)
        .order('created_at', { ascending: false });

      if (statutFiltre !== 'tous') {
        query = query.eq('statut', statutFiltre);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        demandeur_nom: item.profiles?.nom,
        demandeur_prenom: item.profiles?.prenom,
      }));

      setDemandes(formattedData);
    } catch (error) {
      console.error('Error fetching demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDemandes();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectDemande = (demande: DemandePartenariat) => {
    setSelectedDemande(demande);
    setShowReviewModal(true);
  };

  const handleProcessed = () => {
    setShowReviewModal(false);
    setSelectedDemande(null);
    fetchDemandes();
  };

  const filteredDemandes = demandes.filter((demande) => {
    if (!searchQuery) return true;
    return demande.organisation_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
           demande.contact_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
           demande.contact_email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatutCount = (statut: StatutFiltre) => {
    if (statut === 'tous') return demandes.length;
    return demandes.filter(d => d.statut === statut).length;
  };

  const getTypePartenaireLabel = (type: string) => {
    const labels: Record<string, string> = {
      ong: 'ONG',
      operateur_telecom: 'Opérateur télécom',
      editeur: 'Éditeur',
      sponsor: 'Sponsor',
      autre: 'Autre',
    };
    return labels[type] || type;
  };

  const renderDemandeCard = ({ item }: { item: DemandePartenariat }) => (
    <TouchableOpacity onPress={() => handleSelectDemande(item)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.organisationName}>{item.organisation_nom}</Text>
          <RequestStatus status={item.statut} />
        </View>
        <Text style={styles.type}>Type: {getTypePartenaireLabel(item.type_partenaire)}</Text>
        <Text style={styles.contact}>👤 {item.contact_nom}</Text>
        <Text style={styles.contact}>📧 {item.contact_email}</Text>
        <Text style={styles.contact}>📞 {item.contact_telephone}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.demandeur}>
            Demandeur: {item.demandeur_prenom} {item.demandeur_nom}
          </Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (authLoading || (loading && !refreshing)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Demandes de partenariat</Text>
        <Text style={styles.subtitle}>
          Gérez les demandes de partenariat avec SchoolNet
        </Text>
      </View>

      {/* Barre de recherche et filtres */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <SearchBar onSearch={handleSearch} placeholder="Rechercher par organisation, contact..." />
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Filter size={20} color="#4B5563" />
            <Text style={styles.filterButtonText}>Filtres</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <RefreshCw size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Badges de filtres rapides */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {STATUT_FILTRES.map((filtre) => (
            <TouchableOpacity
              key={filtre.value}
              style={[
                styles.chip,
                statutFiltre === filtre.value && styles.chipActive,
              ]}
              onPress={() => setStatutFiltre(filtre.value)}
            >
              <Text style={[
                styles.chipText,
                statutFiltre === filtre.value && styles.chipTextActive,
              ]}>
                {filtre.label} ({getStatutCount(filtre.value)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des demandes */}
      <FlatList
        data={filteredDemandes}
        keyExtractor={(item) => item.id}
        renderItem={renderDemandeCard}
        contentContainerStyle={styles.list}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune demande trouvée</Text>
          </View>
        }
      />

      {/* Modal de filtres avancés */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrer par statut</Text>
            {STATUT_FILTRES.map((filtre) => (
              <TouchableOpacity
                key={filtre.value}
                style={[
                  styles.modalOption,
                  statutFiltre === filtre.value && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setStatutFiltre(filtre.value);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  statutFiltre === filtre.value && styles.modalOptionTextActive,
                ]}>
                  {filtre.label}
                </Text>
                {statutFiltre === filtre.value && (
                  <Text style={styles.modalCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de revue de demande */}
      {selectedDemande && (
        <Modal
          visible={showReviewModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View style={styles.fullModalOverlay}>
            <View style={styles.fullModalContent}>
              <AdminRequestReview
                request={selectedDemande}
                type="partenariat"
                onProcessed={handleProcessed}
                onClose={() => setShowReviewModal(false)}
              />
            </View>
          </View>
        </Modal>
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  refreshButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3B82F6',
  },
  chipText: {
    fontSize: 12,
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  organisationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  type: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  contact: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  demandeur: {
    fontSize: 12,
    color: '#6B7280',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionActive: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  modalCheck: {
    fontSize: 18,
    color: '#3B82F6',
  },
  modalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  fullModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullModalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    overflow: 'hidden',
  },
});