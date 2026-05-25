import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Search, Filter, UserPlus, ChevronRight, Building2, GraduationCap, Phone, Mail } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  classe_nom?: string;
  telephone?: string;
  email?: string;
  statut: string;
}

export default function ElevesListScreen() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [filteredEleves, setFilteredEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [classeFilter, setClasseFilter] = useState<string>('');
  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const isChefOrAdmin = hasRole('chef_etablissement') || hasRole('admin');

  useEffect(() => {
    if (activeEtablissement) {
      loadEleves();
      loadClasses();
    }
  }, [activeEtablissement]);

  useEffect(() => {
    filterEleves();
  }, [searchQuery, classeFilter, eleves]);

  const loadClasses = async () => {
    if (!activeEtablissement) return;
    
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, nom')
        .eq('etablissement_id', activeEtablissement.id)
        .eq('is_active', true)
        .order('nom');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadEleves = async () => {
    if (!activeEtablissement) return;

    setLoading(true);
    try {
      // 1. Récupérer les élèves
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('id, user_id, etablissement_id, matricule, classe_id, telephone, email, statut, created_at')
        .eq('etablissement_id', activeEtablissement.id)
        .order('created_at', { ascending: false });

      if (elevesError) throw elevesError;

      if (!elevesData || elevesData.length === 0) {
        setEleves([]);
        setFilteredEleves([]);
        setLoading(false);
        return;
      }

      // 2. Récupérer les profils
      const userIds = elevesData.map(e => e.user_id).filter(Boolean);
      let profilesMap = new Map<string, { nom: string; prenom: string }>();
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profilesMap.set(p.id, { nom: p.nom || '', prenom: p.prenom || '' });
          });
        }
      }

      // 3. Récupérer les noms des classes
      const classeIds = elevesData.map(e => e.classe_id).filter(Boolean);
      let classesMap = new Map<string, string>();
      
      if (classeIds.length > 0) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, nom')
          .in('id', classeIds);

        if (!classesError && classesData) {
          classesData.forEach(c => {
            classesMap.set(c.id, c.nom);
          });
        }
      }

      // 4. Construire la liste
      const elevesList: Eleve[] = elevesData.map(e => {
        const profile = profilesMap.get(e.user_id);
        return {
          id: e.id,
          nom: profile?.nom || '',
          prenom: profile?.prenom || '',
          matricule: e.matricule || '',
          classe_nom: classesMap.get(e.classe_id) || '',
          telephone: e.telephone,
          email: e.email,
          statut: e.statut || 'actif',
        };
      });

      setEleves(elevesList);
      setFilteredEleves(elevesList);
    } catch (error) {
      console.error('Error loading eleves:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEleves = () => {
    let filtered = [...eleves];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e => e.nom.toLowerCase().includes(query) ||
             e.prenom.toLowerCase().includes(query) ||
             e.matricule.toLowerCase().includes(query)
      );
    }
    
    if (classeFilter) {
      filtered = filtered.filter(e => e.classe_nom === classeFilter);
    }
    
    setFilteredEleves(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEleves();
    setRefreshing(false);
  }, [activeEtablissement]);

  const handleAddEleve = () => {
    router.push('/(app)/(sidebar)/eleves/ajouter');
  };

  const handleElevePress = (eleveId: string) => {
    router.push(`/(app)/(sidebar)/eleves/${eleveId}`);
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'actif': return '#10B981';
      case 'inactif': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      default: return statut;
    }
  };

  if (etablissementLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des élèves...</Text>
      </View>
    );
  }

  if (!activeEtablissement) {
    return (
      <View style={styles.centerContainer}>
        <Building2 size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun établissement</Text>
        <Text style={styles.emptyText}>
          Veuillez sélectionner un établissement pour voir ses élèves.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/(app)/(sidebar)/mes-etablissements')}
        >
          <Text style={styles.emptyButtonText}>Voir mes établissements</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Élèves</Text>
          <View style={styles.subtitleContainer}>
            <Building2 size={12} color={theme.colors.neutral[500]} />
            <Text style={styles.subtitle}> {activeEtablissement.nom}</Text>
          </View>
        </View>
        {isChefOrAdmin && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddEleve}>
            <UserPlus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, prénom ou matricule..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.neutral[400]}
        />
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Filter size={20} color={theme.colors.neutral[400]} />
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Filtrer par classe :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !classeFilter && styles.filterChipActive]}
              onPress={() => setClasseFilter('')}
            >
              <Text style={[styles.filterChipText, !classeFilter && styles.filterChipTextActive]}>Toutes</Text>
            </TouchableOpacity>
            {classes.map((classe) => (
              <TouchableOpacity
                key={classe.id}
                style={[styles.filterChip, classeFilter === classe.nom && styles.filterChipActive]}
                onPress={() => setClasseFilter(classeFilter === classe.nom ? '' : classe.nom)}
              >
                <Text style={[styles.filterChipText, classeFilter === classe.nom && styles.filterChipTextActive]}>
                  {classe.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Liste des élèves */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary.DEFAULT]} />
        }
      >
        {filteredEleves.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color={theme.colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Aucun élève</Text>
            <Text style={styles.emptyText}>
              {searchQuery || classeFilter
                ? 'Aucun élève ne correspond à vos critères.'
                : 'Aucun élève n\'est encore inscrit dans cet établissement.'}
            </Text>
            {isChefOrAdmin && !searchQuery && !classeFilter && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddEleve}>
                <Text style={styles.emptyButtonText}>Ajouter un élève</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>{filteredEleves.length} élève(s)</Text>
            {filteredEleves.map((eleve) => (
              <TouchableOpacity key={eleve.id} onPress={() => handleElevePress(eleve.id)}>
                <Card style={styles.eleveCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {eleve.prenom?.charAt(0)}{eleve.nom?.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.eleveInfo}>
                      <Text style={styles.eleveName}>{eleve.prenom} {eleve.nom}</Text>
                      <Text style={styles.eleveMatricule}>Matricule: {eleve.matricule}</Text>
                      {eleve.classe_nom && (
                        <View style={styles.classeBadge}>
                          <GraduationCap size={12} color={theme.colors.primary.DEFAULT} />
                          <Text style={styles.classeText}>{eleve.classe_nom}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusDot, { backgroundColor: getStatutColor(eleve.statut) }]} />
                      <Text style={[styles.statusText, { color: getStatutColor(eleve.statut) }]}>
                        {getStatutLabel(eleve.statut)}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={theme.colors.neutral[300]} />
                  </View>
                  
                  {(eleve.telephone || eleve.email) && (
                    <View style={styles.contactContainer}>
                      {eleve.telephone && (
                        <View style={styles.contactItem}>
                          <Phone size={12} color={theme.colors.neutral[400]} />
                          <Text style={styles.contactText}>{eleve.telephone}</Text>
                        </View>
                      )}
                      {eleve.email && (
                        <View style={styles.contactItem}>
                          <Mail size={12} color={theme.colors.neutral[400]} />
                          <Text style={styles.contactText}>{eleve.email}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
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
    padding: 24,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  resultCount: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  eleveCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eleveInfo: {
    flex: 1,
  },
  eleveName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  eleveMatricule: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  classeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classeText: {
    fontSize: 11,
    color: theme.colors.primary.DEFAULT,
  },
  statusContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  contactContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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