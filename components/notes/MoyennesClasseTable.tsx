// /home/project/components/notes/MoyennesClasseTable.tsx
// Tableau des moyennes par classe

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ClasseStats } from '@/types/notes.types';
import theme from '@/constants/theme';

interface MoyennesClasseTableProps {
  data: ClasseStats[];
  onSelectClasse: (classeId: string, classeNom: string) => void;
  isSubscribed: boolean;
}

const getMoyenneColor = (moyenne: number): string => {
  if (moyenne >= 16) return '#10B981';
  if (moyenne >= 14) return '#3B82F6';
  if (moyenne >= 12) return '#F59E0B';
  if (moyenne >= 10) return '#F97316';
  return '#EF4444';
};

const getTauxColor = (taux: number): string => {
  if (taux >= 80) return '#10B981';
  if (taux >= 60) return '#3B82F6';
  if (taux >= 40) return '#F59E0B';
  return '#EF4444';
};

export default function MoyennesClasseTable({ data, onSelectClasse, isSubscribed }: MoyennesClasseTableProps) {
  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📊 Moyennes par classe</Text>
        <Text style={styles.disabledText}>🔒 Abonnement requis pour voir les moyennes par classe</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📊 Moyennes par classe</Text>
        <Text style={styles.emptyText}>Aucune classe trouvée</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Moyennes par classe</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* En-tête */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.classeCell]}>Classe</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Moyenne</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Rang</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Effectif</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Taux réussite</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Action</Text>
          </View>

          {/* Lignes */}
          {data.map((classe, index) => (
            <TouchableOpacity
              key={classe.id}
              style={[styles.tableRow, index % 2 === 0 && styles.rowEven]}
              onPress={() => onSelectClasse(classe.id, classe.nom)}
            >
              <Text style={[styles.cell, styles.classeCell]} numberOfLines={1}>
                {classe.nom}
              </Text>
              <Text style={[styles.cell, styles.centerCell, styles.moyenneCell, { color: getMoyenneColor(classe.moyenneGenerale) }]}>
                {classe.moyenneGenerale.toFixed(2)}
              </Text>
              <Text style={[styles.cell, styles.centerCell]}>{classe.rang}/{data.length}</Text>
              <Text style={[styles.cell, styles.centerCell]}>{classe.effectif}</Text>
              <Text style={[styles.cell, styles.centerCell, { color: getTauxColor(classe.tauxReussite) }]}>
                {classe.tauxReussite.toFixed(0)}%
              </Text>
              <View style={[styles.cell, styles.centerCell]}>
                <ChevronRight size={18} color={theme.colors.primary.DEFAULT} />
              </View>
            </TouchableOpacity>
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
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  rowEven: {
    backgroundColor: '#FFFFFF',
  },
  cell: {
    fontSize: 13,
    color: '#1F2937',
  },
  classeCell: {
    width: 100,
  },
  centerCell: {
    width: 85,
    textAlign: 'center',
  },
  moyenneCell: {
    fontWeight: '600',
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