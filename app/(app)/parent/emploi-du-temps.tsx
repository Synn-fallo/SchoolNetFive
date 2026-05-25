import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEmploiDuTempsParent } from '@/hooks/useEmploiDuTempsParent';
import { Calendar, Clock, User, BookOpen, ChevronLeft } from 'lucide-react-native';
import theme from '@/constants/theme';

type JourKey = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi';

const JOURS: { key: JourKey; label: string }[] = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
];

export default function ParentEmploiDuTempsScreen() {
  const router = useRouter();
  const { enfantId, enfantNom } = useLocalSearchParams<{ enfantId: string; enfantNom: string }>();
  const { emploi, loading, error, refetch } = useEmploiDuTempsParent(enfantId || '');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJour, setSelectedJour] = useState<JourKey>('lundi');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getCoursForJour = () => {
    return emploi[selectedJour] || [];
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
        <Text style={styles.loadingText}>Chargement de l'emploi du temps...</Text>
      </View>
    );
  }

  const coursDuJour = getCoursForJour();

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
        <Text style={styles.headerTitle}>Emploi du temps de {enfantNom || 'mon enfant'}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Sélecteur de jour */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.joursScroll}>
        <View style={styles.joursContainer}>
          {JOURS.map((jour) => (
            <TouchableOpacity
              key={jour.key}
              style={[styles.jourTab, selectedJour === jour.key && styles.jourTabActive]}
              onPress={() => setSelectedJour(jour.key)}
            >
              <Text style={[styles.jourTabText, selectedJour === jour.key && styles.jourTabTextActive]}>
                {jour.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Une erreur est survenue</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      ) : coursDuJour.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucun cours</Text>
          <Text style={styles.emptyText}>
            Aucun cours programmé pour {selectedJour}.
          </Text>
        </View>
      ) : (
        <View style={styles.coursList}>
          {coursDuJour.map((cours) => (
            <View key={cours.id} style={styles.coursCard}>
              <View style={styles.coursHoraire}>
                <Clock size={14} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.horaireText}>
                  {cours.heure_debut} - {cours.heure_fin}
                </Text>
                <Text style={styles.dureeText}>({cours.duree_prevue_heures}h)</Text>
              </View>
              <Text style={styles.matiereNom}>{cours.matiere_nom}</Text>
              <View style={styles.enseignantRow}>
                <User size={14} color="#6B7280" />
                <Text style={styles.enseignantText}>
                  {cours.enseignant_prenom} {cours.enseignant_nom}
                </Text>
              </View>
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
  joursScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  joursContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  jourTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  jourTabActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  jourTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  jourTabTextActive: {
    color: '#FFFFFF',
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
  coursList: {
    paddingHorizontal: 16,
  },
  coursCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  coursHoraire: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  horaireText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  dureeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  matiereNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  enseignantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  enseignantText: {
    fontSize: 13,
    color: '#6B7280',
  },
});