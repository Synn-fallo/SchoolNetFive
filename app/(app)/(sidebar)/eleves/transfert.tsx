// /home/project/app/(app)/(sidebar)/eleves/transfert.tsx
// Interface pour demander le transfert d'un élève

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { demanderTransfert, hasTransfertEnCours, getHistoriqueTransferts } from '@/services/transfertService';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { ArrowLeft, Building2, User, AlertCircle, CheckCircle, Clock, Send } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  educmaster?: string;
  etablissement_id: string;
  classe_nom?: string;
  statut: string;
}

interface Etablissement {
  id: string;
  nom: string;
  ville?: string;
  code_etablissement?: string;
}

export default function TransfertEleveScreen() {
  const router = useRouter();
  const { id: eleveIdParam } = useLocalSearchParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const { activeEtablissement } = useActiveEtablissement();
  
  const [eleve, setEleve] = useState<Eleve | null>(null);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [selectedEtablissementId, setSelectedEtablissementId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasTransfertEnCoursFlag, setHasTransfertEnCoursFlag] = useState(false);
  const [historique, setHistorique] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (eleveIdParam) {
      loadEleve();
      loadEtablissements();
      checkTransfertStatus();
      loadHistorique();
    }
  }, [eleveIdParam]);

  const loadEleve = async () => {
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select(`
          id,
          user_id,
          educmaster,
          classe_id,
          statut,
          profiles:user_id (nom, prenom),
          classes:classe_id (nom)
        `)
        .eq('id', eleveIdParam)
        .single();

      if (error) throw error;

      setEleve({
        id: data.id,
        nom: (data.profiles as any)?.nom || '',
        prenom: (data.profiles as any)?.prenom || '',
        educmaster: data.educmaster,
        etablissement_id: activeEtablissement?.id || '',
        classe_nom: (data.classes as any)?.nom,
        statut: data.statut,
      });
    } catch (error) {
      console.error('Erreur chargement élève:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations de l\'élève');
    }
  };

  const loadEtablissements = async () => {
    try {
      const { data, error } = await supabase
        .from('etablissements')
        .select('id, nom, ville, code_etablissement')
        .neq('id', activeEtablissement?.id)
        .order('nom');

      if (error) throw error;
      setEtablissements(data || []);
    } catch (error) {
      console.error('Erreur chargement établissements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTransfertStatus = async () => {
    if (eleveIdParam) {
      const enCours = await hasTransfertEnCours(eleveIdParam);
      setHasTransfertEnCoursFlag(enCours);
    }
  };

  const loadHistorique = async () => {
    if (eleveIdParam) {
      const historiqueData = await getHistoriqueTransferts(eleveIdParam);
      setHistorique(historiqueData);
    }
  };

  const handleDemanderTransfert = async () => {
    if (!selectedEtablissementId) {
      Alert.alert('Établissement requis', 'Veuillez sélectionner un établissement cible');
      return;
    }

    if (!eleve) return;

    setSubmitting(true);
    try {
      const result = await demanderTransfert(eleve.id, selectedEtablissementId);

      if (result.success) {
        Alert.alert(
          'Demande envoyée',
          'Votre demande de transfert a été envoyée. L\'établissement d\'origine doit la valider.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (result.requires_invitation) {
        Alert.alert(
          'Établissement non abonné',
          `${result.etablissement_nom} n'utilise pas encore SchoolNet. Contactez-les directement pour organiser le transfert.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de demander le transfert');
      }
    } catch (error) {
      console.error('Erreur demande transfert:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEtablissements = searchQuery
    ? etablissements.filter(e => 
        e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.ville?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : etablissements;

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'pending_origine':
        return { label: 'En attente validation origine', color: '#D97706', icon: Clock };
      case 'accepte_origine':
        return { label: 'Accepté par origine', color: '#10B981', icon: CheckCircle };
      case 'refuse_origine':
        return { label: 'Refusé', color: '#EF4444', icon: AlertCircle };
      case 'complete':
        return { label: 'Complété', color: '#3B82F6', icon: CheckCircle };
      default:
        return { label: statut, color: '#6B7280', icon: Clock };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!eleve) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorText}>Élève non trouvé</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfert d'élève</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Informations élève */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍🎓 Élève à transférer</Text>
        
        <View style={styles.infoRow}>
          <User size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoLabel}>Nom complet</Text>
          <Text style={styles.infoValue}>{eleve.prenom} {eleve.nom}</Text>
        </View>
        
        {eleve.educmaster && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>EducMaster</Text>
            <Text style={styles.infoValue}>{eleve.educmaster}</Text>
          </View>
        )}
        
        {eleve.classe_nom && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Classe actuelle</Text>
            <Text style={styles.infoValue}>{eleve.classe_nom}</Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Statut</Text>
          <Text style={styles.infoValue}>
            {eleve.statut === 'actif' ? 'Actif' : eleve.statut === 'PRE_ACCEPTED' ? 'Pré-inscrit' : eleve.statut}
          </Text>
        </View>
      </Card>

      {/* Alerte si transfert en cours */}
      {hasTransfertEnCoursFlag && (
        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <AlertCircle size={20} color="#D97706" />
            <Text style={styles.warningTitle}>Transfert en cours</Text>
          </View>
          <Text style={styles.warningText}>
            Une demande de transfert est déjà en cours pour cet élève.
            Veuillez patienter jusqu'à la réponse de l'établissement.
          </Text>
        </Card>
      )}

      {/* Sélection établissement cible */}
      {!hasTransfertEnCoursFlag && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🏫 Établissement cible</Text>
          
          <Text style={styles.inputLabel}>Rechercher un établissement</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Nom ou ville..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.etablissementsList}>
            {filteredEtablissements.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aucun établissement trouvé' : 'Aucun autre établissement disponible'}
              </Text>
            ) : (
              filteredEtablissements.map((etab) => (
                <TouchableOpacity
                  key={etab.id}
                  style={[
                    styles.etablissementOption,
                    selectedEtablissementId === etab.id && styles.etablissementOptionActive,
                  ]}
                  onPress={() => setSelectedEtablissementId(etab.id)}
                >
                  <Building2 size={20} color={selectedEtablissementId === etab.id ? theme.colors.primary.DEFAULT : theme.colors.neutral[500]} />
                  <View style={styles.etablissementInfo}>
                    <Text style={[styles.etablissementNom, selectedEtablissementId === etab.id && styles.etablissementNomActive]}>
                      {etab.nom}
                    </Text>
                    {etab.ville && (
                      <Text style={styles.etablissementVille}>{etab.ville}</Text>
                    )}
                    {etab.code_etablissement && (
                      <Text style={styles.etablissementCode}>Code: {etab.code_etablissement}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Card>
      )}

      {/* Historique des demandes */}
      {historique.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Historique des demandes</Text>
          
          {historique.map((demande) => {
            const status = getStatusLabel(demande.statut);
            const StatusIcon = status.icon;
            return (
              <View key={demande.id} style={styles.historiqueItem}>
                <View style={styles.historiqueHeader}>
                  <StatusIcon size={14} color={status.color} />
                  <Text style={[styles.historiqueStatus, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
                <Text style={styles.historiqueDate}>
                  {new Date(demande.date_demande).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            );
          })}
        </Card>
      )}

      {/* Bouton de soumission */}
      {!hasTransfertEnCoursFlag && (
        <TouchableOpacity
          style={[styles.submitButton, (!selectedEtablissementId || submitting) && styles.submitButtonDisabled]}
          onPress={handleDemanderTransfert}
          disabled={!selectedEtablissementId || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Demander le transfert</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
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
    width: 100,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  warningCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  etablissementsList: {
    maxHeight: 300,
  },
  etablissementOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  etablissementOptionActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  etablissementInfo: {
    flex: 1,
  },
  etablissementNom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  etablissementNomActive: {
    color: theme.colors.primary.DEFAULT,
  },
  etablissementVille: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  etablissementCode: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  historiqueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historiqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historiqueStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  historiqueDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary.DEFAULT,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// Import manquant pour TextInput
import { TextInput } from 'react-native';