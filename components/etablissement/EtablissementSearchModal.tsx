import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Search, Filter, Building2, MapPin } from 'lucide-react-native';
import { useEtablissementSearch, EtablissementResult } from '@/hooks/useEtablissementSearch';
import { useRegions, Region } from '@/hooks/useRegions';
import { useDepartements, Departement } from '@/hooks/useDepartements';
import theme from '@/constants/theme';

interface EtablissementSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (etablissement: { id: string; nom: string; ville?: string | null }) => void;
}

export default function EtablissementSearchModal({ visible, onClose, onSelect }: EtablissementSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVille, setSelectedVille] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedDepartementId, setSelectedDepartementId] = useState<string>('');
  const [villes, setVilles] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const { regions } = useRegions();
  const { departements } = useDepartements(selectedRegionId || undefined);
  const { loading, results, searchEtablissements, getVillesDisponibles, getTypesDisponibles } = useEtablissementSearch();

  useEffect(() => {
    if (visible) {
      loadFilters();
    }
  }, [visible]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedVille, selectedType, selectedRegionId, selectedDepartementId]);

  const loadFilters = async () => {
    setLoadingFilters(true);
    const [villesList, typesList] = await Promise.all([
      getVillesDisponibles(),
      getTypesDisponibles(),
    ]);
    setVilles(villesList);
    setTypes(typesList);
    setLoadingFilters(false);
  };

  const performSearch = () => {
    searchEtablissements(searchQuery, {
      ville: selectedVille || undefined,
      type: selectedType || undefined,
      regionId: selectedRegionId || undefined,
      departementId: selectedDepartementId || undefined,
    });
  };

  const handleSelect = (item: EtablissementResult) => {
    onSelect({ id: item.id, nom: item.nom, ville: item.ville });
    onClose();
  };

  const resetFilters = () => {
    setSelectedVille('');
    setSelectedType('');
    setSelectedRegionId('');
    setSelectedDepartementId('');
    setSearchQuery('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Rechercher un établissement</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Nom de l'établissement..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
              <Filter size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filtersPanel}>
              {/* Filtre par région */}
              {regions.length > 0 && (
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Région :</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={regions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.filterChip, selectedRegionId === item.id && styles.filterChipActive]}
                        onPress={() => {
                          setSelectedRegionId(selectedRegionId === item.id ? '' : item.id);
                          setSelectedDepartementId('');
                        }}
                      >
                        <Text style={[styles.filterChipText, selectedRegionId === item.id && styles.filterChipTextActive]}>
                          {item.nom}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Filtre par département (dépend de la région sélectionnée) */}
              {departements.length > 0 && (
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Département :</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={departements}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.filterChip, selectedDepartementId === item.id && styles.filterChipActive]}
                        onPress={() => setSelectedDepartementId(selectedDepartementId === item.id ? '' : item.id)}
                      >
                        <Text style={[styles.filterChipText, selectedDepartementId === item.id && styles.filterChipTextActive]}>
                          {item.nom}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Filtre par ville */}
              {villes.length > 0 && (
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Ville :</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={villes}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.filterChip, selectedVille === item && styles.filterChipActive]}
                        onPress={() => setSelectedVille(selectedVille === item ? '' : item)}
                      >
                        <Text style={[styles.filterChipText, selectedVille === item && styles.filterChipTextActive]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Filtre par type d'établissement */}
              {types.length > 0 && (
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Type :</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={types}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.filterChip, selectedType === item && styles.filterChipActive]}
                        onPress={() => setSelectedType(selectedType === item ? '' : item)}
                      >
                        <Text style={[styles.filterChipText, selectedType === item && styles.filterChipTextActive]}>
                          {item === 'public' ? 'Public' : item === 'prive' ? 'Privé' : item}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultCard} onPress={() => handleSelect(item)}>
              <Building2 size={20} color={theme.colors.primary.DEFAULT} />
              <View style={styles.resultContent}>
                <Text style={styles.resultNom}>{item.nom}</Text>
                <View style={styles.resultDetails}>
                  {item.ville && (
                    <View style={styles.resultDetail}>
                      <MapPin size={12} color="#9CA3AF" />
                      <Text style={styles.resultDetailText}>{item.ville}</Text>
                    </View>
                  )}
                  {item.type_etablissement && (
                    <Text style={styles.resultType}>
                      {item.type_etablissement === 'public' ? 'Public' : 'Privé'}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading && searchQuery ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun établissement trouvé</Text>
                <Text style={styles.emptySubtext}>
                  Vous pouvez créer une classe sans établissement, ou{"\n"}
                  <Text style={styles.linkText}>saisir manuellement le nom</Text>
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={loading ? <ActivityIndicator style={styles.loader} /> : null}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  closeButton: { padding: 4 },
  searchSection: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  filtersPanel: { marginTop: 12, gap: 12 },
  filterRow: { gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary.DEFAULT },
  filterChipText: { fontSize: 12, color: '#6B7280' },
  filterChipTextActive: { color: '#FFFFFF' },
  resetButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FEE2E2', borderRadius: 6 },
  resetButtonText: { fontSize: 12, color: '#EF4444' },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', padding: 16, marginHorizontal: 16, marginVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  resultContent: { flex: 1 },
  resultNom: { fontSize: 16, fontWeight: '500', color: '#1F2937', marginBottom: 4 },
  resultDetails: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultDetailText: { fontSize: 12, color: '#6B7280' },
  resultType: { fontSize: 11, color: '#FFFFFF', backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  emptySubtext: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  linkText: { color: theme.colors.primary.DEFAULT, fontWeight: '500' },
  loader: { paddingVertical: 20 },
});