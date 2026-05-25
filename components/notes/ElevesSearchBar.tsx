// /home/project/components/notes/ElevesSearchBar.tsx
// Barre de recherche et de tri pour la liste des élèves

import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Search, X, ArrowUpDown, TrendingUp, TrendingDown, SortAsc } from 'lucide-react-native';
import { useState } from 'react';

interface ElevesSearchBarProps {
  onSearch: (query: string) => void;
  onSort: (field: 'moyenne' | 'rang' | 'nom') => void;
  sortField: 'moyenne' | 'rang' | 'nom';
  sortOrder: 'asc' | 'desc';
  isSubscribed: boolean;
}

export default function ElevesSearchBar({
  onSearch,
  onSort,
  sortField,
  sortOrder,
  isSubscribed,
}: ElevesSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (text: string) => {
    setQuery(text);
    onSearch(text);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const getSortIcon = (field: 'moyenne' | 'rang' | 'nom') => {
    if (sortField !== field) return <ArrowUpDown size={14} color="#9CA3AF" />;
    return sortOrder === 'asc' ? <TrendingUp size={14} color="#3B82F6" /> : <TrendingDown size={14} color="#3B82F6" />;
  };

  const getSortLabel = (field: 'moyenne' | 'rang' | 'nom') => {
    switch (field) {
      case 'moyenne': return 'Moyenne';
      case 'rang': return 'Rang';
      case 'nom': return 'Nom';
    }
  };

  if (!isSubscribed) {
    return (
      <View style={styles.disabledContainer}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={styles.disabledInput}
          placeholder="Rechercher un élève..."
          placeholderTextColor="#9CA3AF"
          editable={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, prénom ou matricule..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Boutons de tri */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Trier par :</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortField === 'rang' && styles.sortButtonActive]}
            onPress={() => onSort('rang')}
          >
            {getSortIcon('rang')}
            <Text style={[styles.sortButtonText, sortField === 'rang' && styles.sortButtonTextActive]}>
              Rang
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortField === 'moyenne' && styles.sortButtonActive]}
            onPress={() => onSort('moyenne')}
          >
            {getSortIcon('moyenne')}
            <Text style={[styles.sortButtonText, sortField === 'moyenne' && styles.sortButtonTextActive]}>
              Moyenne
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortField === 'nom' && styles.sortButtonActive]}
            onPress={() => onSort('nom')}
          >
            {getSortIcon('nom')}
            <Text style={[styles.sortButtonText, sortField === 'nom' && styles.sortButtonTextActive]}>
              Nom
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  sortButtonActive: {
    backgroundColor: '#EFF6FF',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sortButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  disabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  disabledInput: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
    paddingVertical: 4,
  },
});