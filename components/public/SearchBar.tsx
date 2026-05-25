import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Search, Filter, X } from 'lucide-react-native';
import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  value: string;
  loading?: boolean;
  showFilters?: boolean;
  onFilterPress?: () => void;
}

export default function SearchBar({
  onSearch,
  placeholder = "Rechercher...",
  value,
  loading = false,
  showFilters = false,
  onFilterPress,
}: SearchBarProps) {
  // État local pour une saisie fluide (pas de debouncing sur l'affichage)
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Synchroniser l'état local avec la prop value (quand value change de l'extérieur)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((text: string) => {
    // Mettre à jour l'affichage immédiatement (sans délai)
    setLocalValue(text);
    
    // Debouncing UNIQUEMENT pour l'appel API
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onSearch(text);
    }, 300);
  }, [onSearch]);

  const clearSearch = () => {
    setLocalValue("");
    onSearch("");
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={localValue}
          onChangeText={handleChange}
        />
        {loading && (
          <ActivityIndicator size="small" color="#3B82F6" style={styles.loader} />
        )}
        {!loading && localValue.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <X size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
      {showFilters && onFilterPress && (
        <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
          <Filter size={18} color="#4B5563" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 8,
  },
  loader: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 42,
    height: 42,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});