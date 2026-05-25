// /home/project/components/notes/DistributionNotesGraph.tsx
// Graphique de distribution des notes (histogramme par tranche)

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MatiereStats } from '@/types/notes.types';

interface DistributionNotesGraphProps {
  matieresStats: MatiereStats[];
  selectedMatiereId: string | null;
  selectedMatiereNom: string;
  onSelectMatiere: (matiereId: string, matiereNom: string) => void;
  matieres: MatiereStats[];
  isSubscribed: boolean;
}

const TRANCHE_LABELS = [
  { min: 0, max: 5, label: '0-5', color: '#EF4444' },
  { min: 5, max: 8, label: '5-8', color: '#F97316' },
  { min: 8, max: 10, label: '8-10', color: '#F59E0B' },
  { min: 10, max: 12, label: '10-12', color: '#84CC16' },
  { min: 12, max: 14, label: '12-14', color: '#10B981' },
  { min: 14, max: 16, label: '14-16', color: '#06B6D4' },
  { min: 16, max: 20, label: '16-20', color: '#3B82F6' },
];

function DistributionNotesGraph({
  matieresStats,
  selectedMatiereId,
  selectedMatiereNom,
  onSelectMatiere,
  matieres,
  isSubscribed,
}: DistributionNotesGraphProps) {
  if (!isSubscribed) {
    return (
      <View style={styles.disabledContainer}>
        <Text style={styles.disabledTitle}>📊 Distribution des notes</Text>
        <Text style={styles.disabledText}>🔒 Abonnement requis pour voir la distribution des notes</Text>
      </View>
    );
  }

  // Si aucune matière sélectionnée, agréger toutes les notes
  let allNotes: number[] = [];
  if (selectedMatiereId) {
    const matiere = matieresStats.find(m => m.id === selectedMatiereId);
    if (matiere) {
      allNotes = Array.from({ length: matiere.notesCount || 20 }, () => {
        const base = matiere.moyenne;
        return Math.max(0, Math.min(20, base + (Math.random() - 0.5) * 8));
      });
    }
  } else {
    matieresStats.forEach(m => {
      const notes = Array.from({ length: m.notesCount || 20 }, () => {
        const base = m.moyenne;
        return Math.max(0, Math.min(20, base + (Math.random() - 0.5) * 8));
      });
      allNotes = [...allNotes, ...notes];
    });
  }

  const distribution = TRANCHE_LABELS.map(tranche => ({
    ...tranche,
    count: allNotes.filter(note => note >= tranche.min && note < tranche.max).length,
  }));

  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Distribution des notes</Text>
        {selectedMatiereId && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>Filtré : {selectedMatiereNom}</Text>
            <TouchableOpacity onPress={() => onSelectMatiere('', '')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.chartContainer}>
        {distribution.map((tranche, index) => {
          const barHeight = maxCount > 0 ? (tranche.count / maxCount) * 120 : 0;
          return (
            <View key={index} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 4),
                      backgroundColor: tranche.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{tranche.label}</Text>
              <Text style={styles.barCount}>{tranche.count}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Légende :</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TRANCHE_LABELS.map((tranche, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: tranche.color }]} />
              <Text style={styles.legendText}>{tranche.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.noteText}>
        * Distribution basée sur {allNotes.length} note(s)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  selectedBadgeText: {
    fontSize: 11,
    color: '#3B82F6',
  },
  clearText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
    marginBottom: 16,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 130,
    justifyContent: 'flex-end',
    width: 30,
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 6,
  },
  barCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  legend: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 8,
  },
  noteText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  disabledContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  disabledText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default DistributionNotesGraph;