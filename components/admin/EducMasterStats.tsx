import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card } from '@/components/Card';
import { RefreshCw, TrendingUp, TrendingDown, Clock, Database, AlertCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EducMasterStatsProps {
  stats: any;
  loading: boolean;
  onRefresh: () => void;
}

export default function EducMasterStats({ stats, loading, onRefresh }: EducMasterStatsProps) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
        </View>
      </Card>
    );
  }

  if (!stats || stats.total_calls === 0) {
    return (
      <Card style={styles.card}>
        <View style={styles.emptyContainer}>
          <Database size={40} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucune donnée</Text>
          <Text style={styles.emptyText}>
            Aucun appel API n'a encore été effectué.
          </Text>
        </View>
      </Card>
    );
  }

  const getTrendIcon = (rate: number) => {
    if (rate >= 95) return <TrendingUp size={16} color="#10B981" />;
    if (rate >= 80) return <TrendingUp size={16} color="#F59E0B" />;
    return <TrendingDown size={16} color="#EF4444" />;
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 95) return '#10B981';
    if (rate >= 80) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Statistiques API EducMaster</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw size={18} color={theme.colors.neutral[500]} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total_calls}</Text>
          <Text style={styles.statLabel}>Appels totaux</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.success_count}</Text>
          <Text style={styles.statLabel}>Succès</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.failure_count}</Text>
          <Text style={styles.statLabel}>Échecs</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statsRowItem}>
          <View style={styles.statsRowIcon}>
            {getTrendIcon(stats.success_rate)}
          </View>
          <View>
            <Text style={[styles.statsRowValue, { color: getSuccessColor(stats.success_rate) }]}>
              {stats.success_rate}%
            </Text>
            <Text style={styles.statsRowLabel}>Taux de succès</Text>
          </View>
        </View>
        <View style={styles.statsRowItem}>
          <View style={styles.statsRowIcon}>
            <Clock size={16} color={theme.colors.neutral[500]} />
          </View>
          <View>
            <Text style={styles.statsRowValue}>{stats.avg_response_time_ms}ms</Text>
            <Text style={styles.statsRowLabel}>Temps moyen</Text>
          </View>
        </View>
      </View>

      {stats.last_call_at && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dernier appel :</Text>
          <Text style={styles.infoValue}>
            {new Date(stats.last_call_at).toLocaleString()}
          </Text>
        </View>
      )}

      {stats.last_error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={14} color="#EF4444" />
          <Text style={styles.errorText}>{stats.last_error}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statsRowItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statsRowLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
  },
});