import { View, Text, StyleSheet, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import RequestList from '@/components/institution/RequestList';
import { Building2, Handshake, FileText, ChevronRight } from 'lucide-react-native';

interface RequestItem {
  id: string;
  created_at: string;
  statut: 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'annule';
  type: 'etablissement' | 'partenariat';
  nom_etablissement?: string;
  organisation_nom?: string;
  ville?: string;
  contact_nom?: string;
  etablissement_cree_id?: string;
}

export default function MesDemandesScreen() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEtablissement, setShowEtablissement] = useState(true);
  const [showPartenariat, setShowPartenariat] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [etablissementRes, partenariatRes] = await Promise.all([
        supabase
          .from('demandes_etablissement')
          .select('*')
          .eq('demandeur_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('demandes_partenariat')
          .select('*')
          .eq('demandeur_id', user?.id)
          .order('created_at', { ascending: false }),
      ]);

      const etablissements = (etablissementRes.data || []).map((r: any) => ({
        ...r,
        type: 'etablissement' as const,
      }));

      const partenariats = (partenariatRes.data || []).map((r: any) => ({
        ...r,
        type: 'partenariat' as const,
      }));

      setRequests([...etablissements, ...partenariats].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    const request = requests.find((r) => r.id === id);
    if (request) {
      router.push(`/(app)/(sidebar)/institution/${id}/detail`);
    }
  };

  // Vérifier si une demande validée d'établissement a un établissement créé
  const getValidatedEtablissement = () => {
    const validatedRequest = requests.find(
      (r) => r.type === 'etablissement' && r.statut === 'valide' && r.etablissement_cree_id
    );
    return validatedRequest;
  };

  const validatedEtablissement = getValidatedEtablissement();

  const filteredRequests = requests.filter((r) => {
    if (r.type === 'etablissement' && !showEtablissement) return false;
    if (r.type === 'partenariat' && !showPartenariat) return false;
    return true;
  });

  const getTitle = () => {
    if (showEtablissement && !showPartenariat) return 'Mes demandes d\'établissement';
    if (!showEtablissement && showPartenariat) return 'Mes demandes de partenariat';
    return 'Toutes mes demandes';
  };

  const handleCompleteEtablissement = () => {
    if (validatedEtablissement?.etablissement_cree_id) {
      router.push(`/(app)/(sidebar)/etablissement/gestion`);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.subtitle}>
          Suivez l'état de vos demandes
        </Text>
      </View>

      {/* Bandeau pour établissement validé */}
      {validatedEtablissement && (
        <TouchableOpacity style={styles.completeCard} onPress={handleCompleteEtablissement}>
          <Building2 size={24} color="#3B82F6" />
          <View style={styles.completeContent}>
            <Text style={styles.completeTitle}>Votre établissement est validé !</Text>
            <Text style={styles.completeSubtitle}>
              Complétez les informations de votre établissement pour le rendre visible.
            </Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}

      <View style={styles.filters}>
        <View style={styles.filterItem}>
          <Text style={[styles.filterLabel, showEtablissement && styles.filterLabelActive]}>
            Établissements ({requests.filter(r => r.type === 'etablissement').length})
          </Text>
          <Switch
            value={showEtablissement}
            onValueChange={setShowEtablissement}
            trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          />
        </View>
        <View style={styles.filterItem}>
          <Text style={[styles.filterLabel, showPartenariat && styles.filterLabelActive]}>
            Partenariats ({requests.filter(r => r.type === 'partenariat').length})
          </Text>
          <Switch
            value={showPartenariat}
            onValueChange={setShowPartenariat}
            trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          />
        </View>
      </View>

      {filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Aucune demande</Text>
          <Text style={styles.emptyText}>
            Vous n'avez pas encore soumis de demande.
          </Text>
          <View style={styles.emptyButtons}>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(app)/(sidebar)/institution/demande-etablissement')}
            >
              <Building2 size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Créer un établissement</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptyButton, styles.emptyButtonSecondary]}
              onPress={() => router.push('/(app)/(sidebar)/institution/demande-partenariat')}
            >
              <Handshake size={18} color="#4B5563" />
              <Text style={styles.emptyButtonTextSecondary}>Devenir partenaire</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <RequestList
          requests={filteredRequests}
          onSelect={handleSelect}
          loading={loading}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  completeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  completeContent: {
    flex: 1,
    marginLeft: 12,
  },
  completeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  completeSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  filterLabelActive: {
    color: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButtons: {
    gap: 12,
    width: '100%',
  },
  emptyButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyButtonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyButtonTextSecondary: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
});