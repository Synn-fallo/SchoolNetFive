import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Save, RefreshCw, CheckCircle, XCircle, Clock, Database, Globe, Zap } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EducMasterConfigFormProps {
  config: any;
  onSave: (updates: any) => Promise<{ success: boolean; error?: string }>;
  onTest: () => Promise<{ success: boolean; message: string; responseTime?: number }>;
  onClearCache: () => Promise<{ success: boolean; error?: string }>;
  saving: boolean;
  stats?: any;
}

export default function EducMasterConfigForm({
  config,
  onSave,
  onTest,
  onClearCache,
  saving,
  stats,
}: EducMasterConfigFormProps) {
  const [ordreVerification, setOrdreVerification] = useState<'BDD_API' | 'API_BDD'>('BDD_API');
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiTimeoutMs, setApiTimeoutMs] = useState('5000');
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheTtlHours, setCacheTtlHours] = useState('24');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; responseTime?: number } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    if (config) {
      setOrdreVerification(config.ordre_verification || 'BDD_API');
      setApiEnabled(config.api_enabled || false);
      setApiUrl(config.api_url || '');
      setApiKey(config.api_key || '');
      setApiTimeoutMs(String(config.api_timeout_ms || 5000));
      setCacheEnabled(config.cache_enabled !== undefined ? config.cache_enabled : true);
      setCacheTtlHours(String(config.cache_ttl_hours || 24));
    }
  }, [config]);

  const handleSave = async () => {
    const updates = {
      ordre_verification: ordreVerification,
      api_enabled: apiEnabled,
      api_url: apiUrl || null,
      api_key: apiKey || null,
      api_timeout_ms: parseInt(apiTimeoutMs, 10),
      cache_enabled: cacheEnabled,
      cache_ttl_hours: parseInt(cacheTtlHours, 10),
    };
    
    const result = await onSave(updates);
    if (result.success) {
      Alert.alert('Succès', 'Configuration sauvegardée');
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de sauvegarder');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await onTest();
    setTestResult(result);
    setTesting(false);
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    const result = await onClearCache();
    setClearingCache(false);
    if (result.success) {
      Alert.alert('Succès', 'Cache vidé avec succès');
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de vider le cache');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>🔌 Configuration API Ministère</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Activer l'API externe</Text>
          <Switch
            value={apiEnabled}
            onValueChange={setApiEnabled}
            trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
            thumbColor={apiEnabled ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>

        {apiEnabled && (
          <>
            <Text style={styles.inputLabel}>URL de l'API</Text>
            <TextInput
              style={styles.input}
              placeholder="https://api.education.gouv.bj/..."
              value={apiUrl}
              onChangeText={setApiUrl}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Clé API (Bearer Token)</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre clé d'authentification"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Timeout (millisecondes)</Text>
            <TextInput
              style={styles.input}
              placeholder="5000"
              value={apiTimeoutMs}
              onChangeText={setApiTimeoutMs}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.testButton, testing && styles.testButtonDisabled]}
              onPress={handleTest}
              disabled={testing || !apiUrl}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Globe size={16} color="#FFFFFF" />
                  <Text style={styles.testButtonText}>Tester la connexion</Text>
                </>
              )}
            </TouchableOpacity>

            {testResult && (
              <View style={[
                styles.testResultContainer,
                testResult.success ? styles.testResultSuccess : styles.testResultError
              ]}>
                {testResult.success ? (
                  <CheckCircle size={16} color="#065F46" />
                ) : (
                  <XCircle size={16} color="#991B1B" />
                )}
                <Text style={[
                  styles.testResultText,
                  testResult.success ? styles.testResultTextSuccess : styles.testResultTextError
                ]}>
                  {testResult.message}
                  {testResult.responseTime && ` (${testResult.responseTime}ms)`}
                </Text>
              </View>
            )}
          </>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>🔄 Ordre de vérification</Text>
        
        <TouchableOpacity
          style={[styles.radioOption, ordreVerification === 'BDD_API' && styles.radioOptionActive]}
          onPress={() => setOrdreVerification('BDD_API')}
        >
          <View style={[styles.radioCircle, ordreVerification === 'BDD_API' && styles.radioCircleActive]} />
          <View style={styles.radioContent}>
            <Text style={styles.radioLabel}>Base de données → API</Text>
            <Text style={styles.radioDescription}>
              Vérifie d'abord dans SchoolNet, puis dans l'API du Ministère
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.radioOption, ordreVerification === 'API_BDD' && styles.radioOptionActive]}
          onPress={() => setOrdreVerification('API_BDD')}
        >
          <View style={[styles.radioCircle, ordreVerification === 'API_BDD' && styles.radioCircleActive]} />
          <View style={styles.radioContent}>
            <Text style={styles.radioLabel}>API → Base de données</Text>
            <Text style={styles.radioDescription}>
              Vérifie d'abord dans l'API du Ministère, puis dans SchoolNet
            </Text>
          </View>
        </TouchableOpacity>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>💾 Cache des données</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Activer le cache</Text>
          <Switch
            value={cacheEnabled}
            onValueChange={setCacheEnabled}
            trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
            thumbColor={cacheEnabled ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>

        {cacheEnabled && (
          <>
            <Text style={styles.inputLabel}>Durée de validité (heures)</Text>
            <TextInput
              style={styles.input}
              placeholder="24"
              value={cacheTtlHours}
              onChangeText={setCacheTtlHours}
              keyboardType="numeric"
            />
          </>
        )}

        <TouchableOpacity
          style={styles.clearCacheButton}
          onPress={handleClearCache}
          disabled={clearingCache}
        >
          {clearingCache ? (
            <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
          ) : (
            <>
              <RefreshCw size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.clearCacheButtonText}>Vider le cache</Text>
            </>
          )}
        </TouchableOpacity>
      </Card>

      {stats && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>📊 Statistiques API</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Database size={20} color={theme.colors.neutral[500]} />
              <Text style={styles.statValue}>{stats.total_calls}</Text>
              <Text style={styles.statLabel}>Appels totaux</Text>
            </View>
            <View style={styles.statItem}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.statValue}>{stats.success_count}</Text>
              <Text style={styles.statLabel}>Succès</Text>
            </View>
            <View style={styles.statItem}>
              <XCircle size={20} color="#EF4444" />
              <Text style={styles.statValue}>{stats.failure_count}</Text>
              <Text style={styles.statLabel}>Échecs</Text>
            </View>
            <View style={styles.statItem}>
              <Zap size={20} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.statValue}>{stats.success_rate}%</Text>
              <Text style={styles.statLabel}>Taux succès</Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={20} color={theme.colors.neutral[500]} />
              <Text style={styles.statValue}>{stats.avg_response_time_ms}ms</Text>
              <Text style={styles.statLabel}>Temps moyen</Text>
            </View>
          </View>

          {stats.last_error && (
            <View style={styles.lastErrorContainer}>
              <Text style={styles.lastErrorLabel}>Dernière erreur :</Text>
              <Text style={styles.lastErrorText}>{stats.last_error}</Text>
            </View>
          )}
        </Card>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Save size={16} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </>
        )}
      </TouchableOpacity>
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
  card: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#EFF6FF',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  testButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  testResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  testResultSuccess: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  testResultError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  testResultText: {
    fontSize: 13,
    flex: 1,
  },
  testResultTextSuccess: {
    color: '#065F46',
  },
  testResultTextError: {
    color: '#991B1B',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  radioOptionActive: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: theme.colors.primary.DEFAULT,
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  radioDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  clearCacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  clearCacheButtonText: {
    color: theme.colors.primary.DEFAULT,
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  lastErrorContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  lastErrorLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
    marginBottom: 4,
  },
  lastErrorText: {
    fontSize: 12,
    color: '#92400E',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});