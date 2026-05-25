import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, User, ChevronLeft, CheckCircle, XCircle, MessageCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

interface RendezVous {
  id: string;
  parent_id: string;
  parent_nom: string;
  parent_prenom: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  date_rdv: string;
  heure_debut: string;
  heure_fin: string;
  motif: string;
  statut: 'en_attente' | 'confirme' | 'refuse' | 'annule' | 'termine';
  lieu: string;
  created_at: string;
}

export default function EnseignantRendezVousScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefusModal, setShowRefusModal] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<RendezVous | null>(null);
  const [motifRefus, setMotifRefus] = useState('');

  const chargerRendezVous = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rendez_vous')
        .select(`
          *,
          parent:parent_id (user_id),
          eleve:eleve_id (user_id)
        `)
        .eq('enseignant_id', user.id)
        .order('date_rdv', { ascending: true });

      if (error) throw error;

      const formatted: RendezVous[] = [];
      
      for (const rdv of data || []) {
        let parentNom = '', parentPrenom = '';
        let eleveNom = '', elevePrenom = '';

        if (rdv.parent?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nom, prenom')
            .eq('id', rdv.parent.user_id)
            .maybeSingle();
          if (profile) {
            parentNom = profile.nom;
            parentPrenom = profile.prenom;
          }
        }

        if (rdv.eleve?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nom, prenom')
            .eq('id', rdv.eleve.user_id)
            .maybeSingle();
          if (profile) {
            eleveNom = profile.nom;
            elevePrenom = profile.prenom;
          }
        }

        formatted.push({
          id: rdv.id,
          parent_id: rdv.parent_id,
          parent_nom: parentNom,
          parent_prenom: parentPrenom,
          eleve_id: rdv.eleve_id,
          eleve_nom: eleveNom,
          eleve_prenom: elevePrenom,
          date_rdv: rdv.date_rdv,
          heure_debut: rdv.heure_debut,
          heure_fin: rdv.heure_fin,
          motif: rdv.motif,
          statut: rdv.statut,
          lieu: rdv.lieu,
          created_at: rdv.created_at,
        });
      }

      setRendezVous(formatted);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const handleRepondre = async (rdvId: string, action: 'confirme' | 'refuse', motif?: string) => {
    try {
      const updateData: any = { statut: action };
      if (action === 'refuse' && motif) {
        updateData.motif_refus = motif;
      }

      const { error } = await supabase
        .from('rendez_vous')
        .update(updateData)
        .eq('id', rdvId);

      if (error) throw error;

      // TODO: Envoyer notification au parent      
      Alert.alert('Succès', action === 'confirme' ? 'Rendez-vous confirmé' : 'Rendez-vous refusé');
      chargerRendezVous();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de traiter la demande');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    chargerRendezVous();
  }, [chargerRendezVous]);

  useEffect(() => {
    chargerRendezVous();
  }, [chargerRendezVous]);

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'confirme': return { bg: '#D1FAE5', color: '#065F46', label: 'Confirmé' };
      case 'refuse': return { bg: '#FEE2E2', color: '#991B1B', label: 'Refusé' };
      case 'annule': return { bg: '#F3F4F6', color: '#6B7280', label: 'Annulé' };
      case 'termine': return { bg: '#EFF6FF', color: '#1E40AF', label: 'Terminé' };
      default: return { bg: '#FEF3C7', color: '#D97706', label: 'En attente' };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  const demandesEnAttente = rendezVous.filter(r => r.statut === 'en_attente');
  const autresRdv = rendezVous.filter(r => r.statut !== 'en_attente');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rendez-vous parents</Text>
        <View style={styles.headerRight} />
      </View>

      {demandesEnAttente.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Demandes en attente ({demandesEnAttente.length})</Text>
          {demandesEnAttente.map((rdv) => {
            const status = getStatutBadge(rdv.statut);
            return (
              <View key={rdv.id} style={styles.rdvCard}>
                <View style={styles.rdvHeader}>
                  <View style={styles.rdvParent}>
                    <User size={16} color={theme.colors.primary.DEFAULT} />
                    <Text style={styles.rdvParentName}>{rdv.parent_prenom} {rdv.parent_nom}</Text>
                  </View>
                  <View style={[styles.rdvStatus, { backgroundColor: status.bg }]}>
                    <Text style={[styles.rdvStatusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.rdvEleve}>Enfant : {rdv.eleve_prenom} {rdv.eleve_nom}</Text>
                <View style={styles.rdvDetails}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.rdvDetailText}>{new Date(rdv.date_rdv).toLocaleDateString('fr-FR')}</Text>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.rdvDetailText}>{rdv.heure_debut} - {rdv.heure_fin}</Text>
                </View>
                <Text style={styles.rdvMotif}>{rdv.motif}</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.confirmButton} onPress={() => handleRepondre(rdv.id, 'confirme')}>
                    <CheckCircle size={16} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.refuseButton} onPress={() => {
                    setSelectedRdv(rdv);
                    setShowRefusModal(true);
                  }}>
                    <XCircle size={16} color="#EF4444" />
                    <Text style={styles.refuseButtonText}>Refuser</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {autresRdv.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Historique</Text>
          {autresRdv.map((rdv) => {
            const status = getStatutBadge(rdv.statut);
            return (
              <View key={rdv.id} style={styles.rdvCard}>
                <View style={styles.rdvHeader}>
                  <View style={styles.rdvParent}>
                    <User size={16} color={theme.colors.neutral[500]} />
                    <Text style={styles.rdvParentName}>{rdv.parent_prenom} {rdv.parent_nom}</Text>
                  </View>
                  <View style={[styles.rdvStatus, { backgroundColor: status.bg }]}>
                    <Text style={[styles.rdvStatusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.rdvEleve}>Enfant : {rdv.eleve_prenom} {rdv.eleve_nom}</Text>
                <View style={styles.rdvDetails}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.rdvDetailText}>{new Date(rdv.date_rdv).toLocaleDateString('fr-FR')}</Text>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.rdvDetailText}>{rdv.heure_debut} - {rdv.heure_fin}</Text>
                </View>
                <Text style={styles.rdvMotif}>{rdv.motif}</Text>
                {rdv.statut === 'refuse' && rdv.motif_refus && (
                  <Text style={styles.refusMotif}>Motif : {rdv.motif_refus}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {rendezVous.length === 0 && (
        <View style={styles.emptyContainer}>
          <MessageCircle size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucune demande</Text>
          <Text style={styles.emptyText}>Vous n'avez pas encore de demande de rendez-vous.</Text>
        </View>
      )}

      <Modal visible={showRefusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Motif du refus</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Expliquez le motif du refus..."
              value={motifRefus}
              onChangeText={setMotifRefus}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowRefusModal(false); setMotifRefus(''); }}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => {
                if (selectedRdv) {
                  handleRepondre(selectedRdv.id, 'refuse', motifRefus);
                  setShowRefusModal(false);
                  setMotifRefus('');
                }
              }}>
                <Text style={styles.modalConfirmText}>Confirmer le refus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 16 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerRight: { width: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  rdvCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  rdvHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rdvParent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rdvParentName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  rdvStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  rdvStatusText: { fontSize: 11, fontWeight: '500' },
  rdvEleve: { fontSize: 13, color: theme.colors.primary.DEFAULT, marginBottom: 8 },
  rdvDetails: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  rdvDetailText: { fontSize: 13, color: '#6B7280' },
  rdvMotif: { fontSize: 13, color: '#374151', marginBottom: 12 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  confirmButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  confirmButtonText: { fontSize: 13, fontWeight: '500', color: '#FFFFFF' },
  refuseButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  refuseButtonText: { fontSize: 13, fontWeight: '500', color: '#EF4444' },
  refusMotif: { fontSize: 12, color: '#EF4444', marginTop: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#1F2937' },
  emptyText: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#1F2937', minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  modalConfirm: { flex: 1, backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});