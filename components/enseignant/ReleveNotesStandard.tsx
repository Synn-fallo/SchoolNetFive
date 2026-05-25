import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Download } from 'lucide-react-native';
import { ReleveData, PeriodeType } from '@/types/releve.types';
import { exportReleveToCSV } from '@/utils/exportCSV';
import theme from '@/constants/theme';

interface Props {
  releve: ReleveData;
  eleveNom: string;
  elevePrenom: string;
  classeNom: string;
  type: 'officielle' | 'personnelle';
  selectedPeriode: PeriodeType;
}

// Couleurs pour la moyenne matière
const getMoyenneColor = (moyenne: number): string => {
  if (moyenne >= 12) return '#10B981'; // Vert
  if (moyenne >= 10) return '#F59E0B'; // Orange
  return '#EF4444'; // Rouge
};

export default function ReleveNotesStandard({ 
  releve, 
  eleveNom, 
  elevePrenom, 
  classeNom, 
  type,
  selectedPeriode 
}: Props) {
  // Déterminer le nombre maximum d'évaluations pour une matière
  const maxEvals = Math.max(...releve.matieres.map(m => m.evaluations.length), 0);
  const evalCols = Array.from({ length: maxEvals }, (_, i) => i);

  // Export CSV
  const handleExportCSV = () => {
    try {
      exportReleveToCSV(releve, eleveNom, elevePrenom);
      Alert.alert('Succès', 'Le fichier CSV a été exporté avec succès');
    } catch (error) {
      console.error('Erreur export CSV:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le fichier CSV');
    }
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.scrollContainer}>
      <View style={styles.container}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>Relevé de notes</Text>
          <Text style={styles.subtitle}>
            {elevePrenom} {eleveNom} - {classeNom}
            {type === 'officielle' && releve.classe.effectif && ` (${releve.classe.effectif} élèves)`}
          </Text>
          <Text style={styles.periode}>Période : {selectedPeriode || releve.periode}</Text>
        </View>

        {/* Bouton Export CSV */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
          <Download size={18} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Exporter CSV</Text>
        </TouchableOpacity>

        {/* Tableau */}
        <View style={styles.table}>
          {/* Ligne en-tête */}
          <View style={styles.tableRow}>
            <Text style={[styles.cell, styles.cellMatiere]}>Matière (coef)</Text>
            {evalCols.map((_, idx) => (
              <View key={idx} style={[styles.cell, styles.cellEval]}>
                <Text style={styles.cellTitle}>Éval {idx + 1}</Text>
                <Text style={styles.cellDate}>---</Text>
              </View>
            ))}
            <Text style={[styles.cell, styles.cellMoyenne]}>Moyenne</Text>
            <Text style={[styles.cell, styles.cellRang]}>Rang</Text>
            <Text style={[styles.cell, styles.cellApp]}>Appréciation</Text>
          </View>

          {/* Lignes matières */}
          {releve.matieres.map((matiere, idx) => {
            const moyenneColor = getMoyenneColor(matiere.moyenne);
            
            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellMatiere]}>
                  {matiere.nom} ({matiere.coefficient})
                </Text>
                
                {evalCols.map((_, colIdx) => {
                  const evalData = matiere.evaluations[colIdx];
                  const noteColor = evalData?.note ? getMoyenneColor(evalData.note) : '#6B7280';
                  
                  return (
                    <View key={colIdx} style={[styles.cell, styles.cellEval]}>
                      <Text style={[styles.noteValue, { color: noteColor }]}>
                        {evalData?.note || '-'}
                      </Text>
                      {evalData?.appreciation && (
                        <Text style={styles.appreciationText} numberOfLines={1}>
                          {evalData.appreciation}
                        </Text>
                      )}
                    </View>
                  );
                })}
                
                <Text style={[styles.cell, styles.cellMoyenne, { color: moyenneColor, fontWeight: '700' }]}>
                  {matiere.moyenne}
                </Text>
                
                <Text style={[styles.cell, styles.cellRang]}>
                  {matiere.rang || '-'}
                </Text>
                
                <Text style={[styles.cell, styles.cellApp]} numberOfLines={2}>
                  {matiere.appreciation || '-'}
                </Text>
              </View>
            );
          })}

          {/* Ligne moyenne générale */}
          <View style={[styles.tableRow, styles.rowTotal]}>
            <Text style={[styles.cell, styles.cellMatiere, styles.totalText]}>Moyenne générale</Text>
            {evalCols.map((_, idx) => <View key={idx} style={[styles.cell, styles.cellEval]} />)}
            <Text style={[styles.cell, styles.cellMoyenne, styles.totalText]}>
              {releve.moyenneGenerale}/20
            </Text>
            <Text style={[styles.cell, styles.cellRang, styles.totalText]}>
              {releve.rang || '-'}
            </Text>
            <View style={[styles.cell, styles.cellApp]} />
          </View>
        </View>

        {/* Statistiques (si officielle) */}
        {type === 'officielle' && releve.plusForteMoyenne && (
          <View style={styles.stats}>
            <Text style={styles.statsText}>
              📊 Plus forte moyenne : {releve.plusForteMoyenne.valeur} ({releve.plusForteMoyenne.eleve})
            </Text>
            <Text style={styles.statsText}>
              📉 Plus faible moyenne : {releve.plusFaibleMoyenne?.valeur} ({releve.plusFaibleMoyenne?.eleve})
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    minWidth: 600,
  },
  header: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  periode: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowTotal: {
    backgroundColor: '#F3F4F6',
  },
  cell: {
    padding: 10,
    fontSize: 12,
    color: '#1F2937',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    minWidth: 80,
  },
  cellMatiere: {
    flex: 2,
    fontWeight: '500',
    minWidth: 100,
  },
  cellEval: {
    flex: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  cellTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  cellDate: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cellMoyenne: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '500',
    minWidth: 70,
  },
  cellRang: {
    flex: 1,
    textAlign: 'center',
    minWidth: 60,
  },
  cellApp: {
    flex: 2,
    minWidth: 100,
  },
  totalText: {
    fontWeight: '700',
    color: theme.colors.primary.DEFAULT,
  },
  noteValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  appreciationText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  stats: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    marginTop: 16,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 12,
    color: '#6B7280',
    marginVertical: 2,
  },
});