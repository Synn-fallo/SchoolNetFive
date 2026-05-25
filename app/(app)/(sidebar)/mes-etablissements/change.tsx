import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Check, ArrowLeft } from 'lucide-react-native';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import theme from '@/constants/theme';

export default function ChangeEtablissementScreen() {
  const router = useRouter();
  const { activeEtablissement, allEtablissements, switchToEtablissement, loading } = useActiveEtablissement();

  const handleSelect = async (etablissementId: string) => {
    if (activeEtablissement?.id === etablissementId) {
      router.back();
      return;
    }

    const success = await switchToEtablissement(etablissementId);
    if (success) {
      Alert.alert('Succès', 'Établissement actif modifié avec succès');
      router.back();
    } else {
      Alert.alert('Erreur', 'Impossible de changer d\'établissement');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.title}>Changer d'établissement</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Sélectionnez l'établissement que vous souhaitez gérer actuellement
      </Text>

      <FlatList
        data={allEtablissements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.etablissementCard,
              activeEtablissement?.id === item.id && styles.etablissementCardActive,
            ]}
            onPress={() => handleSelect(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.etablissementIcon}>
              <Building2 size={24} color={activeEtablissement?.id === item.id ? theme.colors.primary.DEFAULT : theme.colors.neutral[600]} />
            </View>
            <View style={styles.etablissementInfo}>
              <Text style={[styles.etablissementName, activeEtablissement?.id === item.id && styles.etablissementNameActive]}>
                {item.nom}
              </Text>
              {item.ville && (
                <Text style={styles.etablissementVille}>{item.ville}</Text>
              )}
              <View style={[styles.statusBadge, { backgroundColor: item.statut === 'ACTIF' ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.statusText, { color: item.statut === 'ACTIF' ? '#10B981' : '#F59E0B' }]}>
                  {item.statut === 'ACTIF' ? 'Actif' : 'En configuration'}
                </Text>
              </View>
            </View>
            {activeEtablissement?.id === item.id && (
              <View style={styles.activeBadge}>
                <Check size={18} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.activeText}>Actif</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun établissement trouvé</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
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
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  etablissementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  etablissementCardActive: {
    borderColor: theme.colors.primary.DEFAULT,
    backgroundColor: '#EFF6FF',
  },
  etablissementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  etablissementInfo: {
    flex: 1,
  },
  etablissementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  etablissementNameActive: {
    color: theme.colors.primary.DEFAULT,
  },
  etablissementVille: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});