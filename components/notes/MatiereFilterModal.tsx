// /home/project/components/notes/MatiereFilterModal.tsx
// Modal pour sélectionner une matière avec recherche

import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react-native';
import theme from '@/constants/theme';

interface MatiereFilterModalProps {
  visible: boolean;
  matieres: { id: string; nom: string }[];
  selectedId: string | null;
  onSelect: (id: string, nom: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function MatiereFilterModal({
  visible,
  matieres,
  selectedId,
  onSelect,
  onClose,
  loading = false,
}: MatiereFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMatieres, setFilteredMatieres] = useState(matieres);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredMatieres(
        matieres.filter(m => m.nom.toLowerCase().includes(query))
      );
    } else {
      setFilteredMatieres(matieres);
    }
  }, [searchQuery, matieres]);

  const handleSelect = (id: string, nom: string) => {
    onSelect(id, nom);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* En-tête */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une matière</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une matière..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Liste des matières */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
              <Text style={styles.loadingText}>Chargement des matières...</Text>
            </View>
          ) : filteredMatieres.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune matière trouvée</Text>
            </View>
          ) : (
            <FlatList
              data={filteredMatieres}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.matiereItem,
                    selectedId === item.id && styles.matiereItemSelected,
                  ]}
                  onPress={() => handleSelect(item.id, item.nom)}
                >
                  <Text
                    style={[
                      styles.matiereName,
                      selectedId === item.id && styles.matiereNameSelected,
                    ]}
                  >
                    {item.nom}
                  </Text>
                  {selectedId === item.id && (
                    <Check size={18} color={theme.colors.primary.DEFAULT} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* Bouton Annuler */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  listContent: {
    paddingBottom: 16,
  },
  matiereItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  matiereItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  matiereName: {
    fontSize: 16,
    color: '#1F2937',
  },
  matiereNameSelected: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  cancelButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
});