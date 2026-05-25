import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { UserCheck, Plus, UserCog, Calendar, Building2, Clock } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

interface Delegation {
  id: string;
  delegue_id: string;
  delegue_nom: string;
  delegue_prenom: string;
  delegue_email: string;
  type: string;
  role_delegue: string;
  departement?: string;
  plafond?: number;
  is_active: boolean;
  date_debut: string;
  date_fin: string | null;
  created_at: string;
  revoquee_at: string | null;
}

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'financiere': return 'Financière';
    case 'pedagogique': return 'Pédagogique';
    case 'administrative': return 'Administrative';
    default: return type;
  }
};

const getRoleDelegueLabel = (role: string): string => {
  switch (role) {
    case 'caissier': return 'Caissier';
    case 'assistant_comptable': return 'Assistant comptable';
    case 'comptable': return 'Comptable';
    case 'ae': return 'Animateur d\'Établissement';
    case 'de': return 'Directeur des Études';
    case 'personnel_administratif': return 'Personnel Administratif';
    case 'personnel_vie_scolaire': return 'Personnel Vie Scolaire';
    default: return role;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function DelegationsListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: etablissementId } = useLocalSearchParams<{ id: string }>();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [etablissementNom, setEtablissementNom] = useState<string>('');

  useEffect(() => {
    if (etablissementId) {
      fetchDelegations();
      fetchEtablissementNom();
    } else {
      setLoading(false);
    }
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

  const fetchDelegations = async () => {
    if (!etablissementId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delegations')
        .select(`
          id,
          delegue_id,
          type,
          role_delegue,
          departement,
          plafond,
          is_active,
          date_debut,
          date_fin,
          created_at,
          revoquee_at,
          profiles:delegue_id (nom, prenom)
        `)
        .eq('etablissement_id', etablissementId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setDelegations([]);
        setLoading(false);
        return;
      }

      const delegationsWithEmail: Delegation[] = [];
      
      for (const item of data) {
        let email = '';
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', item.delegue_id)
          .single();
        
        if (!userError && userData) {
          email = userData.email;
        }
        
        const profile = item.profiles as any;
        
        delegationsWithEmail.push({
          id: item.id,
          delegue_id: item.delegue_id,
          delegue_nom: profile?.nom || '',
          delegue_prenom: profile?.prenom || '',
          delegue_email: email,
          type: item.type,
          role_delegue: item.role_delegue,
          departement: item.departement,
          plafond: item.plafond,
          is_active: item.is_active,
          date_debut: item.date_debut,
          date_fin: item.date_fin,
          created_at: item.created_at,
          revoquee_at: item.revoquee_at,
        });
      }

      setDelegations(delegationsWithEmail);
    } catch (error) {
      console.error('Error fetching delegations:', error);
      Alert.alert('Erreur', 'Impossible de charger les délégations');
    } finally {
      setLoading(false);
    }
  };

  const handleNewDelegation = () => {
    router.push(`/(app)/(sidebar)/delegations/nouvelle?id=${etablissementId}`);
  };

  const isDelegationActive = (delegation: Delegation): boolean => {
    if (!delegation.is_active) return false;
    if (delegation.revoquee_at) return false;
    if (delegation.date_fin) {
      return new Date(delegation.date_fin) >= new Date();
    }
    return true;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Délégations</Text>
          {etablissementNom && (
            <View style={styles.subtitleContainer}>
              <Building2 size={12} color={theme.colors.neutral[500]} />
              <Text style={styles.subtitle}> {etablissementNom}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleNewDelegation}>
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {delegations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <UserCheck size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucune délégation</Text>
          <Text style={styles.emptyText}>
            Vous n'avez pas encore créé de délégation.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleNewDelegation}>
            <Text style={styles.emptyButtonText}>Créer une délégation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {delegations.map((delegation) => {
            const active = isDelegationActive(delegation);
            return (
              <Card key={delegation.id} style={styles.delegationCard}>
                <View style={styles.delegationHeader}>
                  <UserCog size={20} color={theme.colors.primary.DEFAULT} />
                  <View style={styles.delegationInfo}>
                    <Text style={styles.delegationName}>
                      {delegation.delegue_prenom} {delegation.delegue_nom}
                    </Text>
                    <Text style={styles.delegationType}>
                      {getRoleDelegueLabel(delegation.role_delegue)} • {getTypeLabel(delegation.type)}
                    </Text>
                    {delegation.departement && (
                      <Text style={styles.delegationDepartement}>Département: {delegation.departement}</Text>
                    )}
                    {delegation.plafond && (
                      <Text style={styles.delegationPlafond}>Plafond: {delegation.plafond}</Text>
                    )}
                    {delegation.date_fin && (
                      <View style={styles.dateInfo}>
                        <Clock size={12} color="#F59E0B" />
                        <Text style={styles.dateInfoText}>
                          Jusqu'au {formatDate(delegation.date_fin)}
                        </Text>
                      </View>
                    )}
                    {!delegation.date_fin && active && (
                      <View style={styles.permanentBadge}>
                        <Text style={styles.permanentText}>Permanent</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.activeBadge, active ? styles.activeTrue : styles.activeFalse]}>
                    <Text style={[styles.activeText, active ? styles.activeTextTrue : styles.activeTextFalse]}>
                      {active ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.delegationFooter}>
                  <Calendar size={14} color={theme.colors.neutral[400]} />
                  <Text style={styles.dateText}>
                    Créée le {formatDate(delegation.created_at)}
                  </Text>
                  {delegation.revoquee_at && (
                    <Text style={styles.revokedText}>
                      • Révoquée le {formatDate(delegation.revoquee_at)}
                    </Text>
                  )}
                </View>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  delegationCard: {
    padding: 16,
  },
  delegationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  delegationInfo: {
    flex: 1,
  },
  delegationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  delegationType: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    marginBottom: 2,
  },
  delegationDepartement: {
    fontSize: 12,
    color: '#6B7280',
  },
  delegationPlafond: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateInfoText: {
    fontSize: 11,
    color: '#F59E0B',
  },
  permanentBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  permanentText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeTrue: {
    backgroundColor: '#D1FAE5',
  },
  activeFalse: {
    backgroundColor: '#FEE2E2',
  },
  activeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeTextTrue: {
    color: '#10B981',
  },
  activeTextFalse: {
    color: '#EF4444',
  },
  delegationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  revokedText: {
    fontSize: 12,
    color: '#EF4444',
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
});