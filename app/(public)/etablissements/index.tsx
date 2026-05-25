import { View, Text, StyleSheet, FlatList, ActivityIndicator, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useEtablissementsPublic } from '@/hooks/useEtablissementsPublic';
import EtablissementCard from '@/components/public/EtablissementCard';
import EtablissementModal from '@/components/public/EtablissementModal';
import SearchBar from '@/components/public/SearchBar';
import FilterBar from '@/components/public/FilterBar';
import Pagination from '@/components/public/Pagination';
import PublicFooter from '@/components/public/PublicFooter';
import { X } from 'lucide-react-native';
import theme from '@/constants/theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isDesktop = width >= 1024;

const getNumColumns = () => {
  if (isDesktop) return 3;
  if (isTablet) return 2;
  return 1;
};

const getCardWidth = () => {
  const numColumns = getNumColumns();
  const padding = 32;
  const gap = 16;
  const availableWidth = width - padding;
  return (availableWidth - (numColumns - 1) * gap) / numColumns;
};

export default function EtablissementsListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedDepartementId, setSelectedDepartementId] = useState('');
  const [selectedType, setSelectedType] = useState('tous');
  const [selectedCycle, setSelectedCycle] = useState('tous');
  const [selectedOption, setSelectedOption] = useState('tous');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEtablissement, setSelectedEtablissement] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Ref pour le debouncing UNIQUEMENT sur la recherche
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  // Ref pour éviter les doubles appels
  const isResettingRef = useRef(false);
  // 🔧 AJOUT : Ref pour éviter les appels multiples
  const isApplyingFiltersRef = useRef(false);
  const lastAppliedFiltersRef = useRef<string>('');

  const {
    etablissements,
    loading,
    error,
    total,
    page,
    totalPages,
    regions,
    departements,
    types,
    options,
    setFilters,
    setPage,
    refresh,
  } = useEtablissementsPublic();

  const numColumns = getNumColumns();
  const cardWidth = getCardWidth();

  // Réinitialiser le département quand la région change
  useEffect(() => {
    setSelectedDepartementId('');
  }, [selectedRegionId]);

  // ✅ Fonction pour appliquer les filtres (avec garde anti-boucle)
  const applyFiltersImmediately = useCallback(() => {
    // Éviter pendant une réinitialisation
    if (isResettingRef.current) {
      console.log('🔍 [DEBUG] applyFilters - ignoré (réinitialisation en cours)');
      return;
    }
    
    // 🔧 Éviter les appels multiples simultanés
    if (isApplyingFiltersRef.current) {
      console.log('🔍 [DEBUG] applyFilters - déjà en cours, ignoré');
      return;
    }
    
    const filters: any = {};
    if (searchQuery) filters.searchQuery = searchQuery;
    if (selectedRegionId) filters.regionId = selectedRegionId;
    if (selectedDepartementId) filters.departementId = selectedDepartementId;
    if (selectedType !== 'tous') filters.type = selectedType;
    if (selectedCycle !== 'tous') filters.cycle = selectedCycle;
    if (selectedOption !== 'tous') filters.option = selectedOption;
    
    const filtersKey = JSON.stringify(filters);
    
    // 🔧 Éviter les appels avec les mêmes filtres
    if (lastAppliedFiltersRef.current === filtersKey) {
      console.log('🔍 [DEBUG] applyFilters - filtres identiques, ignoré');
      return;
    }
    
    console.log('🔍 [DEBUG] applyFilters - appelée avec:', filters);
    
    isApplyingFiltersRef.current = true;
    lastAppliedFiltersRef.current = filtersKey;
    
    setFilters(filters);
    
    // Réinitialiser le flag après un court délai
    setTimeout(() => {
      isApplyingFiltersRef.current = false;
    }, 100);
  }, [searchQuery, selectedRegionId, selectedDepartementId, selectedType, selectedCycle, selectedOption, setFilters]);

  // ✅ Debouncing UNIQUEMENT sur la recherche textuelle
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    searchDebounceRef.current = setTimeout(() => {
      applyFiltersImmediately();
    }, 300);
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, applyFiltersImmediately]);

  // ✅ Application immédiate pour les filtres non-textuels
  useEffect(() => {
    if (isResettingRef.current) return;
    applyFiltersImmediately();
  }, [selectedRegionId, selectedDepartementId, selectedType, selectedCycle, selectedOption, applyFiltersImmediately]);

  const handleCardPress = (etablissement: any) => {
    router.push(`/(public)/etablissements/${etablissement.slug}`);
  };

  const handleQuickView = (etablissement: any) => {
    setSelectedEtablissement(etablissement);
    setModalVisible(true);
  };

  // Réinitialiser TOUS les filtres
  const resetFilters = () => {
    console.log('🔍 [DEBUG] resetFilters - début');
    isResettingRef.current = true;
    isApplyingFiltersRef.current = false;
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    // Réinitialiser le cache local
    lastAppliedFiltersRef.current = '';
    
    // Réinitialiser tous les états
    setSearchQuery('');
    setSelectedRegionId('');
    setSelectedDepartementId('');
    setSelectedType('tous');
    setSelectedCycle('tous');
    setSelectedOption('tous');
    
    // Forcer la réinitialisation des filtres
    setFilters({});
    
    setTimeout(() => {
      isResettingRef.current = false;
      refresh();
    }, 150);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isLastInRow = (index + 1) % numColumns === 0;
    return (
      <View style={[styles.cardWrapper, { width: cardWidth, marginRight: isLastInRow ? 0 : 16 }]}>
        <EtablissementCard
          id={item.id}
          nom={item.nom}
          slug={item.slug}
          ville={item.ville}
          region={item.region}
          departement={item.departement}
          type_affichage={item.type_affichage}
          logo_url={item.logo_url}
          taux_reussite={item.taux_reussite}
          likes_count={item.likes_count}
          vues_count={item.vues_count}
          note_moyenne={item.note_moyenne}
          badge_annuaire={item.badge_annuaire}
          cycles={item.cycles}
          options={item.options}
          description_courte={item.description_courte}
          etoiles={item.etoiles}
          code_etablissement={item.code_etablissement}
          onPress={() => handleCardPress(item)}
          onQuickView={() => handleQuickView(item)}
        />
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Annuaire des établissements</Text>
        <Text style={styles.subtitle}>
          Découvrez les établissements scolaires partenaires de SchoolNet
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onSearch={setSearchQuery}
          placeholder="Rechercher par nom, ville ou adresse..."
          loading={loading}
          showFilters={true}
          onFilterPress={() => setShowFilters(true)}
        />
      </View>

      {(selectedRegionId || selectedDepartementId || selectedType !== 'tous' || selectedCycle !== 'tous' || selectedOption !== 'tous' || searchQuery) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
            {searchQuery && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Recherche: {searchQuery}</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {selectedRegionId && regions.find(r => r.id === selectedRegionId) && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Région: {regions.find(r => r.id === selectedRegionId)?.nom}
                </Text>
                <TouchableOpacity onPress={() => setSelectedRegionId('')}>
                  <X size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {selectedDepartementId && departements.find(d => d.id === selectedDepartementId) && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Dépt: {departements.find(d => d.id === selectedDepartementId)?.nom}
                </Text>
                <TouchableOpacity onPress={() => setSelectedDepartementId('')}>
                  <X size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {selectedType !== 'tous' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Type: {selectedType === 'public' ? 'Public' : selectedType === 'prive' ? 'Privé' : 'Mixte'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedType('tous')}>
                  <X size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCycle !== 'tous' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Cycle: {selectedCycle === 'premier' ? '1er cycle' : '2nd cycle'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCycle('tous')}>
                  <X size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {selectedOption !== 'tous' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Option: {selectedOption}</Text>
                <TouchableOpacity onPress={() => setSelectedOption('tous')}>
                  <X size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.resetAllChip} onPress={resetFilters}>
              <Text style={styles.resetAllText}>Tout effacer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {!loading && (
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {total} établissement{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </>
  );

  const renderFooter = () => {
    if (loading && page === 1) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Chargement des établissements...</Text>
        </View>
      );
    }

    if (etablissements.length === 0 && !loading) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>Aucun établissement trouvé</Text>
          <Text style={styles.emptyText}>
            Essayez de modifier vos critères de recherche ou de filtres.
          </Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <Text style={styles.paginationInfo}>Page {page} sur {totalPages}</Text>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </View>
        )}
        <PublicFooter />
      </>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={etablissements}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.id}-${page}`}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[styles.listContent, etablissements.length > 0 && { minHeight: '100%' }]}
        showsVerticalScrollIndicator={false}
        numColumns={numColumns}
        key={numColumns}
        extraData={etablissements}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      />

      <FilterBar
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        regions={regions}
        departements={departements}
        types={types}
        options={options}
        selectedRegionId={selectedRegionId}
        selectedDepartementId={selectedDepartementId}
        selectedType={selectedType}
        selectedCycle={selectedCycle}
        selectedOption={selectedOption}
        onRegionChange={(id) => {
          setSelectedRegionId(id);
          setSelectedDepartementId('');
        }}
        onDepartementChange={setSelectedDepartementId}
        onTypeChange={setSelectedType}
        onCycleChange={setSelectedCycle}
        onOptionChange={setSelectedOption}
        onReset={resetFilters}
      />

      <EtablissementModal visible={modalVisible} onClose={() => setModalVisible(false)} etablissement={selectedEtablissement} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.secondary },
  listContent: { flexGrow: 1, paddingBottom: 24 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  header: { backgroundColor: theme.colors.background.primary, paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200] },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: theme.typography.h2.fontWeight as any, color: theme.colors.neutral[800], marginBottom: 8 },
  subtitle: { fontSize: theme.typography.bodySmall.fontSize, color: theme.colors.neutral[500] },
  searchContainer: { backgroundColor: theme.colors.background.primary, paddingHorizontal: 24, paddingBottom: 12, paddingTop: 12 },
  activeFiltersContainer: { backgroundColor: theme.colors.background.primary, paddingHorizontal: 24, paddingBottom: 12 },
  activeFiltersScroll: { flexDirection: 'row' },
  activeFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.neutral[100], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, marginRight: 8 },
  activeFilterText: { fontSize: 12, color: theme.colors.neutral[600] },
  resetAllChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#FEE2E2' },
  resetAllText: { fontSize: 12, color: '#EF4444' },
  counterContainer: { backgroundColor: theme.colors.background.primary, paddingHorizontal: 24, paddingBottom: 12 },
  counterText: { fontSize: 13, color: theme.colors.neutral[500] },
  cardWrapper: { marginBottom: 16 },
  loadingText: { marginTop: 12, fontSize: 14, color: theme.colors.neutral[500] },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.neutral[600], marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.colors.neutral[400], textAlign: 'center', marginBottom: 16 },
  resetButton: { backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  resetButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  paginationContainer: { paddingVertical: 24, alignItems: 'center' },
  paginationInfo: { fontSize: 12, color: theme.colors.neutral[500], textAlign: 'center', marginBottom: 8 },
});