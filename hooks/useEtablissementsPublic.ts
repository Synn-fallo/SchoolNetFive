// /home/project/hooks/useEtablissementsPublic.ts
// Hook pour la recherche et le filtrage des établissements publics

import { useState, useEffect, useCallback, useRef } from 'react';
import { EtablissementService } from '@/services/etablissementService';
import { EtablissementPublic, EtablissementFilters, Region, Departement } from '@/types/etablissement.types';

const ITEMS_PER_PAGE = 20;

interface UseEtablissementsPublicReturn {
  etablissements: EtablissementPublic[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  regions: Region[];
  departements: Departement[];
  types: string[];
  options: string[];
  filters: EtablissementFilters;
  setFilters: (filters: EtablissementFilters) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  loadRegions: () => Promise<void>;
  loadDepartements: (regionId?: string) => Promise<void>;
}

export function useEtablissementsPublic(): UseEtablissementsPublicReturn {
  const [etablissements, setEtablissements] = useState<EtablissementPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [regions, setRegions] = useState<Region[]>([]);
  const [departements, setDepartements] = useState<Departement[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<EtablissementFilters>({});
  
  // Ref pour éviter les appels multiples
  const isFetchingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const loadRegions = useCallback(async () => {
    try {
      const data = await EtablissementService.getRegions();
      setRegions(data);
    } catch (err) {
      console.error('Error loading regions:', err);
    }
  }, []);

  const loadDepartements = useCallback(async (regionId?: string) => {
    try {
      const data = await EtablissementService.getDepartements(regionId);
      setDepartements(data);
    } catch (err) {
      console.error('Error loading departements:', err);
    }
  }, []);

  const loadTypes = useCallback(async () => {
    try {
      const data = await EtablissementService.getTypes();
      setTypes(data);
    } catch (err) {
      console.error('Error loading types:', err);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const data = await EtablissementService.getOptions();
      setOptions(data);
    } catch (err) {
      console.error('Error loading options:', err);
    }
  }, []);

  // 🔧 Fonction de fetch sans dépendances problématiques
  const fetchEtablissements = useCallback(async (currentFilters: EtablissementFilters, currentPage: number) => {
    // Éviter les appels multiples simultanés
    if (isFetchingRef.current) {
      console.log('🔍 [HOOK] fetch déjà en cours, ignoré');
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 [HOOK] fetchEtablissements - filters:', currentFilters, 'page:', currentPage);
      const response = await EtablissementService.getEtablissements({
        ...currentFilters,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      
      setEtablissements(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error fetching etablissements:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      setEtablissements([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // 🔧 setFilters avec debounce et appel manuel du fetch
  const setFilters = useCallback((newFilters: EtablissementFilters) => {
    console.log('🔍 [HOOK] setFilters appelé avec:', newFilters);
    
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      return updated;
    });
    
    setPage(1);
    
    // Debounce pour éviter les appels multiples
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const currentFilters = { ...newFilters };
      console.log('🔍 [HOOK] exécution fetch après debounce avec:', currentFilters);
      fetchEtablissements(currentFilters, 1);
    }, 50);
  }, [fetchEtablissements]);

  // 🔧 setPage avec appel manuel du fetch
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
    fetchEtablissements(filters, newPage);
  }, [filters, fetchEtablissements]);

  const refresh = useCallback(async () => {
    console.log('🔍 [HOOK] refresh appelé');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setPage(1);
    fetchEtablissements(filters, 1);
  }, [filters, fetchEtablissements]);

  // Chargement initial des référentiels
  useEffect(() => {
    loadRegions();
    loadTypes();
    loadOptions();
    // 🔧 Chargement initial
    fetchEtablissements({}, 1);
  }, []);

  // Charge les départements quand la région change
  useEffect(() => {
    loadDepartements(filters.regionId);
  }, [filters.regionId]);

  return {
    etablissements,
    loading,
    error,
    total,
    page,
    totalPages,
    regions,
    departements,
    types,
    options,
    filters,
    setFilters,
    setPage: handleSetPage,
    refresh,
    loadRegions,
    loadDepartements,
  };
}