// /home/project/components/notes/DetailMatiereCard.tsx
// Détail des moyennes par matière pour une classe sélectionnée

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MatiereStats } from '@/types/notes.types';
import theme from '@/constants/theme';

interface DetailMatiereCardProps {
  data: MatiereStats[];
  classeNom: string;
  isSubscribed: boolean;
}

const getMoyenneColor = (moyenne: number): string => {
  if (moyenne >= 16) return '#10B981';
  if (moyenne >= 14) return '#3B82F6';
  if (moyenne >= 12) return '#F59E0B';
  if (moyenne >= 10) return '#F97316';
  return '#EF4444';
};

export default function DetailMatiereCard({ data, classeNom, isSubscribed }: DetailMatiereCardProps) {
  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📈 Détail par matière - {classeNom}</Text>
        <Text style={styles.disabledText}>🔒 Abonnement requis pour voir le détail par matière</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📈 Détail par matière - {classeNom}</Text>
        <Text style={styles.emptyText}>Aucune donnée disponible pour cette classe</Text>
      </View>
    );
  }

  const meilleureMatiere = data.reduce((best, current) => current.moyenne > best.moyenne ? current : best, data[0]);
  const matiereAFreiner = data.reduce((worst, current) => current.moyenne < worst.moyenne ? current : worst, data[0]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 Détail par matière - {classeNom}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>🏆 Meilleure matière</Text>
          <Text style={styles.summaryName}>{meilleureMatiere.nom}</Text>
          <Text style={[styles.summaryMoyenne, { color: '#10B981' }]}>{meilleureMatiere.moyenne.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>⚠️ Matière à améliorer</Text>
          <Text style={styles.summaryName}>{matiereAFreiner.nom}</Text>
          <Text style={[styles.summaryMoyenne, { color: '#EF4444' }]}>{matiereAFreiner.moyenne.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.matiereCell]}>Matière</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Coef.</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Moyenne</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Meilleure</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Plus faible</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Notes</Text>
          </View>

          {data.map((matiere, index) => (
            <View key={matiere.id} style={[styles.tableRow, index % 2 === 0 && styles.rowEven]}>
              <Text style={[styles.cell, styles.matiereCell]} numberOfLines={1}>{matiere.nom}</Text>
              <Text style={[styles.cell, styles.centerCell]}>{matiere.coefficient}</Text>
              <Text style={[styles.cell, styles.centerCell, styles.moyenneCell, { color: getMoyenneColor(matiere.moyenne) }]}>
                {matiere.moyenne.toFixed(2)}
              </Text>
              <Text style={[styles.cell, styles.centerCell, styles.bestNote]}>{matiere.meilleureNote.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.centerCell, styles.worstNote]}>{matiere.plusFaibleNote.toFixed(2)}</Text>
              <Text style={[styles.cell, styles.centerCell]}>{matiere.notesCount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  summaryMoyenne: {
    fontSize: 14,
    fontWeight: '600',
  },
  table: {
    minWidth: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  rowEven: {
    backgroundColor: '#FFFFFF',
  },
  cell: {
    fontSize: 12,
    color: '#1F2937',
  },
  matiereCell: {
    width: 100,
  },
  centerCell: {
    width: 70,
    textAlign: 'center',
  },
  moyenneCell: {
    fontWeight: '600',
  },
  bestNote: {
    color: '#10B981',
    fontWeight: '500',
  },
  worstNote: {
    color: '#EF4444',
    fontWeight: '500',
  },
  disabledText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
});