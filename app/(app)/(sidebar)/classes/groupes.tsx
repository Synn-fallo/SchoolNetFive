import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import GroupesManagerV2 from '@/components/classes/GroupesManagerV2';
import { Building2, ChevronDown, Users, RefreshCw } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Classe {
  id: string;
  nom: string;
  niveau: string;
}

export default function GroupesClasseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id: urlClasseId } = useLocalSearchParams<{ id: string }>();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string | null>(null);
  const [selectedClasseNom, setSelectedClasseNom] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeEtablissement) {
      fetchClasses();
    }
  }, [activeEtablissement]);

  const fetchClasses = async () => {
    if (!activeEtablissement) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('etablissement_id', activeEtablissement.id)
        .eq('is_active', true)
        .order('nom', { ascending: true });

      if (error) throw error;

      const formattedClasses = (data || []).map(c => ({
        id: c.id,
        nom: c.nom,
        niveau: c.niveau || ''
      }));

      setClasses(formattedClasses);

      // Déterminer la classe sélectionnée
      let classeIdToSelect = urlClasseId;
      
      if (!classeIdToSelect && formattedClasses.length > 0) {
        classeIdToSelect = formattedClasses[0].id;
      }

      if (classeIdToSelect) {
        const selected = formattedClasses.find(c => c.id === classeIdToSelect);
        if (selected) {
          setSelectedClasseId(selected.id);
          setSelectedClasseNom(selected.nom);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchClasses();
  };

  const handleSelectClasse = (classe: Classe) => {
    setSelectedClasseId(classe.id);
    setSelectedClasseNom(classe.nom);
    setShowClassSelector(false);
    router.setParams({ id: classe.id });
  };

  if (etablissementLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!activeEtablissement) {
    return (
      <View style={styles.centerContainer}>
        <Building2 size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun établissement</Text>
        <Text style={styles.emptyText}>
          Vous devez sélectionner un établissement pour gérer les groupes.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(app)/(sidebar)/mes-etablissements')}
        >
          <Text style={styles.backButtonText}>Voir mes établissements</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (classes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Users size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucune classe</Text>
        <Text style={styles.emptyText}>
          Aucune classe n'a encore été créée dans {activeEtablissement.nom}.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(app)/classes')}
        >
          <Text style={styles.backButtonText}>Créer une classe</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selectedClasseId && classes.length > 0) {
    // Sélectionner automatiquement la première classe
    setSelectedClasseId(classes[0].id);
    setSelectedClasseNom(classes[0].nom);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header simplifié - SANS flèche manuelle car le layout (sidebar) fournit déjà la flèche moderne */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion des groupes</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <RefreshCw size={20} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {/* Informations établissement */}
      <View style={styles.etablissementInfo}>
        <Building2 size={14} color={theme.colors.neutral[500]} />
        <Text style={styles.etablissementNom}>{activeEtablissement.nom}</Text>
      </View>

      {/* Sélecteur de classe */}
      <TouchableOpacity style={styles.classSelector} onPress={() => setShowClassSelector(true)}>
        <View style={styles.classSelectorLeft}>
          <Users size={18} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.classSelectorLabel}>Classe :</Text>
          <Text style={styles.classSelectorValue}>{selectedClasseNom}</Text>
        </View>
        <ChevronDown size={18} color={theme.colors.neutral[500]} />
      </TouchableOpacity>

      {/* Gestionnaire de groupes */}
      {selectedClasseId && (
        <GroupesManagerV2
          classeId={selectedClasseId}
          classeNom={selectedClasseNom}
          onRefresh={fetchClasses}
        />
      )}

      {/* Modal/Selector de classe */}
      {showClassSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une classe</Text>
              <TouchableOpacity onPress={() => setShowClassSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {classes.map((classe) => (
                <TouchableOpacity
                  key={classe.id}
                  style={[
                    styles.classOption,
                    selectedClasseId === classe.id && styles.classOptionActive,
                  ]}
                  onPress={() => handleSelectClasse(classe)}
                >
                  <View>
                    <Text style={[
                      styles.classOptionName,
                      selectedClasseId === classe.id && styles.classOptionNameActive,
                    ]}>
                      {classe.nom}
                    </Text>
                    {classe.niveau && (
                      <Text style={styles.classOptionNiveau}>{classe.niveau}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  backButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  etablissementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
  },
  etablissementNom: {
    fontSize: 13,
    color: '#6B7280',
  },
  classSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  classSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classSelectorLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  classSelectorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 18,
    color: '#6B7280',
    padding: 4,
  },
  modalList: {
    padding: 8,
  },
  classOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  classOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  classOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  classOptionNameActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  classOptionNiveau: {
    fontSize: 12,
    color: '#6B7280',
  },
});