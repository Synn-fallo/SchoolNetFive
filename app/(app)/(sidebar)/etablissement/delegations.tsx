import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { UserPlus, Trash2, Users, BookOpen, Briefcase, Shield, ChevronDown } from 'lucide-react-native';
import DelegationForm from '@/components/etablissement/DelegationForm';
import theme from '@/constants/theme';

interface Delegation {
  id: string;
  delegue_id: string;
  type: string;
  departement?: string;
  plafond?: number;
  droits: { lecture: boolean; ecriture: boolean };
  is_active: boolean;
  created_at: string;
  delegue?: {
    id: string;
    email: string;
    profiles?: {
      nom: string;
      prenom: string;
    };
  };
}

interface EtablissementOption {
  id: string;
  nom: string;
}

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'directeur_etudes': return 'Directeur des Études';
    case 'animateur_etablissement': return 'Animateur d\'Établissement';
    case 'personnel_administratif': return 'Personnel Administratif';
    case 'personnel_vie_scolaire': return 'Personnel Vie Scolaire';
    default: return type;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'directeur_etudes': return BookOpen;
    case 'animateur_etablissement': return Users;
    case 'personnel_administratif': return Briefcase;
    case 'personnel_vie_scolaire': return Shield;
    default: return Users;
  }
};

export default function DelegationsScreen() {
  const { user, isChefEtablissement } = useAuth();
  const router = useRouter();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [etablissements, setEtablissements] = useState<EtablissementOption[]>([]);
  const [selectedEtablissementId, setSelectedEtablissementId] = useState<string | null>(null);
  const [showEtablissementSelector, setShowEtablissementSelector] = useState(false);

  useEffect(() => {
    if (!isChefEtablissement) {
      Alert.alert('Accès non autorisé', 'Seul le chef d\'établissement peut gérer les délégations.');
      router.back();
    }
  }, [isChefEtablissement]);

  useEffect(() => {
    fetchEtablissements();
  }, [user]);

  useEffect(() => {
    if (selectedEtablissementId) {
      fetchDelegations();
    }
  }, [selectedEtablissementId]);

  const fetchEtablissements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          etablissement_id,
          etablissements:etablissement_id (
            id,
            nom
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'chef_etablissement')
        .eq('is_active', true);

      if (error) throw error;

      const etabs = (data || [])
        .filter(item => item.etablissements)
        .map(item => ({
          id: item.etablissements.id,
          nom: item.etablissements.nom,
        }));

      setEtablissements(etabs);
      
      if (etabs.length > 0) {
        setSelectedEtablissementId(etabs[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching etablissements:', error);
      Alert.alert('Erreur', 'Impossible de charger les établissements');
      setLoading(false);
    }
  };

  const fetchDelegations = async () => {
    if (!selectedEtablissementId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delegations')
        .select(`
          *,
          delegue:delegue_id (
            id,
            email,
            profiles:profiles!inner (
              nom,
              prenom
            )
          )
        `)
        .eq('etablissement_id', selectedEtablissementId)
        .eq('delegant_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDelegations(data || []);
    } catch (error) {
      console.error('Error fetching delegations:', error);
      Alert.alert('Erreur', 'Impossible de charger les délégations');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (delegationId: string, delegueName: string) => {
    Alert.alert(
      'Révoquer la délégation',
      `Êtes-vous sûr de vouloir révoquer ${delegueName} de ses fonctions ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('delegations')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', delegationId);

              if (error) throw error;

              Alert.alert('Succès', 'La délégation a été révoquée.');
              fetchDelegations();
            } catch (error) {
              console.error('Error revoking delegation:', error);
              Alert.alert('Erreur', 'Impossible de révoquer la délégation');
            }
          },
        },
      ]
    );
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchDelegations();
  };

  const getSelectedEtablissementName = () => {
    const found = etablissements.find(e => e.id === selectedEtablissementId);
    return found?.nom || 'Sélectionner un établissement';
  };

  if (loading && !delegations.length && etablissements.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des délégations</Text>
        <Text style={styles.subtitle}>
          Nommez des collaborateurs pour vous assister dans la gestion de l'établissement.
        </Text>

        {/* Sélecteur d'établissement (si plusieurs) */}
        {etablissements.length > 1 && (
          <TouchableOpacity 
            style={styles.etablissementSelector}
            onPress={() => setShowEtablissementSelector(!showEtablissementSelector)}
          >
            <Text style={styles.etablissementSelectorText}>
              Établissement: {getSelectedEtablissementName()}
            </Text>
            <ChevronDown size={16} color={theme.colors.neutral[500]} />
          </TouchableOpacity>
        )}

        {showEtablissementSelector && etablissements.length > 1 && (
          <View style={styles.etablissementList}>
            {etablissements.map((etab) => (
              <TouchableOpacity
                key={etab.id}
                style={[
                  styles.etablissementOption,
                  selectedEtablissementId === etab.id && styles.etablissementOptionActive,
                ]}
                onPress={() => {
                  setSelectedEtablissementId(etab.id);
                  setShowEtablissementSelector(false);
                }}
              >
                <Text style={[
                  styles.etablissementOptionText,
                  selectedEtablissementId === etab.id && styles.etablissementOptionTextActive,
                ]}>
                  {etab.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <UserPlus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nommer un collaborateur</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {delegations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune délégation</Text>
            <Text style={styles.emptyText}>
              Vous n'avez pas encore nommé de collaborateurs pour {getSelectedEtablissementName()}.
              Utilisez le bouton ci-dessus pour créer une délégation.
            </Text>
          </Card>
        ) : (
          delegations.map((del) => {
            const IconComponent = getTypeIcon(del.type);
            const delegueName = del.delegue?.profiles 
              ? `${del.delegue.profiles.prenom} ${del.delegue.profiles.nom}` 
              : del.delegue?.email || 'Utilisateur';
            
            return (
              <Card key={del.id} style={styles.delegationCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <IconComponent size={20} color={theme.colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.delegueName}>{delegueName}</Text>
                    <Text style={styles.delegationType}>{getTypeLabel(del.type)}</Text>
                    {del.departement && (
                      <Text style={styles.departement}>Département: {del.departement}</Text>
                    )}
                    {del.plafond && (
                      <Text style={styles.plafond}>Plafond: {del.plafond} enseignants</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleRevoke(del.id, delegueName)}
                  >
                    <Trash2 size={18} color={theme.colors.danger.DEFAULT} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nommer un collaborateur</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <DelegationForm
              etablissementId={selectedEtablissementId}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginBottom: 20,
    lineHeight: 20,
  },
  etablissementSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  etablissementSelectorText: {
    fontSize: 14,
    color: theme.colors.neutral[700],
  },
  etablissementList: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: 16,
    overflow: 'hidden',
  },
  etablissementOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  etablissementOptionActive: {
    backgroundColor: theme.colors.neutral[100],
  },
  etablissementOptionText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
  },
  etablissementOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[600],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[400],
    textAlign: 'center',
  },
  delegationCard: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  delegueName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  delegationType: {
    fontSize: 13,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  departement: {
    fontSize: 12,
    color: theme.colors.neutral[400],
    marginTop: 2,
  },
  plafond: {
    fontSize: 12,
    color: theme.colors.neutral[400],
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  modalClose: {
    fontSize: 20,
    color: theme.colors.neutral[500],
    padding: 4,
  },
});