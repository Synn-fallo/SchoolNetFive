import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Mail, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Building2,
  RefreshCw,
  BarChart3,
  PieChart,
  Calendar
} from 'lucide-react-native';
import { EnseignantMetrics } from '@/hooks/useEnseignantMetrics';
import { Card } from '@/components/Card';

interface EnseignantMetricsCardsProps {
  metrics: EnseignantMetrics;
  onRefresh?: () => void;
}

export default function EnseignantMetricsCards({ metrics, onRefresh }: EnseignantMetricsCardsProps) {
  const { loading, error, refresh } = metrics;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des métriques enseignants...</Text>
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
      {/* Carte Volumétrie */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Users size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Enseignants</Text>
        </View>
        <Text style={styles.cardValue}>{metrics.totalEnseignants}</Text>
        <View style={styles.subStats}>
          <View style={styles.subStat}>
            <UserCheck size={12} color="#10B981" />
            <Text style={styles.subStatText}>Actifs: {metrics.enseignantsActifs}</Text>
          </View>
          <View style={styles.subStat}>
            <UserX size={12} color="#EF4444" />
            <Text style={styles.subStatText}>Inactifs: {metrics.enseignantsInactifs}</Text>
          </View>
        </View>
      </View>

      {/* Carte Invitations */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Mail size={20} color="#F59E0B" />
          <Text style={styles.cardTitle}>Invitations</Text>
        </View>
        <Text style={styles.cardValue}>{metrics.invitationsEnCours}</Text>
        <Text style={styles.cardSubtitle}>en cours</Text>
        <View style={styles.subStats}>
          <View style={styles.subStat}>
            <Clock size={12} color="#9CA3AF" />
            <Text style={styles.subStatText}>Expirées: {metrics.invitationsExpirees}</Text>
          </View>
          {metrics.tauxAcceptationInvitations !== null && (
            <View style={styles.subStat}>
              <TrendingUp size={12} color="#10B981" />
              <Text style={styles.subStatText}>Acceptation: {metrics.tauxAcceptationInvitations}%</Text>
            </View>
          )}
        </View>
        {metrics.delaiMoyenAcceptation !== null && (
          <Text style={styles.smallNote}>Délai moyen: {metrics.delaiMoyenAcceptation} jours</Text>
        )}
      </View>

      {/* Carte Rattachements */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Building2 size={20} color="#10B981" />
          <Text style={styles.cardTitle}>Rattachements</Text>
        </View>
        <View style={styles.rattachementStats}>
          <View style={styles.rattachementItem}>
            <Text style={styles.rattachementNumber}>{metrics.enseignantsAvecClasses}</Text>
            <Text style={styles.rattachementLabel}>avec classe(s)</Text>
          </View>
          <View style={styles.rattachementDivider} />
          <View style={styles.rattachementItem}>
            <Text style={styles.rattachementNumber}>{metrics.enseignantsAvecGroupes}</Text>
            <Text style={styles.rattachementLabel}>avec groupe(s)</Text>
          </View>
        </View>
        {metrics.tauxEnseignantsMultiEtablissements !== null && (
          <Text style={styles.smallNote}>
            {metrics.tauxEnseignantsMultiEtablissements}% dans plusieurs établissements
          </Text>
        )}
      </View>

      {/* Carte Alertes */}
      <View style={[styles.card, styles.alertCard]}>
        <View style={styles.cardHeader}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={styles.cardTitle}>Alertes</Text>
        </View>
        
        {metrics.enseignantsSansClasseDepuis > 0 && (
          <View style={styles.alertItem}>
            <Calendar size={12} color="#F59E0B" />
            <Text style={styles.alertText}>
              {metrics.enseignantsSansClasseDepuis} enseignant(s) sans classe depuis >7j
            </Text>
          </View>
        )}
        
        {metrics.plafondsAtteints > 0 && (
          <View style={styles.alertItem}>
            <AlertTriangle size={12} color="#EF4444" />
            <Text style={[styles.alertText, styles.alertTextCritical]}>
              {metrics.plafondsAtteints} département(s) à capacité maximale
            </Text>
          </View>
        )}
        
        {metrics.groupesSansResponsable > 0 && (
          <View style={styles.alertItem}>
            <Users size={12} color="#F59E0B" />
            <Text style={styles.alertText}>
              {metrics.groupesSansResponsable} groupe(s) sans responsable
            </Text>
          </View>
        )}
        
        {metrics.invitationsExpirées > 0 && (
          <View style={styles.alertItem}>
            <Clock size={12} color="#F59E0B" />
            <Text style={styles.alertText}>
              {metrics.invitationsExpirées} invitation(s) expirée(s)
            </Text>
          </View>
        )}
        
        {metrics.enseignantsSansClasseDepuis === 0 && 
         metrics.plafondsAtteints === 0 && 
         metrics.groupesSansResponsable === 0 && 
         metrics.invitationsExpirées === 0 && (
          <Text style={styles.noAlertText}>Aucune alerte</Text>
        )}
      </View>

      {/* Carte Plafonds (si disponible) */}
      {metrics.plafondsParDepartement.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BarChart3 size={20} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Plafonds par département</Text>
          </View>
          {metrics.plafondsParDepartement.slice(0, 3).map((dept, index) => (
            <View key={index} style={styles.plafondItem}>
              <View style={styles.plafondHeader}>
                <Text style={styles.plafondName}>{dept.departement}</Text>
                <Text style={styles.plafondCount}>
                  {dept.actuel}/{dept.plafond}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${dept.pourcentage}%`,
                      backgroundColor: dept.pourcentage >= 90 ? '#EF4444' : 
                                      dept.pourcentage >= 70 ? '#F59E0B' : '#10B981'
                    }
                  ]} 
                />
              </View>
              {dept.ae_nom && (
                <Text style={styles.aeName}>
                  AE: {dept.ae_prenom} {dept.ae_nom}
                </Text>
              )}
            </View>
          ))}
          {metrics.plafondsParDepartement.length > 3 && (
            <Text style={styles.moreText}>
              +{metrics.plafondsParDepartement.length - 3} autres départements
            </Text>
          )}
        </View>
      )}

      {/* Carte Répartition par département */}
      {metrics.repartitionParDepartement.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <PieChart size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>Répartition par département</Text>
          </View>
          {metrics.repartitionParDepartement.slice(0, 4).map((dept, index) => (
            <View key={index} style={styles.repartitionItem}>
              <Text style={styles.repartitionName}>{dept.departement}</Text>
              <Text style={styles.repartitionCount}>{dept.count}</Text>
            </View>
          ))}
          {metrics.repartitionParDepartement.length > 4 && (
            <Text style={styles.moreText}>
              +{metrics.repartitionParDepartement.length - 4} autres
            </Text>
          )}
        </View>
      )}
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
    width: 220,
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  subStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  subStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subStatText: {
    fontSize: 10,
    color: '#6B7280',
  },
  smallNote: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  rattachementStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  rattachementItem: {
    alignItems: 'center',
    flex: 1,
  },
  rattachementNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  rattachementLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  rattachementDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 11,
    color: '#F59E0B',
    flex: 1,
  },
  alertTextCritical: {
    color: '#EF4444',
  },
  noAlertText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  plafondItem: {
    marginBottom: 12,
  },
  plafondHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  plafondName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  plafondCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  aeName: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },
  repartitionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  repartitionName: {
    fontSize: 12,
    color: '#4B5563',
  },
  repartitionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  moreText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});