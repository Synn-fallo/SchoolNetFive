// /home/project/app/(app)/(sidebar)/eleves/demande/[id].tsx
// Détail d'une demande d'auto-inscription pour l'admin

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { getDemandeAutoInscriptionById, validerDemandeAutoInscription, DemandeListe } from '@/services/autoInscriptionService';
import { supabase } from '@/lib/supabase';
import MotifRefusSelect from '@/components/demande/MotifRefusSelect';
import { CheckCircle, XCircle, Clock, User, Phone, Mail, Calendar, BookOpen, Building2, ArrowLeft, AlertCircle } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

export default function DemandeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { activeEtablissement } = useActiveEtablissement();
  
  const [demande, setDemande] = useState<DemandeListe | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  const [showMotifModal, setShowMotifModal] = useState(false);

  // Charger la demande d'abord
  useEffect(() => {
    if (id) {
      loadDemande();
    }
  }, [id]);

  // Charger les classes UNE FOIS que la demande est chargée
  useEffect(() => {
    if (demande?.etablissement_id) {
      loadClasses(demande.etablissement_id);
    }
  }, [demande?.etablissement_id]);

  const loadDemande = async () => {
    setLoading(true);
    try {
      const data = await getDemandeAutoInscriptionById(id);
      setDemande(data);
    } catch (error) {
      console.error('Erreur chargement demande:', error);
      Alert.alert('Erreur', 'Impossible de charger la demande');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async (etablissementId: string) => {
    try {
      console.log('🔍 Chargement classes pour établissement:', etablissementId);
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, nom')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true)
        .order('nom');

      if (error) throw error;
      
      console.log('🔍 Classes trouvées:', data?.length);
      setClasses(data || []);
    } catch (error) {
      console.error('Erreur chargement classes:', error);
    }
  };

  // ✅ VERSION CORRIGÉE de handleAccept
  const handleAccept = async () => {
    if (!selectedClasseId) {
      Alert.alert('Classe requise', 'Veuillez sélectionner une classe pour cet élève');
      return;
    }
    
    setProcessing(true);
    try {
      const result = await validerDemandeAutoInscription({
        demande_id: id,
        action: 'accept',
        classe_id: selectedClasseId,
      });

      if (result.success) {
        // ✅ Réinitialiser la classe sélectionnée
        setSelectedClasseId('');
        
        Alert.alert('Succès', 'Demande acceptée avec succès', [
          { 
            text: 'OK', 
            onPress: () => {
              loadDemande();
              router.back();
            } 
          }
        ]);
      } else {
        Alert.alert('Erreur', result.message || 'Une erreur est survenue');
        loadDemande();
      }
    } catch (error) {
      console.error('Erreur acceptation:', error);
      Alert.alert('Erreur', 'Impossible de traiter la demande');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (motifs: string[], motifMessage: string) => {
    setProcessing(true);
    
    try {
      const result = await validerDemandeAutoInscription({
        demande_id: id,
        action: 'reject',
        motif: motifMessage,
      });

      if (result.success) {
        Alert.alert('Succès', 'Demande refusée avec succès', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Erreur', result.message || 'Une erreur est survenue');
        loadDemande();
      }
    } catch (error) {
      console.error('Erreur refus:', error);
      Alert.alert('Erreur', 'Impossible de traiter la demande');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#D97706', label: 'En attente de validation', icon: Clock };
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

  const getMotifRefusText = (motif: any): string => {
    if (!motif) return '';
    if (typeof motif === 'string') return motif;
    if (Array.isArray(motif)) return motif.join(', ');
    return String(motif);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de la demande...</Text>
      </View>
    );
  }

  if (!demande) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorText}>Demande non trouvée</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getStatusBadge(demande.statut);
  const StatusIcon = status.icon;
  const isPending = demande.statut === 'pending';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Détail de la demande</Text>
            <View style={[styles.statusHeaderBadge, { backgroundColor: status.bg }]}>
              <StatusIcon size={14} color={status.text} />
              <Text style={[styles.statusHeaderText, { color: status.text }]}>{status.label}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Informations élève */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🎓 Élève</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom complet</Text>
            <Text style={styles.infoValue}>{demande.eleve_prenom} {demande.eleve_nom}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>EducMaster</Text>
            <Text style={styles.infoValue}>{demande.educmaster}</Text>
          </View>
          
          {demande.eleve_sexe && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sexe</Text>
              <Text style={styles.infoValue}>{demande.eleve_sexe === 'M' ? 'Masculin' : 'Féminin'}</Text>
            </View>
          )}
          
          {demande.eleve_date_naissance && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date de naissance</Text>
              <Text style={styles.infoValue}>{new Date(demande.eleve_date_naissance).toLocaleDateString('fr-FR')}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Classe souhaitée</Text>
            <Text style={styles.infoValue}>{demande.classe_souhaitee || 'Non spécifiée'}</Text>
          </View>
        </Card>

        {/* Informations parent */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧 Parent / Tuteur</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom complet</Text>
            <Text style={styles.infoValue}>{demande.parent_prenom} {demande.parent_nom}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Phone size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>{demande.parent_telephone}</Text>
          </View>
          
          {demande.parent_email && (
            <View style={styles.infoRow}>
              <Mail size={16} color={theme.colors.neutral[500]} />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{demande.parent_email}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lien de parenté</Text>
            <Text style={styles.infoValue}>
              {demande.parent_type_lien === 'pere' ? 'Père' : 
               demande.parent_type_lien === 'mere' ? 'Mère' :
               demande.parent_type_lien === 'tuteur' ? 'Tuteur' : 'Autre'}
            </Text>
          </View>
        </Card>

        {/* Informations établissement */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🏫 Établissement</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom</Text>
            <Text style={styles.infoValue}>{demande.etablissement_nom || demande.code_etablissement}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Code</Text>
            <Text style={styles.infoValue}>{demande.code_etablissement}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date de soumission</Text>
            <Text style={styles.infoValue}>{formatDate(demande.date_soumission)}</Text>
          </View>
          
          {demande.date_traitement && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date de traitement</Text>
              <Text style={styles.infoValue}>{formatDate(demande.date_traitement)}</Text>
            </View>
          )}
          
          {/* ✅ Motif de refus affiché UNIQUEMENT si la demande est refusée */}
          {demande.statut === 'rejected' && demande.motif_refus && (
            <View style={styles.rejectionReason}>
              <Text style={styles.rejectionLabel}>Motif du refus</Text>
              <Text style={styles.rejectionText}>{getMotifRefusText(demande.motif_refus)}</Text>
            </View>
          )}
        </Card>

        {/* Actions - Uniquement si demande en attente */}
        {isPending && (
          <Card style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>📋 Traitement de la demande</Text>
            
            <View style={styles.classeSelector}>
              <Text style={styles.classeLabel}>Classe d'affectation *</Text>
              <View style={styles.classeButtons}>
                {classes.length === 0 ? (
                  <Text style={styles.noClassesText}>Aucune classe disponible pour cet établissement</Text>
                ) : (
                  classes.map((classe) => (
                    <TouchableOpacity
                      key={classe.id}
                      style={[styles.classeButton, selectedClasseId === classe.id && styles.classeButtonActive]}
                      onPress={() => setSelectedClasseId(classe.id)}
                    >
                      <Text style={[styles.classeButtonText, selectedClasseId === classe.id && styles.classeButtonTextActive]}>
                        {classe.nom}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              {!selectedClasseId && classes.length > 0 && (
                <Text style={styles.classeError}>Veuillez sélectionner une classe</Text>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setShowMotifModal(true)}
                disabled={processing}
              >
                <XCircle size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Refuser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton, (!selectedClasseId || processing) && styles.actionButtonDisabled]}
                onPress={handleAccept}
                disabled={!selectedClasseId || processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Accepter</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Modal de sélection des motifs de refus (multi-sélection) */}
      <MotifRefusSelect
        visible={showMotifModal}
        selectedMotifs={[]}
        onSelect={(motifs, message) => handleReject(motifs, message)}
        onClose={() => setShowMotifModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  backIcon: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  statusHeaderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 120,
    marginLeft: 0,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  rejectionReason: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#991B1B',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: '#7F1D1D',
  },
  actionsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  classeSelector: {
    marginBottom: 20,
  },
  classeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  classeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  classeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  classeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  classeButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  classeButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  classeError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  noClassesText: {
    fontSize: 13,
    color: '#EF4444',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});