import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Region {
  id: string;
  code: string;
  nom: string;
  ordre: number;
}

export function useRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('id, code, nom, ordre')
        .order('ordre', { ascending: true });

      if (error) throw error;
      setRegions(data || []);
    } catch (err) {
      console.error('Error loading regions:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return { regions, loading, error, refresh: loadRegions };
}