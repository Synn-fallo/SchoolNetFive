import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface EtablissementResult {
  id: string;
  nom: string;
  ville: string | null;
  type_etablissement: string | null;
  departement: string | null;
  region: string | null;
}

interface SearchFilters {
  ville?: string;
  type?: string;
  regionId?: string;
  departementId?: string;
}

export function useEtablissementSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EtablissementResult[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const searchEtablissements = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim() && !filters?.ville && !filters?.type && !filters?.regionId && !filters?.departementId) {
      setResults([]);
      return;
    }
  
    setLoading(true);
    try {
      // Utiliser la fonction SQL de recherche approximative si disponible
      let supabaseQuery;
      
      if (query.trim()) {
        // Appel à la fonction RPC pour la recherche approximative
        const { data, error } = await supabase.rpc('rechercher_etablissements', {
          p_recherche: query,
          p_limit: 20
        });
        
        if (error) throw error;
        
        // Appliquer les filtres supplémentaires côté client
        let filtered = data || [];
        if (filters?.ville) filtered = filtered.filter(e => e.ville === filters.ville);
        if (filters?.type) filtered = filtered.filter(e => e.type_etablissement === filters.type);
        if (filters?.regionId) filtered = filtered.filter(e => e.region_id === filters.regionId);
        if (filters?.departementId) filtered = filtered.filter(e => e.departement_id === filters.departementId);
        
        setResults(filtered);
      } else {
        // Recherche sans query (juste les filtres)
        let queryBuilder = supabase
          .from('etablissements')
          .select('id, nom, ville, type_etablissement, departement, region')
          .limit(20);
  
        if (filters?.ville) queryBuilder = queryBuilder.eq('ville', filters.ville);
        if (filters?.type) queryBuilder = queryBuilder.eq('type_etablissement', filters.type);
        if (filters?.regionId) queryBuilder = queryBuilder.eq('region_id', filters.regionId);
        if (filters?.departementId) queryBuilder = queryBuilder.eq('departement_id', filters.departementId);
  
        const { data, error } = await queryBuilder;
        if (error) throw error;
        setResults(data || []);
      }
    } catch (error) {
      console.error('Error searching establishments:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getVillesDisponibles = useCallback(async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('etablissements')
      .select('ville')
      .not('ville', 'is', null)
      .order('ville');

    if (error) return [];
    const villes = [...new Set(data.map(d => d.ville).filter(Boolean))] as string[];
    return villes;
  }, []);

  const getTypesDisponibles = useCallback(async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('etablissements')
      .select('type_etablissement')
      .not('type_etablissement', 'is', null);

    if (error) return [];
    const types = [...new Set(data.map(d => d.type_etablissement).filter(Boolean))] as string[];
    return types;
  }, []);

  return {
    loading,
    results,
    hasMore,
    searchEtablissements,
    getVillesDisponibles,
    getTypesDisponibles,
  };
}