// /home/project/components/enseignant/ElevesListModal.tsx
// Modal d'affichage de la liste des élèves d'une classe (officielle ou personnelle)
// Avec bouton "Voir le relevé"

import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { X, Search, User, FileText } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

interface ElevesListModalProps {
  visible: boolean;
  eleves: Array<{
    id?: string;
    nom: string;
    prenom: string;
    matricule?: string;
  }>;
  classeNom: string;
  classeId: string;
  classeType: 'officielle' | 'personnelle';
  onClose: () => void;
}

export default function ElevesListModal({ 
  visible, 
  eleves, 
  classeNom, 
  classeId, 
  classeType,
  onClose 
}: ElevesListModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEleves = eleves.filter(eleve =>
    `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewReleve = (eleve: any) => {
    onClose();
    router.push({
      pathname: '/(app)/enseignant/releve-notes',
      params: {
        eleveId: eleve.id || `temp_${Date.now()}_${eleve.nom}`,
        eleveNom: eleve.nom,
        elevePrenom: eleve.prenom,
        classeId: classeId,
        classeNom: classeNom,
        type: classeType
      }
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Élèves - {classeNom}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un élève..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredEleves}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={({ item }) => (
              <Card style={styles.eleveCard}>
                <View style={styles.eleveRow}>
                  <View style={styles.eleveIcon}>
                    <User size={20} color={theme.colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.eleveInfo}>
                    <Text style={styles.eleveName}>
                      {item.prenom} {item.nom}
                    </Text>
                    {item.matricule && (
                      <Text style={styles.eleveMatricule}>Matricule: {item.matricule}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.releveButton}
                    onPress={() => handleViewReleve(item)}
                  >
                    <FileText size={16} color="#FFFFFF" />
                    <Text style={styles.releveButtonText}>Relevé</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Aucun élève trouvé' : 'Aucun élève dans cette classe'}
                </Text>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  eleveCard: {
    padding: 12,
    marginBottom: 8,
  },
  eleveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eleveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eleveInfo: {
    flex: 1,
  },
  eleveName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  eleveMatricule: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  releveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  releveButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});