// /home/project/components/notes/RechercheBar.tsx
// Barre de recherche rapide (élève, classe, matière)

import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import theme from '@/constants/theme';

interface RechercheBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  isSubscribed?: boolean;
}

export default function RechercheBar({ onSearch, placeholder = 'Rechercher un élève, une classe, une matière...', isSubscribed = true }: RechercheBarProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (text: string) => {
    setQuery(text);
    onSearch(text);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  if (!isSubscribed) {
    return (
      <View style={styles.disabledContainer}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={styles.disabledInput}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          editable={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Search size={18} color="#9CA3AF" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
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
  );
}

const styles = StyleSheet.create({
  container: {
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
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
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
    marginBottom: 12,
  },
  disabledInput: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
    paddingVertical: 4,
  },
});