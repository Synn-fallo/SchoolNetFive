import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useRendezVous } from '@/hooks/useRendezVous';
import { Calendar, Clock, User, ChevronLeft, Plus, XCircle, CheckCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function ParentRendezVousScreen() {
  const router = useRouter();
  const { rendezVous, loading, error, annulerRendezVous, refetch } = useRendezVous();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAnnuler = (rdvId: string) => {
    Alert.alert(
      'Annuler le rendez-vous',
      'Voulez-vous vraiment annuler ce rendez-vous ?',
      [
        { text: 'Non', style: 'cancel' },
        { 
          text: 'Oui, annuler', 
          style: 'destructive',
          onPress: async () => {
            const result = await annulerRendezVous(rdvId);
            if (!result.success) {
              Alert.alert('Erreur', result.error || 'Impossible d\'annuler');
            }
          }
        }
      ]
    );
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'confirme': return { bg: '#D1FAE5', color: '#065F46', label: 'Confirmé', icon: CheckCircle };
      case 'refuse': return { bg: '#FEE2E2', color: '#991B1B', label: 'Refusé', icon: XCircle };
      case 'annule': return { bg: '#F3F4F6', color: '#6B7280', label: 'Annulé', icon: XCircle };
      case 'termine': return { bg: '#EFF6FF', color: '#1E40AF', label: 'Terminé', icon: CheckCircle };
      default: return { bg: '#FEF3C7', color: '#D97706', label: 'En attente', icon: null };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des rendez-vous...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rendez-vous</Text>
        <TouchableOpacity onPress={() => router.push('/parent/rendez-vous-form')} style={styles.addButton}>
          <Plus size={20} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Une erreur est survenue</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      ) : rendezVous.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
          <Text style={styles.emptyText}>Vous n'avez pas encore de rendez-vous programmés.</Text>
        </View>
      ) : (
        rendezVous.map((rdv) => {
          const status = getStatutBadge(rdv.statut);
          return (
            <View key={rdv.id} style={styles.rdvCard}>
              <View style={styles.rdvHeader}>
                <View style={styles.rdvEnseignant}>
                  <User size={16} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.rdvEnseignantName}>
                    {rdv.enseignant_prenom} {rdv.enseignant_nom}
                  </Text>
                </View>
                <View style={[styles.rdvStatus, { backgroundColor: status.bg }]}>
                  <Text style={[styles.rdvStatusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.rdvDetails}>
                <View style={styles.rdvDetail}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.rdvDetailText}>{new Date(rdv.date_rdv).toLocaleDateString('fr-FR')}</Text>
                </View>
                <View style={styles.rdvDetail}>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.rdvDetailText}>{rdv.heure_debut} - {rdv.heure_fin}</Text>
                </View>
              </View>

              <Text style={styles.rdvEleve}>Enfant : {rdv.eleve_prenom} {rdv.eleve_nom}</Text>
              <Text style={styles.rdvMotif}>{rdv.motif}</Text>

              {rdv.statut === 'refuse' && rdv.motif_refus && (
                <Text style={styles.rdvRefus}>Motif : {rdv.motif_refus}</Text>
              )}

              {rdv.statut === 'en_attente' && (
                <TouchableOpacity style={styles.annulerButton} onPress={() => handleAnnuler(rdv.id)}>
                  <Text style={styles.annulerButtonText}>Annuler la demande</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 16 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  addButton: { padding: 8, marginRight: -8 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: 300 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#EF4444' },
  errorSubtext: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#1F2937' },
  emptyText: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  rdvCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  rdvHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rdvEnseignant: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rdvEnseignantName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  rdvStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  rdvStatusText: { fontSize: 11, fontWeight: '500' },
  rdvDetails: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  rdvDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rdvDetailText: { fontSize: 13, color: '#6B7280' },
  rdvEleve: { fontSize: 13, color: theme.colors.primary.DEFAULT, marginBottom: 8 },
  rdvMotif: { fontSize: 13, color: '#374151', marginBottom: 10 },
  rdvRefus: { fontSize: 12, color: '#EF4444', marginBottom: 10 },
  annulerButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FEE2E2', borderRadius: 8 },
  annulerButtonText: { fontSize: 12, color: '#EF4444', fontWeight: '500' },
});