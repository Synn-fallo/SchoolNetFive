import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { DollarSign, UserPlus } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EleveSimple {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
}

interface Paiement {
  id: string;
  montant: number;
  statut: string;
  date_paiement: string;
  type: string;
  reference?: string;
}

export default function PaiementsScreen() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [enfants, setEnfants] = useState<EleveSimple[]>([]);
  const [selectedEnfantId, setSelectedEnfantId] = useState<string | null>(null);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPaiements, setLoadingPaiements] = useState(false);

  const isParent = hasRole('parent');

  useEffect(() => {
    if (isParent) {
      fetchEnfants();
    } else {
      setLoading(false);
    }
  }, [user, isParent]);

  useEffect(() => {
    if (selectedEnfantId) {
      fetchPaiements();
    }
  }, [selectedEnfantId]);

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

  const fetchPaiements = async () => {
    if (!selectedEnfantId) return;

    setLoadingPaiements(true);
    try {
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .eq('eleve_id', selectedEnfantId)
        .order('date_paiement', { ascending: false });

      if (error) throw error;
      setPaiements(data || []);
    } catch (error) {
      console.error('Error fetching paiements:', error);
    } finally {
      setLoadingPaiements(false);
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'paye': return '#10B981';
      case 'en_attente': return '#F59E0B';
      case 'echoue': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'paye': return 'Payé';
      case 'en_attente': return 'En attente';
      case 'echoue': return 'Échoué';
      default: return statut;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
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

  if (!isParent) {
    return (
      <View style={styles.centerContainer}>
        <DollarSign size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Accès restreint</Text>
        <Text style={styles.emptyText}>Cette section est réservée aux parents d'élèves.</Text>
      </View>
    );
  }

  if (enfants.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <DollarSign size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun enfant lié</Text>
        <Text style={styles.emptyText}>Pour voir les paiements, vous devez d'abord lier un enfant à votre compte.</Text>
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
        <DollarSign size={28} color={theme.colors.primary.DEFAULT} />
        <Text style={styles.title}>Paiements</Text>
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

          {loadingPaiements ? (
            <View style={styles.centerContainer}><ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} /></View>
          ) : paiements.length === 0 ? (
            <Card style={styles.emptyCard}>
              <DollarSign size={48} color={theme.colors.neutral[300]} />
              <Text style={styles.emptyCardTitle}>Aucun paiement</Text>
              <Text style={styles.emptyCardText}>Aucun paiement n'a été enregistré pour cet élève.</Text>
            </Card>
          ) : (
            paiements.map((paiement) => (
              <Card key={paiement.id} style={styles.paiementCard}>
                <View style={styles.paiementHeader}>
                  <View>
                    <Text style={styles.paiementType}>
                      {paiement.type === 'scolarite' ? 'Frais de scolarité' : 
                       paiement.type === 'cantine' ? 'Cantine' :
                       paiement.type === 'transport' ? 'Transport' :
                       paiement.type === 'activite' ? 'Activité' : paiement.type}
                    </Text>
                    {paiement.reference && <Text style={styles.paiementRef}>Réf: {paiement.reference}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(paiement.statut)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(paiement.statut) }]}>
                      {getStatusLabel(paiement.statut)}
                    </Text>
                  </View>
                </View>
                <View style={styles.paiementDetails}>
                  <Text style={styles.detailText}>{formatDate(paiement.date_paiement)}</Text>
                  <Text style={styles.paiementMontant}>{formatPrice(paiement.montant)} FCFA</Text>
                </View>
              </Card>
            ))
          )}
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
  emptyCard: { padding: 32, alignItems: 'center' },
  emptyCardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  emptyCardText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  paiementCard: { padding: 16, marginBottom: 12 },
  paiementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  paiementType: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  paiementRef: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '500' },
  paiementDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  detailText: { fontSize: 12, color: '#6B7280' },
  paiementMontant: { fontSize: 16, fontWeight: '700', color: theme.colors.primary.DEFAULT },
});