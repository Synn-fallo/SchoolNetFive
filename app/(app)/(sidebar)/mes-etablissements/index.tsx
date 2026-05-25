import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Plus, Building2 } from 'lucide-react-native';
import { useEtablissementsViewMode, ViewMode } from '@/hooks/useEtablissementsViewMode';
import ViewModeSelector from '@/components/etablissement/ViewModeSelector';
import EtablissementCardHorizontal from '@/components/etablissement/EtablissementCardHorizontal';
import EtablissementCardVertical from '@/components/etablissement/EtablissementCardVertical';
import EtablissementTableRow from '@/components/etablissement/EtablissementTableRow';
import theme from '@/constants/theme';

interface Etablissement {
  id: string;
  nom: string;
  slug: string;
  ville?: string;
  statut: string;
  plan?: string;
  created_at?: string;
}

export default function MesEtablissementsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [loading, setLoading] = useState(true);
  const { viewMode, setViewMode } = useEtablissementsViewMode();

  useEffect(() => {
    fetchEtablissements();
  }, [user]);

  const fetchEtablissements = async () => {
    if (!user) return;

    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('role', 'chef_etablissement')
        .eq('is_active', true)
        .not('etablissement_id', 'is', null);

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const etablissementIds = rolesData.map(r => r.etablissement_id);
        
        const { data: abonnementsData } = await supabase
          .from('abonnements')
          .select('etablissement_id, plan')
          .in('etablissement_id', etablissementIds)
          .eq('is_active', true);

        const planMap = new Map();
        if (abonnementsData) {
          abonnementsData.forEach(abo => {
            planMap.set(abo.etablissement_id, abo.plan);
          });
        }
        
        const { data: etabsData, error: etabsError } = await supabase
          .from('etablissements')
          .select('*')
          .in('id', etablissementIds)
          .order('nom');

        if (etabsError) throw etabsError;
        
        const etabsWithPlan = (etabsData || []).map(etab => ({
          ...etab,
          plan: planMap.get(etab.id),
        }));
        
        setEtablissements(etabsWithPlan);
      } else {
        setEtablissements([]);
      }
    } catch (error) {
      console.error('Error fetching etablissements:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (etablissements.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Building2 size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucun établissement</Text>
          <Text style={styles.emptyText}>
            Vous n'êtes pas encore associé à un établissement.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(app)/(sidebar)/institution/demande-etablissement')}
          >
            <Text style={styles.emptyButtonText}>Créer un établissement</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (viewMode === 'grid') {
      return (
        <FlatList
          key="grid"
          data={etablissements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EtablissementCardVertical
              id={item.id}
              nom={item.nom}
              ville={item.ville}
              statut={item.statut}
              slug={item.slug}
              plan={item.plan}
              created_at={item.created_at}
            />
          )}
          numColumns={2}
          columnWrapperStyle={styles.gridColumnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
        />
      );
    }

    if (viewMode === 'table') {
      return (
        <FlatList
          key="table"
          data={etablissements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EtablissementTableRow
              id={item.id}
              nom={item.nom}
              ville={item.ville}
              statut={item.statut}
              slug={item.slug}
              plan={item.plan}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.tableContent}
          ListHeaderComponent={
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.cellNom]}>Établissement</Text>
              <Text style={[styles.tableHeaderText, styles.cellVille]}>Ville</Text>
              <Text style={[styles.tableHeaderText, styles.cellStatut]}>Statut</Text>
              <Text style={[styles.tableHeaderText, styles.cellPlan]}>Abonnement</Text>
              <Text style={[styles.tableHeaderText, styles.cellActions]}>Actions</Text>
            </View>
          }
          stickyHeaderIndices={[0]}
        />
      );
    }

    // Mode 'cards' par défaut
    return (
      <FlatList
        key="cards"
        data={etablissements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EtablissementCardHorizontal
            id={item.id}
            nom={item.nom}
            ville={item.ville}
            statut={item.statut}
            slug={item.slug}
            plan={item.plan}
            created_at={item.created_at}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de vos établissements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mes établissements</Text>
          <Text style={styles.subtitle}>
            Gérez l'ensemble de vos établissements
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push('/(app)/(sidebar)/institution/demande-etablissement')}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.newButtonText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <ViewModeSelector viewMode={viewMode} onSelect={setViewMode} />
      </View>

      {renderContent()}
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  gridContent: {
    padding: 12,
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    gap: 12,
  },
  tableContent: {
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  cellNom: { flex: 2 },
  cellVille: { flex: 1.5 },
  cellStatut: { flex: 1.2 },
  cellPlan: { flex: 1 },
  cellActions: { flex: 0.8 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
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