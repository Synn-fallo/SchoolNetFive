// /home/project/components/notes/ElevesListCard.tsx
// Liste des élèves avec moyenne, rang, appréciation, éligibilité et cases à cocher
// PHASE 3 : Ajout de la sélection multiple pour génération en série

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronRight, FileText, Eye, AlertTriangle, CheckSquare, Square } from 'lucide-react-native';
import { EleveWithMoyenne } from '@/types/notes.types';
import theme from '@/constants/theme';

interface EleveWithEligibilite extends EleveWithMoyenne {
  eligible?: boolean;
  motifs?: string[];
}

interface ElevesListCardProps {
  data: EleveWithEligibilite[];
  onSelectEleve: (eleve: EleveWithMoyenne) => void;
  onGenerateBulletin: (eleveId: string) => void;
  isSubscribed: boolean;
  eligibiliteLoading?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (eleveId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const getAppreciationColor = (appreciation: string): string => {
  switch (appreciation) {
    case 'Excellent':
      return '#10B981';
    case 'Bien':
      return '#3B82F6';
    case 'Assez bien':
      return '#F59E0B';
    case 'Passable':
      return '#F97316';
    default:
      return '#EF4444';
  }
};

const getMoyenneColor = (moyenne: number): string => {
  if (moyenne >= 16) return '#10B981';
  if (moyenne >= 14) return '#3B82F6';
  if (moyenne >= 12) return '#F59E0B';
  if (moyenne >= 10) return '#F97316';
  return '#EF4444';
};

const getMedalEmoji = (rang: number): string => {
  if (rang === 1) return '🥇 ';
  if (rang === 2) return '🥈 ';
  if (rang === 3) return '🥉 ';
  return '';
};

export default function ElevesListCard({ 
  data, 
  onSelectEleve, 
  onGenerateBulletin, 
  isSubscribed,
  eligibiliteLoading = false,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: ElevesListCardProps) {
  const isSelected = (id: string) => selectedIds.includes(id);

  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>👨‍🎓 Liste des élèves</Text>
        <Text style={styles.disabledText}>🔒 Abonnement requis pour voir la liste des élèves</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>👨‍🎓 Liste des élèves</Text>
        <Text style={styles.emptyText}>Aucun élève dans cette classe</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>👨‍🎓 Liste des élèves</Text>
        {eligibiliteLoading && (
          <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
        )}
      </View>

      {/* Barre d'actions de sélection (si mode sélection activé) */}
      {selectable && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedIds.length} / {data.length} élève(s) sélectionné(s)
            </Text>
          </View>
          <View style={styles.selectionButtons}>
            <TouchableOpacity onPress={onSelectAll} style={styles.selectionButton}>
              <CheckSquare size={14} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.selectionButtonText}>Tout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDeselectAll} style={styles.selectionButton}>
              <Square size={14} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.selectionButtonText}>Rien</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* En-tête */}
          <View style={styles.tableHeader}>
            {selectable && (
              <Text style={[styles.headerCell, styles.selectCell]}> </Text>
            )}
            <Text style={[styles.headerCell, styles.rangCell]}>Rang</Text>
            <Text style={[styles.headerCell, styles.nomCell]}>Nom & Prénoms</Text>
            <Text style={[styles.headerCell, styles.matriculeCell]}>Matricule</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Moyenne</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Appréciation</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Nb. notes</Text>
            <Text style={[styles.headerCell, styles.eligibiliteCell]}>Éligible</Text>
            <Text style={[styles.headerCell, styles.centerCell]}>Actions</Text>
          </View>

          {/* Lignes */}
          {data.map((eleve, index) => {
            const isItemSelected = isSelected(eleve.id);
            const isEligible = eleve.eligible !== false;
            const canSelect = isEligible;

            return (
              <View key={eleve.id} style={[styles.tableRow, index % 2 === 0 && styles.rowEven]}>
                {selectable && (
                  <TouchableOpacity
                    style={styles.selectCell}
                    onPress={() => canSelect && onToggleSelect?.(eleve.id)}
                    disabled={!canSelect}
                  >
                    {isItemSelected ? (
                      <CheckSquare size={18} color={theme.colors.primary.DEFAULT} />
                    ) : (
                      <Square size={18} color={canSelect ? '#9CA3AF' : '#D1D5DB'} />
                    )}
                  </TouchableOpacity>
                )}
                <Text style={[styles.cell, styles.rangCell]}>
                  {getMedalEmoji(eleve.rang)} {eleve.rang}
                </Text>
                <TouchableOpacity style={[styles.cell, styles.nomCell]} onPress={() => onSelectEleve(eleve)}>
                  <Text style={styles.eleveName}>{eleve.prenom} {eleve.nom}</Text>
                </TouchableOpacity>
                <Text style={[styles.cell, styles.matriculeCell, styles.matriculeText]} numberOfLines={1}>
                  {eleve.matricule}
                </Text>
                <Text style={[styles.cell, styles.centerCell, styles.moyenneCell, { color: getMoyenneColor(eleve.moyenne) }]}>
                  {eleve.moyenne.toFixed(2)}
                </Text>
                <Text style={[styles.cell, styles.centerCell, { color: getAppreciationColor(eleve.appreciation) }]}>
                  {eleve.appreciation}
                </Text>
                <Text style={[styles.cell, styles.centerCell]}>{eleve.notesCount}</Text>
                <View style={[styles.cell, styles.eligibiliteCell]}>
                  {!eligibiliteLoading && (
                    <View style={[
                      styles.eligibiliteBadge,
                      isEligible ? styles.eligibiliteOk : styles.eligibiliteKo
                    ]}>
                      {!isEligible && <AlertTriangle size={10} color="#D97706" />}
                      <Text style={[
                        styles.eligibiliteText,
                        isEligible ? styles.eligibiliteTextOk : styles.eligibiliteTextKo
                      ]}>
                        {isEligible ? 'Oui' : 'Non'}
                      </Text>
                    </View>
                  )}
                  {eligibiliteLoading && (
                    <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
                  )}
                </View>
                <View style={[styles.cell, styles.centerCell, styles.actionsCell]}>
                  {/* Bouton Voir */}
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => onSelectEleve(eleve)}
                  >
                    <Eye size={14} color="#3B82F6" />
                    <Text style={styles.viewButtonText}>Voir</Text>
                  </TouchableOpacity>
                  {/* Bouton Bulletin - désactivé si non éligible */}
                  <TouchableOpacity
                    style={[
                      styles.bulletinButton,
                      !isEligible && !eligibiliteLoading && styles.bulletinButtonDisabled
                    ]}
                    onPress={() => onGenerateBulletin(eleve.id)}
                    disabled={!isEligible && !eligibiliteLoading}
                  >
                    <FileText size={14} color={!isEligible && !eligibiliteLoading ? '#9CA3AF' : '#10B981'} />
                    <Text style={[
                      styles.bulletinButtonText,
                      !isEligible && !eligibiliteLoading && styles.bulletinButtonTextDisabled
                    ]}>
                      Bulletin
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Note sur l'éligibilité si des élèves sont non éligibles */}
      {data.some(e => e.eligible === false) && !eligibiliteLoading && (
        <View style={styles.eligibiliteNote}>
          <AlertTriangle size={14} color="#D97706" />
          <Text style={styles.eligibiliteNoteText}>
            Les élèves marqués "Non éligible" ne peuvent pas générer leur bulletin.
            {'\n'}Vérifiez les motifs dans le détail de l'élève.
          </Text>
        </View>
      )}

      {/* Légende des appréciations */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Légende des appréciations :</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  selectionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  selectionButtonText: {
    fontSize: 11,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
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
  selectCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 12,
    color: '#1F2937',
  },
  rangCell: {
    width: 60,
    textAlign: 'center',
  },
  nomCell: {
    width: 140,
  },
  matriculeCell: {
    width: 100,
  },
  centerCell: {
    width: 90,
    textAlign: 'center',
  },
  eligibiliteCell: {
    width: 70,
    textAlign: 'center',
    alignItems: 'center',
  },
  actionsCell: {
    width: 110,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  eleveName: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  matriculeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  moyenneCell: {
    fontWeight: '600',
  },
  eligibiliteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'center',
  },
  eligibiliteOk: {
    backgroundColor: '#D1FAE5',
  },
  eligibiliteKo: {
    backgroundColor: '#FEF3C7',
  },
  eligibiliteText: {
    fontSize: 10,
    fontWeight: '500',
  },
  eligibiliteTextOk: {
    color: '#10B981',
  },
  eligibiliteTextKo: {
    color: '#D97706',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewButtonText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  bulletinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bulletinButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  bulletinButtonText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  bulletinButtonTextDisabled: {
    color: '#9CA3AF',
  },
  eligibiliteNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  eligibiliteNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#D97706',
    lineHeight: 16,
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