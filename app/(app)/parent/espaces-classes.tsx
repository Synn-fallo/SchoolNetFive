import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageCircle, ChevronRight, Building2, User } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EspaceClasse {
  id: string;
  classe_id: string;
  classe_nom: string;
  etablissement_id: string;
  etablissement_nom: string;
  enfant_id: string;
  enfant_nom: string;
  enfant_prenom: string;
  canal_id: string | null;
  canal_mode: string | null;
  canal_nom: string | null;
}

export default function ParentEspacesClassesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [espaces, setEspaces] = useState<EspaceClasse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chargerEspaces = useCallback(async () => {
    if (!user) {
      setEspaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Appel à la fonction RPC
      const { data, error: rpcError } = await supabase
        .rpc('get_parent_espaces_classes', {
          p_parent_user_id: user.id
        });

      if (rpcError) throw rpcError;

      setEspaces(data || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    chargerEspaces();
  }, [chargerEspaces]);

  useEffect(() => {
    chargerEspaces();
  }, [chargerEspaces]);

  const handleOpenCanal = (item: EspaceClasse) => {
    if (!item.canal_id) return;
    router.push({
      pathname: '/(app)/parent/canal-classe',
      params: {
        canalId: item.canal_id,
        classeNom: item.classe_nom,
        enfantId: item.enfant_id,
        enfantNom: `${item.enfant_prenom} ${item.enfant_nom}`
      }
    });
  };

  const getModeInfo = (mode: string | null) => {
    switch (mode) {
      case 'libre': return { icon: '💬', color: '#10B981', label: 'Libre' };
      case 'moderation': return { icon: '🛡️', color: '#F59E0B', label: 'Modération' };
      case 'ferme': return { icon: '🔒', color: '#EF4444', label: 'Fermé' };
      default: return { icon: '❓', color: '#9CA3AF', label: 'Indisponible' };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Erreur</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity onPress={chargerEspaces} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (espaces.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.emptyContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <MessageCircle size={64} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun espace classe</Text>
        <Text style={styles.emptyText}>Vous n'avez pas encore d'enfant inscrit dans une classe.</Text>
      </ScrollView>
    );
  }

  // Grouper par établissement
  const grouped = espaces.reduce((acc, item) => {
    if (!acc[item.etablissement_id]) {
      acc[item.etablissement_id] = { nom: item.etablissement_nom, items: [] };
    }
    acc[item.etablissement_id].items.push(item);
    return acc;
  }, {} as Record<string, { nom: string; items: EspaceClasse[] }>);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Espace classes</Text>
        <Text style={styles.subtitle}>Communication avec les enseignants</Text>
      </View>

      {Object.values(grouped).map((group) => (
        <View key={group.nom} style={styles.etabSection}>
          <View style={styles.etabHeader}>
            <Building2 size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.etabNom}>{group.nom}</Text>
          </View>

          {group.items.map((item) => {
            const mode = getModeInfo(item.canal_mode);
            const isActive = item.canal_id && item.canal_mode !== 'ferme';

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, !isActive && styles.cardInactive]}
                onPress={() => handleOpenCanal(item)}
                disabled={!isActive}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.enfantRow}>
                      <User size={14} color={theme.colors.neutral[500]} />
                      <Text style={styles.enfantNom}>{item.enfant_prenom} {item.enfant_nom}</Text>
                    </View>
                    <Text style={styles.classeNom}>{item.classe_nom}</Text>
                  </View>
                  <View style={[styles.modeBadge, { backgroundColor: mode.color + '20' }]}>
                    <Text style={styles.modeIcon}>{mode.icon}</Text>
                    <Text style={[styles.modeLabel, { color: mode.color }]}>{mode.label}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  {isActive ? (
                    <>
                      <Text style={styles.canalNom}>{item.canal_nom || 'Canal de la classe'}</Text>
                      <ChevronRight size={18} color={theme.colors.primary.DEFAULT} />
                    </>
                  ) : (
                    <Text style={styles.disabledText}>Canal indisponible</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#EF4444' },
  errorSubtext: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  retryButton: { marginTop: 20, backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  emptyTitle: { marginTop: 16, fontSize: 20, fontWeight: '600', color: '#1F2937' },
  emptyText: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  etabSection: { marginBottom: 24, paddingHorizontal: 16 },
  etabHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  etabNom: { fontSize: 16, fontWeight: '600', color: theme.colors.primary.DEFAULT },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardInactive: { backgroundColor: '#F9FAFB', opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  enfantRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  enfantNom: { fontSize: 13, color: '#6B7280' },
  classeNom: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  modeIcon: { fontSize: 12 },
  modeLabel: { fontSize: 11, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  canalNom: { fontSize: 13, color: theme.colors.primary.DEFAULT, fontWeight: '500' },
  disabledText: { fontSize: 13, color: '#9CA3AF' },
});