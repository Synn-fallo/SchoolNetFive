// /home/project/hooks/useAnneesScolaires.ts
// Hook pour la gestion des années scolaires

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface AnneeScolaire {
  id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  is_active: boolean;
  etablissement_id: string;
  created_at: string;
  updated_at: string;
}

interface UseAnneesScolairesReturn {
  annees: AnneeScolaire[];
  anneeActive: AnneeScolaire | null;
  loading: boolean;
  error: string | null;
  loadAnnees: (etablissementId: string) => Promise<void>;
  addAnnee: (data: Omit<AnneeScolaire, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateAnnee: (id: string, updates: Partial<AnneeScolaire>) => Promise<boolean>;
  deleteAnnee: (id: string) => Promise<boolean>;
  setActiveAnnee: (id: string) => Promise<boolean>;
  refresh: (etablissementId: string) => Promise<void>;
}

export function useAnneesScolaires(): UseAnneesScolairesReturn {
  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [anneeActive, setAnneeActive] = useState<AnneeScolaire | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnnees = useCallback(async (etablissementId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('annees_scolaires')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .order('date_debut', { ascending: false });

      if (fetchError) throw fetchError;

      setAnnees(data || []);
      
      // Trouver l'année active
      const active = data?.find(a => a.is_active === true) || null;
      setAnneeActive(active || null);
    } catch (err) {
      console.error('Error loading annees scolaires:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const addAnnee = useCallback(async (data: Omit<AnneeScolaire, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('annees_scolaires')
        .insert(data);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error adding annee:', err);
      return false;
    }
  }, []);

  const updateAnnee = useCallback(async (id: string, updates: Partial<AnneeScolaire>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('annees_scolaires')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating annee:', err);
      return false;
    }
  }, []);

  const deleteAnnee = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('annees_scolaires')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting annee:', err);
      return false;
    }
  }, []);

  const setActiveAnnee = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Désactiver toutes les années
      const { error: updateError } = await supabase
        .from('annees_scolaires')
        .update({ is_active: false })
        .eq('etablissement_id', annees[0]?.etablissement_id);

      if (updateError) throw updateError;

      // Activer l'année sélectionnée
      const { error: activeError } = await supabase
        .from('annees_scolaires')
        .update({ is_active: true })
        .eq('id', id);

      if (activeError) throw activeError;

      // Mettre à jour l'état local
      setAnnees(prev => prev.map(a => ({ ...a, is_active: a.id === id })));
      setAnneeActive(annees.find(a => a.id === id) || null);
      
      return true;
    } catch (err) {
      console.error('Error setting active annee:', err);
      return false;
    }
  }, [annees]);

  const refresh = useCallback(async (etablissementId: string) => {
    await loadAnnees(etablissementId);
  }, [loadAnnees]);

  return {
    annees,
    anneeActive,
    loading,
    error,
    loadAnnees,
    addAnnee,
    updateAnnee,
    deleteAnnee,
    setActiveAnnee,
    refresh,
  };
}