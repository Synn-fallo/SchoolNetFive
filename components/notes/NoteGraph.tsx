import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import Svg, { Line, Circle, Polyline, G, Text as SvgText } from 'react-native-svg';
import { useMemo } from 'react';

const { width } = Dimensions.get('window');

interface NoteGraphProps {
  data: Array<{
    date: string;
    note: number;
    sur: number;
    matiere: string;
    titre: string;
  }>;
}

// Convertir la note en pourcentage pour l'affichage (basé sur note_sur)
const normalizeNote = (note: number, sur: number) => (note / sur) * 20;

export default function NoteGraph({ data }: NoteGraphProps) {
  const chartWidth = Math.max(width - 64, data.length * 70);
  const chartHeight = 220;
  const padding = { top: 20, bottom: 20, left: 35, right: 20 };

  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    return data.map(item => ({
      value: normalizeNote(item.note, item.sur),
      originalNote: item.note,
      originalSur: item.sur,
      label: item.date,
      matiere: item.matiere,
      titre: item.titre,
    }));
  }, [data]);

  const values = chartData.map(d => d.value);
  const maxValue = 20;
  const minValue = 0;
  const range = maxValue - minValue;

  // Calculer les positions Y
  const getY = (value: number) => {
    const y = padding.top + (chartHeight - padding.bottom - padding.top) * (1 - (value - minValue) / range);
    return Math.min(Math.max(y, padding.top), chartHeight - padding.bottom);
  };

  // Calculer les positions X
  const getX = (index: number) => {
    const step = (chartWidth - padding.left - padding.right) / (chartData.length - 1 || 1);
    return padding.left + index * step;
  };

  // Créer le chemin pour la ligne
  const linePath = useMemo(() => {
    if (chartData.length === 0) return '';
    let path = `M ${getX(0)} ${getY(chartData[0].value)}`;
    for (let i = 1; i < chartData.length; i++) {
      path += ` L ${getX(i)} ${getY(chartData[i].value)}`;
    }
    return path;
  }, [chartData]);

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucune donnée de note disponible</Text>
      </View>
    );
  }

  // Générer les graduations Y
  const yTicks = [0, 5, 10, 15, 20];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: chartWidth }}>
          <Svg height={chartHeight} width={chartWidth}>
            {/* Grille horizontale */}
            {yTicks.map((tick) => (
              <Line
                key={`grid-y-${tick}`}
                x1={padding.left}
                y1={getY(tick)}
                x2={chartWidth - padding.right}
                y2={getY(tick)}
                stroke="#E5E7EB"
                strokeWidth={1}
                strokeDasharray={[4, 4]}
              />
            ))}

            {/* Axe Y */}
            <Line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={chartHeight - padding.bottom}
              stroke="#D1D5DB"
              strokeWidth={2}
            />

            {/* Axe X */}
            <Line
              x1={padding.left}
              y1={chartHeight - padding.bottom}
              x2={chartWidth - padding.right}
              y2={chartHeight - padding.bottom}
              stroke="#D1D5DB"
              strokeWidth={2}
            />

            {/* Ligne des notes */}
            <Polyline
              points={linePath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={2}
            />

            {/* Points et labels */}
            {chartData.map((point, index) => {
              const x = getX(index);
              const y = getY(point.value);
              const isAboveAverage = point.value >= 10;
              
              return (
                <G key={`point-${index}`}>
                  <Circle
                    cx={x}
                    cy={y}
                    r={6}
                    fill={isAboveAverage ? '#10B981' : '#EF4444'}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  <SvgText
                    x={x}
                    y={y - 12}
                    fontSize={10}
                    fill="#6B7280"
                    textAnchor="middle"
                  >
                    {`${point.originalNote}/${point.originalSur}`}
                  </SvgText>
                </G>
              );
            })}

            {/* Labels Y */}
            {yTicks.map((tick) => (
              <SvgText
                key={`label-y-${tick}`}
                x={padding.left - 8}
                y={getY(tick) + 4}
                fontSize={10}
                fill="#6B7280"
                textAnchor="end"
              >
                {tick}
              </SvgText>
            ))}

            {/* Labels X (dates) */}
            {chartData.map((point, index) => {
              const x = getX(index);
              return (
                <SvgText
                  key={`label-x-${index}`}
                  x={x}
                  y={chartHeight - padding.bottom + 20}
                  fontSize={9}
                  fill="#6B7280"
                  textAnchor="middle"
                  rotation={chartData.length > 6 ? "-30" : "0"}
                >
                  {point.label}
                </SvgText>
              );
            })}
          </Svg>

          {/* Légende des matières */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendContainer}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.value >= 10 ? '#10B981' : '#EF4444' }]} />
                <Text style={styles.legendText} numberOfLines={1}>
                  {item.matiere}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  legendContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    maxWidth: 80,
  },
});