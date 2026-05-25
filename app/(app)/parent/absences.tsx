import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAbsencesParent } from '@/hooks/useAbsencesParent';
import { Calendar, AlertCircle, CheckCircle, XCircle, ChevronLeft } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function ParentAbsencesScreen() {
  const router = useRouter();
  const { enfantId, enfantNom } = useLocalSearchParams<{ enfantId: string; enfantNom: string }>();
  const { absences, loading, error, refetch } = useAbsencesParent(enfantId || '');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!enfantId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Aucun enfant sélectionné</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des absences...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Absences de {enfantNom || 'mon enfant'}</Text>
        <View style={styles.headerRight} />
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorText}>Une erreur est survenue</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      ) : absences.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucune absence</Text>
          <Text style={styles.emptyText}>
            {enfantNom} n'a aucune absence enregistrée.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {absences.map((absence) => (
            <View key={absence.id} style={styles.absenceCard}>
              <View style={styles.absenceHeader}>
                <View style={styles.dateContainer}>
                  <Calendar size={16} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.dateText}>{formatDate(absence.date_absence)}</Text>
                </View>
                {absence.justifie ? (
                  <View style={[styles.badge, styles.badgeJustified]}>
                    <CheckCircle size={12} color="#065F46" />
                    <Text style={styles.badgeTextJustified}>Justifiée</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, styles.badgeUnjustified]}>
                    <XCircle size={12} color="#991B1B" />
                    <Text style={styles.badgeTextUnjustified}>Non justifiée</Text>
                  </View>
                )}
              </View>
              {(absence.heure_debut || absence.heure_fin) && (
                <Text style={styles.horaireText}>
                  {absence.heure_debut?.slice(0, 5)} - {absence.heure_fin?.slice(0, 5)}
                </Text>
              )}
              {absence.motif && (
                <Text style={styles.motifText}>Motif : {absence.motif}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  absenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  absenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeJustified: {
    backgroundColor: '#D1FAE5',
  },
  badgeUnjustified: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextJustified: {
    fontSize: 11,
    fontWeight: '500',
    color: '#065F46',
  },
  badgeTextUnjustified: {
    fontSize: 11,
    fontWeight: '500',
    color: '#991B1B',
  },
  horaireText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  motifText: {
    fontSize: 13,
    color: '#374151',
  },
});