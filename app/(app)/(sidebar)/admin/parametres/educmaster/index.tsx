import { View, StyleSheet, ScrollView, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAdminEducMasterConfig } from '@/hooks/useAdminEducMasterConfig';
import EducMasterConfigForm from '@/components/admin/EducMasterConfigForm';
import EducMasterStats from '@/components/admin/EducMasterStats';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

export default function EducMasterConfigScreen() {
  const router = useRouter();
  const {
    config,
    stats,
    loading,
    saving,
    error,
    updateConfig,
    loadStats,
    clearCache,
    testApiConnection,
  } = useAdminEducMasterConfig();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de la configuration...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>⚙️ Configuration EducMaster</Text>
      <Text style={styles.pageSubtitle}>
        Paramètres de connexion à l'API du Ministère pour la vérification des EducMaster
      </Text>

      <EducMasterStats
        stats={stats}
        loading={loading}
        onRefresh={loadStats}
      />

      <EducMasterConfigForm
        config={config}
        onSave={updateConfig}
        onTest={testApiConnection}
        onClearCache={clearCache}
        saving={saving}
        stats={stats}
      />

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ À propos</Text>
        <Text style={styles.infoText}>
          • L'EducMaster est un numéro unique de 12 chiffres attribué par le Ministère.
        </Text>
        <Text style={styles.infoText}>
          • La vérification peut se faire dans notre base (SchoolNet) ou via l'API du Ministère.
        </Text>
        <Text style={styles.infoText}>
          • L'ordre de vérification détermine la priorité des sources.
        </Text>
        <Text style={styles.infoText}>
          • Le cache permet d'éviter des appels redondants à l'API externe.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  infoCard: {
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 20,
    marginBottom: 4,
  },
});