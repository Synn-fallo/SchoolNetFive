import { View, Text, StyleSheet } from 'react-native';
import theme from '@/constants/theme';

interface NoteJaugeProps {
  note: number;
  noteSur: number;
}

export default function NoteJauge({ note, noteSur }: NoteJaugeProps) {
  const pourcentage = (note / noteSur) * 100;
  
  // Déterminer la couleur selon la note
  const getCouleur = () => {
    if (note >= 16) return '#10B981'; // Vert
    if (note >= 13) return '#F59E0B'; // Orange
    if (note >= 10) return '#F97316'; // Jaune orangé
    return '#EF4444'; // Rouge
  };

  // Déterminer l'icône représentant la note
  const getIcone = () => {
    if (note >= 16) return '🏆';
    if (note >= 13) return '👍';
    if (note >= 10) return '📘';
    return '⚠️';
  };

  const couleur = getCouleur();
  const icone = getIcone();

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.icone}>{icone}</Text>
        <Text style={[styles.noteValue, { color: couleur }]}>{note}/{noteSur}</Text>
      </View>
      <View style={styles.barBackground}>
        <View 
          style={[
            styles.barFill, 
            { width: `${pourcentage}%`, backgroundColor: couleur }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  icone: {
    fontSize: 20,
  },
  noteValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  barBackground: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
});