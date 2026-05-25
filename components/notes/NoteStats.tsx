import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, BarChart3, Star } from 'lucide-react-native';
import theme from '@/constants/theme';

interface NoteStatsProps {
  stats: {
    moyenne: number;
    mediane: number;
    ecartType: number;
    min: number;
    max: number;
    nombreNotes: number;
  };
}

export default function NoteStats({ stats }: NoteStatsProps) {
  const isAboveAverage = stats.moyenne >= 10;
  const progressPercentage = (stats.moyenne / 20) * 100;

  return (
    <View style={styles.container}>
      {/* Vue d'ensemble */}
      <View style={styles.overview}>
        <View style={styles.moyenneCard}>
          <Text style={styles.moyenneLabel}>Moyenne générale</Text>
          <Text style={[styles.moyenneValue, { color: isAboveAverage ? '#10B981' : '#EF4444' }]}>
            {stats.moyenne.toFixed(1)}<Text style={styles.moyenneUnit}>/20</Text>
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: isAboveAverage ? '#10B981' : '#EF4444' }]} />
          </View>
        </View>
      </View>

      {/* Grille de statistiques */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <TrendingUp size={20} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.max.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Meilleure note</Text>
        </View>

        <View style={styles.statCard}>
          <TrendingDown size={20} color="#EF4444" />
          <Text style={styles.statValue}>{stats.min.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Note la plus basse</Text>
        </View>

        <View style={styles.statCard}>
          <BarChart3 size={20} color="#F59E0B" />
          <Text style={styles.statValue}>{stats.mediane.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Médiane</Text>
        </View>

        <View style={styles.statCard}>
          <Star size={20} color="#8B5CF6" />
          <Text style={styles.statValue}>{stats.ecartType.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Écart-type</Text>
        </View>
      </View>

      {/* Détails supplémentaires */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Nombre de notes</Text>
          <Text style={styles.detailValue}>{stats.nombreNotes}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Écart entre max et min</Text>
          <Text style={styles.detailValue}>{(stats.max - stats.min).toFixed(1)} points</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Écart par rapport à la moyenne</Text>
          <Text style={[styles.detailValue, { color: isAboveAverage ? '#10B981' : '#EF4444' }]}>
            {stats.moyenne >= 10 ? '+' : ''}{(stats.moyenne - 10).toFixed(1)} points
          </Text>
        </View>
      </View>

      {/* Appréciation */}
      <View style={[styles.appreciationCard, { backgroundColor: isAboveAverage ? '#EFF6FF' : '#FEF3C7' }]}>
        <Text style={[styles.appreciationText, { color: isAboveAverage ? '#3B82F6' : '#F59E0B' }]}>
          {stats.moyenne >= 16 ? '🏆 Excellent ! Continuez sur cette lancée.' :
           stats.moyenne >= 14 ? '🎯 Très bien ! Vous êtes sur la bonne voie.' :
           stats.moyenne >= 12 ? '👍 Satisfaisant. Peut encore s\'améliorer.' :
           stats.moyenne >= 10 ? '📚 Moyenne. Travaillez les points faibles.' :
           stats.moyenne >= 8 ? '⚠️ En dessous de la moyenne. Besoin de révisions.' :
           '🔴 À améliorer sérieusement. N\'hésitez pas à demander de l\'aide.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  overview: {
    marginBottom: 20,
  },
  moyenneCard: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  moyenneLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  moyenneValue: {
    fontSize: 40,
    fontWeight: '700',
  },
  moyenneUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  details: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  appreciationCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  appreciationText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});