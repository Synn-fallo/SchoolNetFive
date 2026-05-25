import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Linking } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBulletinsParent } from '@/hooks/useBulletinsParent';
import { FileText, Download, Award, TrendingUp, Users, ChevronLeft } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function ParentBulletinsScreen() {
  const router = useRouter();
  const { enfantId, enfantNom } = useLocalSearchParams<{ enfantId: string; enfantNom: string }>();
  const { bulletins, loading, error, refetch } = useBulletinsParent(enfantId || '');
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDownload = async (bulletin: any) => {
    if (!bulletin.bulletin_url) {
      Alert.alert('Erreur', 'Ce bulletin n\'est pas disponible au téléchargement');
      return;
    }

    setDownloading(bulletin.id);
    try {
      // Ouvrir le lien PDF dans le navigateur
      const canOpen = await Linking.canOpenURL(bulletin.bulletin_url);
      if (canOpen) {
        await Linking.openURL(bulletin.bulletin_url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir le fichier');
      }
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      Alert.alert('Erreur', 'Une erreur est survenue lors du téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  const getMention = (moyenne: number) => {
    if (moyenne >= 16) return { label: 'Très bien', color: '#10B981' };
    if (moyenne >= 14) return { label: 'Bien', color: '#3B82F6' };
    if (moyenne >= 12) return { label: 'Assez bien', color: '#F59E0B' };
    if (moyenne >= 10) return { label: 'Passable', color: '#F97316' };
    return { label: 'Insuffisant', color: '#EF4444' };
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
        <Text style={styles.loadingText}>Chargement des bulletins...</Text>
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
        <Text style={styles.headerTitle}>Bulletins de {enfantNom || 'mon enfant'}</Text>
        <View style={styles.headerRight} />
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Une erreur est survenue</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      ) : bulletins.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucun bulletin</Text>
          <Text style={styles.emptyText}>
            Les bulletins de {enfantNom} n'ont pas encore été publiés.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {bulletins.map((bulletin) => {
            const mention = getMention(bulletin.moyenne_generale);
            return (
              <View key={bulletin.id} style={styles.bulletinCard}>
                <View style={styles.bulletinHeader}>
                  <Text style={styles.periode}>{bulletin.periode}</Text>
                  <View style={[styles.mentionBadge, { backgroundColor: mention.color + '20' }]}>
                    <Text style={[styles.mentionText, { color: mention.color }]}>{mention.label}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={styles.statIcon}>
                      <Award size={20} color={theme.colors.primary.DEFAULT} />
                    </View>
                    <View>
                      <Text style={styles.statLabel}>Moyenne générale</Text>
                      <Text style={styles.statValue}>{bulletin.moyenne_generale.toFixed(2)}/20</Text>
                    </View>
                  </View>

                  <View style={styles.statItem}>
                    <View style={styles.statIcon}>
                      <TrendingUp size={20} color={theme.colors.secondary.DEFAULT} />
                    </View>
                    <View>
                      <Text style={styles.statLabel}>Rang</Text>
                      <Text style={styles.statValue}>
                        {bulletin.rang} / {bulletin.effectif}
                      </Text>
                    </View>
                  </View>
                </View>

                {bulletin.appreciation_generale && (
                  <Text style={styles.appreciation}>
                    "{bulletin.appreciation_generale}"
                  </Text>
                )}

                {bulletin.bulletin_url && (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(bulletin)}
                    disabled={downloading === bulletin.id}
                  >
                    {downloading === bulletin.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Download size={18} color="#FFFFFF" />
                        <Text style={styles.downloadButtonText}>Télécharger le bulletin</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
  bulletinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bulletinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  periode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  mentionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mentionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  appreciation: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B7280',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});