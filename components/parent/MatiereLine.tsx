import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getPictoForMatiere } from '@/constants/matierePictos';
import NoteJauge from './NoteJauge';
import theme from '@/constants/theme';

interface MatiereLineProps {
  matiere: {
    id: string;
    nom: string;
    moyenne: number;
    noteSur: number;
    appreciation?: string;
    notes?: Array<{
      valeur: number;
      type: string;
      date: string;
      appreciation?: string;
    }>;
  };
  onPress: () => void;
}

export default function MatiereLine({ matiere, onPress }: MatiereLineProps) {
  const picto = getPictoForMatiere(matiere.nom);
  const estFaible = matiere.moyenne < 10;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.leftColumn}>
        <Text style={styles.picto}>{picto}</Text>
      </View>
      
      <View style={styles.middleColumn}>
        <View style={styles.headerRow}>
          <Text style={styles.matiereNom}>{matiere.nom}</Text>
          {estFaible && (
            <View style={styles.alerteBadge}>
              <Text style={styles.alerteText}>⚠️</Text>
            </View>
          )}
        </View>
        <NoteJauge note={matiere.moyenne} noteSur={matiere.noteSur} />
      </View>
      
      <View style={styles.rightColumn}>
        <Text style={[styles.moyenne, estFaible && styles.moyenneFaible]}>
          {matiere.moyenne.toFixed(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  leftColumn: {
    width: 50,
    alignItems: 'center',
  },
  picto: {
    fontSize: 32,
  },
  middleColumn: {
    flex: 1,
    marginLeft: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  matiereNom: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  alerteBadge: {
    marginLeft: 8,
  },
  alerteText: {
    fontSize: 14,
  },
  rightColumn: {
    width: 50,
    alignItems: 'flex-end',
  },
  moyenne: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  moyenneFaible: {
    color: '#EF4444',
  },
});