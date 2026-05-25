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
}

export function useEducMasterConfig() {
  const [config, setConfig] = useState<EducMasterConfig | null>(null);
  const [loading, setLoading] = useState(true);
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
        // Configuration par défaut si aucune n'existe
        const defaultConfig = {
          ordre_verification: 'BDD_API',
          api_enabled: false,
          api_url: null,
          api_key: null,
          api_timeout_ms: 5000,
          cache_enabled: true,
          cache_ttl_hours: 24,
        };
        setConfig(defaultConfig as EducMasterConfig);
      }
    } catch (err) {
      console.error('Error loading EducMaster config:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour la configuration
  const updateConfig = useCallback(async (updates: Partial<EducMasterConfig>) => {
    try {
      const { data: existing } = await supabase
        .from('config_educmaster')
        .select('id')
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from('config_educmaster')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('config_educmaster')
          .insert({
            ...updates,
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setConfig(result.data as EducMasterConfig);
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Error updating EducMaster config:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de mise à jour' };
    }
  }, []);

  // Récupérer l'ordre de vérification
  const getOrdreVerification = useCallback((): 'BDD_API' | 'API_BDD' => {
    return config?.ordre_verification || 'BDD_API';
  }, [config]);

  // Vérifier si l'API est activée
  const isApiEnabled = useCallback((): boolean => {
    return config?.api_enabled || false;
  }, [config]);

  // Récupérer le timeout
  const getApiTimeout = useCallback((): number => {
    return config?.api_timeout_ms || 5000;
  }, [config]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    loadConfig,
    updateConfig,
    getOrdreVerification,
    isApiEnabled,
    getApiTimeout,
  };
}