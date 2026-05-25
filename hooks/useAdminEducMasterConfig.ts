import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface EducMasterConfig {
  id: string;
  ordre_verification: 'BDD_API' | 'API_BDD';
  api_enabled: boolean;
  api_url: string | null;
  api_key: string | null;
  api_timeout_ms: number;
  cache_enabled: boolean;
  cache_ttl_hours: number;
  updated_at: string;
  updated_by?: string;
}

export interface ApiStats {
  total_calls: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_response_time_ms: number;
  last_call_at: string | null;
  last_error: string | null;
}

export function useAdminEducMasterConfig() {
  const [config, setConfig] = useState<EducMasterConfig | null>(null);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la configuration
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('config_educmaster')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data as EducMasterConfig);
      } else {
        // Configuration par défaut
        setConfig({
          id: '',
          ordre_verification: 'BDD_API',
          api_enabled: false,
          api_url: null,
          api_key: null,
          api_timeout_ms: 5000,
          cache_enabled: true,
          cache_ttl_hours: 24,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error loading EducMaster config:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les statistiques API
  const loadStats = useCallback(async () => {
    try {
      // Récupérer les statistiques des appels API
      const { data, error } = await supabase
        .from('educmaster_api_logs')
        .select('success, response_time_ms, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const total = data?.length || 0;
      const successCount = data?.filter(log => log.success === true).length || 0;
      const failureCount = total - successCount;
      const successRate = total > 0 ? (successCount / total) * 100 : 0;
      
      const responseTimes = data?.filter(log => log.response_time_ms).map(log => log.response_time_ms) || [];
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      const lastSuccess = data?.find(log => log.success === true);
      const lastError = data?.find(log => log.success === false);

      setStats({
        total_calls: total,
        success_count: successCount,
        failure_count: failureCount,
        success_rate: Math.round(successRate),
        avg_response_time_ms: Math.round(avgResponseTime),
        last_call_at: lastSuccess?.created_at || null,
        last_error: lastError?.error_message || null,
      });
    } catch (err) {
      console.error('Error loading EducMaster stats:', err);
      setStats(null);
    }
  }, []);

  // Mettre à jour la configuration
  const updateConfig = useCallback(async (updates: Partial<EducMasterConfig>): Promise<{ success: boolean; error?: string }> => {
    setSaving(true);
    setError(null);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: existing } = await supabase
        .from('config_educmaster')
        .select('id')
        .maybeSingle();

      let result;
      if (existing?.id) {
        result = await supabase
          .from('config_educmaster')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
            updated_by: userData.user?.id,
          })
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('config_educmaster')
          .insert({
            ...updates,
            updated_by: userData.user?.id,
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setConfig(result.data as EducMasterConfig);
      return { success: true };
    } catch (err) {
      console.error('Error updating EducMaster config:', err);
      const message = err instanceof Error ? err.message : 'Erreur de mise à jour';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  }, []);

  // Vider le cache
  const clearCache = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('educmaster_cache')
        .delete()
        .neq('educmaster', ''); // Supprime tout

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error clearing EducMaster cache:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors du vidage du cache';
      return { success: false, error: message };
    }
  }, []);

  // Tester la connexion API
  const testApiConnection = useCallback(async (): Promise<{ success: boolean; message: string; responseTime?: number }> => {
    const startTime = Date.now();
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return { success: false, message: 'Configuration Supabase manquante' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config?.api_timeout_ms || 5000);

      const response = await fetch(`${supabaseUrl}/functions/v1/proxy-educmaster-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ educmaster: '0000000000' }), // Test avec un numéro invalide
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { success: true, message: 'API accessible', responseTime };
      } else {
        const result = await response.json();
        return { success: false, message: result.error || `Erreur HTTP ${response.status}`, responseTime };
      }
    } catch (err) {
      const responseTime = Date.now() - startTime;
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, message: `Timeout après ${config?.api_timeout_ms || 5000}ms`, responseTime };
      }
      return { success: false, message: err instanceof Error ? err.message : 'Erreur de connexion', responseTime };
    }
  }, [config?.api_timeout_ms]);

  useEffect(() => {
    loadConfig();
    loadStats();
  }, [loadConfig, loadStats]);

  return {
    config,
    stats,
    loading,
    saving,
    error,
    loadConfig,
    loadStats,
    updateConfig,
    clearCache,
    testApiConnection,
  };
}