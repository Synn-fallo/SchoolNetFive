import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Departement {
  id: string;
  code: string;
  nom: string;
  region_id: string;
  ordre: number;
}

export function useDepartements(regionId?: string) {
  const [departements, setDepartements] = useState<Departement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDepartements();
  }, [regionId]);

  const loadDepartements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('departements')
        .select('id, code, nom, region_id, ordre')
        .order('ordre', { ascending: true });

      if (regionId) {
        query = query.eq('region_id', regionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDepartements(data || []);
    } catch (err) {
      console.error('Error loading departements:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return { departements, loading, error, refresh: loadDepartements };
}