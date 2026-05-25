// /home/project/components/notes/GraphiqueEvolution.tsx
// Graphique d'évolution des notes par matière

import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { MatiereStats } from '@/types/notes.types';
import theme from '@/constants/theme';

const { width } = Dimensions.get('window');

interface GraphiqueEvolutionProps {
  matieresStats: MatiereStats[];
  classeNom: string;
  isSubscribed: boolean;
}

export default function GraphiqueEvolution({ matieresStats, classeNom, isSubscribed }: GraphiqueEvolutionProps) {
  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📈 Évolution des notes - {classeNom}</Text>
        <Text style={styles.disabledText}>🔒 Abonnement requis pour voir le graphique d'évolution</Text>
      </View>
    );
  }

  if (matieresStats.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📈 Évolution des notes - {classeNom}</Text>
        <Text style={styles.emptyText}>Aucune donnée disponible</Text>
      </View>
    );
  }

  // Prendre les 6 meilleures matières pour le graphique
  const topMatieres = [...matieresStats].sort((a, b) => b.moyenne - a.moyenne).slice(0, 6);

  const lineData = topMatieres.map((matiere, index) => ({
    value: matiere.moyenne,
    label: matiere.nom.length > 10 ? matiere.nom.substring(0, 8) + '...' : matiere.nom,
    dataPointText: matiere.moyenne.toFixed(1),
    textColor: '#1F2937',
    textShiftX: -5,
    textShiftY: -10,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 Évolution des notes - {classeNom}</Text>
      <Text style={styles.subtitle}>Top {topMatieres.length} matières</Text>

      <LineChart
        data={lineData}
        width={width - 64}
        height={220}
        spacing={44}
        initialSpacing={20}
        color={theme.colors.primary.DEFAULT}
        thickness={2}
        hideRules
        hideDataPoints={false}
        dataPointsColor={theme.colors.primary.DEFAULT}
        dataPointsRadius={4}
        textShiftX={-4}
        textShiftY={-8}
        textFontSize={10}
        textColor="#6B7280"
        yAxisTextStyle={{ color: '#6B7280', fontSize: 10 }}
        xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 11 }}
        showVerticalLines
        verticalLinesColor="#E5E7EB"
        xAxisColor="#E5E7EB"
        yAxisColor="#E5E7EB"
        isAnimated
        animationDuration={500}
        curved
      />

      <View style={styles.note}>
        <Text style={styles.noteText}>
          * Graphique présentant les moyennes des matières pour la classe {classeNom}
        </Text>
      </View>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  note: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  noteText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
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