// /home/project/components/notes/GraphiquesTab.tsx
// Onglet Graphiques – Comparaison des classes, évolution des notes
// PHASE 3 : Migration des composants existants + sélecteur matière

import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import GraphiqueComparatif from './GraphiqueComparatif';
import GraphiqueEvolution from './GraphiqueEvolution';
import { MatiereStats } from '@/types/notes.types';

interface GraphiquesTabProps {
  graphiqueComparatif: { classe: string; moyenne: number }[];
  matieresStats: MatiereStats[];
  selectedClasseId: string | null;
  selectedClasseNom: string;
  selectedMatiereId: string | null;
  onSelectMatiere: (matiereId: string, matiereNom: string) => void;
  isSubscribed: boolean;
  loading: boolean;
}

export default function GraphiquesTab({
  graphiqueComparatif,
  matieresStats,
  selectedClasseId,
  selectedClasseNom,
  selectedMatiereId,
  onSelectMatiere,
  isSubscribed,
  loading,
}: GraphiquesTabProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des graphiques...</Text>
      </View>
    );
  }

  if (!selectedClasseId) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>📈 Graphiques</Text>
        <Text style={styles.placeholderText}>
          Veuillez sélectionner une classe dans l'onglet Synthèse
        </Text>
      </View>
    );
  }

  // Trouver la matière sélectionnée pour l'affichage
  const selectedMatiere = matieresStats.find(m => m.id === selectedMatiereId);
  const selectedMatiereNom = selectedMatiere?.nom || 'Toutes les matières';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Section 1 : Graphique comparatif des classes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Comparaison des classes</Text>
        <Text style={styles.sectionSubtitle}>Moyennes par classe - {selectedClasseNom}</Text>
        <GraphiqueComparatif
          data={graphiqueComparatif}
          isSubscribed={isSubscribed}
        />
      </View>

      {/* Section 2 : Graphique d'évolution des notes par matière */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Évolution des notes par matière</Text>
        <Text style={styles.sectionSubtitle}>Classe : {selectedClasseNom}</Text>

        {/* Sélecteur de matière */}
        <View style={styles.matiereSelector}>
          <Text style={styles.matiereSelectorLabel}>Matière :</Text>
          <View style={styles.matiereChips}>
            <TouchableOpacity
              style={[styles.matiereChip, !selectedMatiereId && styles.matiereChipActive]}
              onPress={() => onSelectMatiere('', '')}
            >
              <Text style={[styles.matiereChipText, !selectedMatiereId && styles.matiereChipTextActive]}>
                Toutes
              </Text>
            </TouchableOpacity>
            {matieresStats.slice(0, 8).map((matiere) => (
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
          </View>
        </View>

        <GraphiqueEvolution
          matieresStats={selectedMatiereId ? matieresStats.filter(m => m.id === selectedMatiereId) : matieresStats}
          classeNom={selectedClasseNom}
          isSubscribed={isSubscribed}
        />
      </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  matiereSelector: {
    marginBottom: 16,
  },
  matiereSelectorLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  matiereChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  matiereChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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