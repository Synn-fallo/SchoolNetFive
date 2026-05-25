import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAnnonces } from '@/hooks/useAnnonces';
import AnnonceCard from '@/components/communication/AnnonceCard';
import { ChevronLeft, Megaphone } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function EleveAnnoncesScreen() {
  const router = useRouter();
  const { annonces, loading, error, refetch } = useAnnonces();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Regrouper par type
  const annoncesEtablissement = annonces.filter(a => a.type === 'etablissement');
  const annoncesClasse = annonces.filter(a => a.type === 'classe');

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des annonces...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Une erreur est survenue</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity onPress={refetch} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Annonces</Text>
        <View style={styles.headerRight} />
      </View>

      {annonces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Megaphone size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucune annonce</Text>
          <Text style={styles.emptyText}>
            Aucune annonce n'a été publiée pour votre classe.
          </Text>
        </View>
      ) : (
        <>
          {annoncesEtablissement.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏫 Annonces de l'établissement</Text>
              {annoncesEtablissement.map((annonce) => (
                <AnnonceCard
                  key={annonce.id}
                  annonce={annonce}
                  onRefresh={refetch}
                />
              ))}
            </View>
          )}

          {annoncesClasse.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📚 Annonces de votre classe</Text>
              {annoncesClasse.map((annonce) => (
                <AnnonceCard
                  key={annonce.id}
                  annonce={annonce}
                  onRefresh={refetch}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 16 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerRight: { width: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: 300 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#EF4444' },
  errorSubtext: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  retryButton: { marginTop: 20, backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#1F2937' },
  emptyText: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12, paddingHorizontal: 4 },
});