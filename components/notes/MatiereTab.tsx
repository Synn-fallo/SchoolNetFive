// /home/project/components/notes/MatiereTab.tsx
// Onglet Matières – Version stable sans graphique de distribution

import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import DetailMatiereCard from './DetailMatiereCard';
import { MatiereStats } from '@/types/notes.types';

interface MatiereTabProps {
  matieresStats: MatiereStats[];
  matieres: { id: string; nom: string }[];
  selectedClasseId: string | null;
  selectedClasseNom: string;
  selectedMatiereId: string | null;
  onSelectMatiere: (matiereId: string, matiereNom: string) => void;
  isSubscribed: boolean;
  loading: boolean;
}

export default function MatiereTab({
  matieresStats,
  matieres,
  selectedClasseId,
  selectedClasseNom,
  selectedMatiereId,
  onSelectMatiere,
  isSubscribed,
  loading,
}: MatiereTabProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des matières...</Text>
      </View>
    );
  }

  if (!selectedClasseId) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>📚 Matières</Text>
        <Text style={styles.placeholderText}>
          Veuillez sélectionner une classe dans l'onglet Synthèse
        </Text>
      </View>
    );
  }

  if (matieresStats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Aucune donnée</Text>
        <Text style={styles.emptyText}>Aucune note disponible pour cette classe</Text>
      </View>
    );
  }

  const selectedMatiere = matieresStats.find(m => m.id === selectedMatiereId);
  const selectedMatiereNom = selectedMatiere?.nom || 'Toutes les matières';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Matières</Text>
        <Text style={styles.subtitle}>Classe : {selectedClasseNom}</Text>
      </View>

      {/* Sélecteur de matière */}
      <View style={styles.matiereSelector}>
        <Text style={styles.matiereSelectorLabel}>Filtrer par matière :</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matiereChipsContainer}>
          <TouchableOpacity
            style={[styles.matiereChip, !selectedMatiereId && styles.matiereChipActive]}
            onPress={() => onSelectMatiere('', '')}
          >
            <Text style={[styles.matiereChipText, !selectedMatiereId && styles.matiereChipTextActive]}>
              Toutes
            </Text>
          </TouchableOpacity>
          {matieresStats.map((matiere) => (
            <TouchableOpacity
              key={matiere.id}
              style={[styles.matiereChip, selectedMatiereId === matiere.id && styles.matiereChipActive]}
              onPress={() => onSelectMatiere(matiere.id, matiere.nom)}
            >
              <Text style={[styles.matiereChipText, selectedMatiereId === matiere.id && styles.matiereChipTextActive]}>
                {matiere.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Détail des matières */}
      <DetailMatiereCard
        data={selectedMatiereId ? matieresStats.filter(m => m.id === selectedMatiereId) : matieresStats}
        classeNom={selectedClasseNom}
        isSubscribed={isSubscribed}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  placeholderContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  matiereSelector: {
    marginBottom: 16,
  },
  matiereSelectorLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  matiereChipsContainer: {
    flexDirection: 'row',
  },
  matiereChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  matiereChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  matiereChipText: {
    fontSize: 12,
    color: '#6B7280',
  },
  matiereChipTextActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});