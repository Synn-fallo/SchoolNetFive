// /home/project/components/notes/GraphiqueComparatif.tsx
// Graphique comparatif des performances par classe

import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import theme from '@/constants/theme';

const { width } = Dimensions.get('window');

interface GraphiqueComparatifProps {
  data: { classe: string; moyenne: number }[];
  isSubscribed: boolean;
}

export default function GraphiqueComparatif({ data, isSubscribed }: GraphiqueComparatifProps) {
  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📊 Comparaison des classes</Text>
        <Text style={styles.disabledText}>🔒 Abonnement requis pour voir le graphique</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📊 Comparaison des classes</Text>
        <Text style={styles.emptyText}>Aucune donnée disponible</Text>
      </View>
    );
  }

  const chartData = data.map((item, index) => ({
    value: item.moyenne,
    label: item.classe.length > 8 ? item.classe.substring(0, 6) + '...' : item.classe,
    frontColor: item.moyenne >= 16 ? '#10B981' : item.moyenne >= 14 ? '#3B82F6' : item.moyenne >= 12 ? '#F59E0B' : item.moyenne >= 10 ? '#F97316' : '#EF4444',
    spacing: 12,
    labelWidth: 50,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Comparaison des classes</Text>
      <BarChart
        data={chartData}
        barWidth={40}
        spacing={16}
        roundedTop
        roundedBottom
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: '#6B7280', fontSize: 10 }}
        noOfSections={4}
        maxValue={20}
        stepValue={5}
        backgroundColor="#FFFFFF"
        dashGap={0}
        isAnimated
        animationDuration={500}
      />
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Légende :</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Excellent (≥16)</Text>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6', marginLeft: 12 }]} />
          <Text style={styles.legendText}>Bien (14-16)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Assez bien (12-14)</Text>
          <View style={[styles.legendDot, { backgroundColor: '#F97316', marginLeft: 12 }]} />
          <Text style={styles.legendText}>Passable (10-12)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Insuffisant (&lt;10)</Text>
        </View>
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
    marginBottom: 16,
  },
  legend: {
    marginTop: 16,
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
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
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