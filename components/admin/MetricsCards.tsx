import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Users,
  Building2,
  CreditCard,
  RefreshCw
} from 'lucide-react-native';
import { DashboardMetrics } from '@/hooks/useDashboardMetrics';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
  onRefresh?: () => void;
}

export default function MetricsCards({ metrics, onRefresh }: MetricsCardsProps) {
  console.log('[MetricsCards] Rendering with metrics:', metrics);
  const { loading, error, refresh } = metrics;
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des indicateurs...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={24} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        {onRefresh && (
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <RefreshCw size={16} color="#3B82F6" />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Carte Taux de conversion Phase 1 → Phase 2 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Building2 size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Conversion Phase 1 → 2</Text>
        </View>
        <Text style={styles.cardValue}>
          {metrics.tauxConversionPhase1to2 ?? '—'}%
        </Text>
        <Text style={styles.cardSubtitle}>
          {metrics.totalDemandes} demandes → {metrics.totalValidations} validées
        </Text>
      </View>
      
      {/* Carte Taux de conversion Phase 2 → Abonnement */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <CreditCard size={20} color="#10B981" />
          <Text style={styles.cardTitle}>Conversion Phase 2 → Abo</Text>
        </View>
        <Text style={styles.cardValue}>
          {metrics.tauxConversionPhase2toAbonnement ?? '—'}%
        </Text>
        <View style={styles.planDistribution}>
          <Text style={styles.planText}>E: {metrics.totalAbonnements.essentiel}</Text>
          <Text style={styles.planText}>P: {metrics.totalAbonnements.premium}</Text>
          <Text style={styles.planText}>Pr: {metrics.totalAbonnements.prestige}</Text>
        </View>
      </View>
      
      {/* Carte Temps moyen */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Clock size={20} color="#F59E0B" />
          <Text style={styles.cardTitle}>Délais moyens</Text>
        </View>
        <Text style={styles.cardValue}>
          {metrics.tempsMoyenPhase1to2 ?? '—'}h
        </Text>
        <Text style={styles.cardSubtitle}>
          Phase 1→2: {metrics.tempsMoyenPhase1to2 ?? '—'} heures
        </Text>
        <Text style={styles.cardSubtitle}>
          Phase 2→Abo: {metrics.tempsMoyenPhase2toAbonnement ?? '—'} jours
        </Text>
      </View>
      
      {/* Carte Qualité des dossiers */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <CheckCircle size={20} color="#10B981" />
          <Text style={styles.cardTitle}>Qualité des dossiers</Text>
        </View>
        <View style={styles.qualityRow}>
          <Text style={styles.qualityLabel}>Auto-validation:</Text>
          <Text style={[styles.qualityValue, { color: '#10B981' }]}>
            {metrics.tauxValidationAuto ?? '—'}%
          </Text>
        </View>
        <View style={styles.qualityRow}>
          <Text style={styles.qualityLabel}>Taux de rejet:</Text>
          <Text style={[styles.qualityValue, { color: '#EF4444' }]}>
            {metrics.tauxRejet ?? '—'}%
          </Text>
        </View>
      </View>
      
      {/* Carte Alertes */}
      <View style={[styles.card, styles.alertCard]}>
        <View style={styles.cardHeader}>
          <AlertTriangle size={20} color="#F59E0B" />
          <Text style={styles.cardTitle}>Alertes</Text>
        </View>
        
        {metrics.demandesEnAttente48h > 0 && (
          <View style={styles.alertItem}>
            <Clock size={14} color="#F59E0B" />
            <Text style={styles.alertText}>
              {metrics.demandesEnAttente48h} demande(s) >48h
            </Text>
          </View>
        )}
        
        {metrics.etablissementsPhase2Plus30Jours > 0 && (
          <View style={styles.alertItem}>
            <AlertTriangle size={14} color="#F59E0B" />
            <Text style={styles.alertText}>
              {metrics.etablissementsPhase2Plus30Jours} établissement(s) Phase 2 >30j
            </Text>
          </View>
        )}
        
        {metrics.demandesEnAttente48h === 0 && metrics.etablissementsPhase2Plus30Jours === 0 && (
          <Text style={styles.noAlertText}>Aucune alerte</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 12,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  retryText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  planDistribution: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  planText: {
    fontSize: 10,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  qualityLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  qualityValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 12,
    color: '#F59E0B',
    flex: 1,
  },
  noAlertText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});