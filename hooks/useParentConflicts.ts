import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ParentConflict {
  id: string;
  telephone: string;
  email: string;
  parent_telephone_id: string;
  parent_email_id: string;
  resolution: 'pending' | 'telephone_priority' | 'email_priority' | 'manual' | 'ignored';
  resolved_by?: string;
  resolved_at?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  parent_telephone?: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
  };
  parent_email?: {
    id: string;
    nom: string;
    prenom: string;
    email_personnel: string;
  };
}

export function useParentConflicts() {
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ParentConflict[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Récupère tous les conflits non résolus
   */
  const fetchPendingConflicts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('parent_conflicts')
        .select(`
          *,
          parent_telephone:parent_telephone_id (id, nom, prenom, telephone),
          parent_email:parent_email_id (id, nom, prenom, email_personnel)
        `)
        .eq('resolution', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConflicts(data || []);
      return { success: true, conflicts: data || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Récupère tous les conflits (avec filtres)
   */
  const fetchConflicts = useCallback(async (filters?: { resolution?: string; from?: string; to?: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('parent_conflicts')
        .select(`
          *,
          parent_telephone:parent_telephone_id (id, nom, prenom, telephone),
          parent_email:parent_email_id (id, nom, prenom, email_personnel),
          resolved_by_user:resolved_by (id, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.resolution && filters.resolution !== 'all') {
        query = query.eq('resolution', filters.resolution);
      }

      if (filters?.from) {
        query = query.gte('created_at', filters.from);
      }

      if (filters?.to) {
        query = query.lte('created_at', filters.to);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, conflicts: data || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Résout un conflit manuellement
   */
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'telephone_priority' | 'email_priority' | 'ignored',
    parentIdToKeep?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const updateData: any = {
        resolution,
        resolved_by: userData.user?.id,
        resolved_at: new Date().toISOString(),
      };

      if (resolution === 'telephone_priority' && parentIdToKeep) {
        updateData.parent_telephone_id = parentIdToKeep;
      } else if (resolution === 'email_priority' && parentIdToKeep) {
        updateData.parent_email_id = parentIdToKeep;
      }

      const { error } = await supabase
        .from('parent_conflicts')
        .update(updateData)
        .eq('id', conflictId);

      if (error) throw error;

      // Rafraîchir la liste
      await fetchPendingConflicts();
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la résolution';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchPendingConflicts]);

  /**
   * Ignorer un conflit
   */
  const ignoreConflict = useCallback(async (conflictId: string): Promise<{ success: boolean; error?: string }> => {
    return resolveConflict(conflictId, 'ignored');
  }, [resolveConflict]);

  /**
   * Obtenir les statistiques des conflits
   */
  const getConflictStats = useCallback(async (): Promise<{
    success: boolean;
    stats?: { pending: number; resolved: number; total: number };
    error?: string;
  }> => {
    try {
      const { data, error } = await supabase
        .from('parent_conflicts')
        .select('resolution', { count: 'exact', head: false });

      if (error) throw error;

      const pending = data?.filter(c => c.resolution === 'pending').length || 0;
      const resolved = (data?.length || 0) - pending;

      return {
        success: true,
        stats: { pending, resolved, total: data?.length || 0 },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du calcul des statistiques';
      return { success: false, error: message };
    }
  }, []);

  return {
    loading,
    conflicts,
    error,
    fetchPendingConflicts,
    fetchConflicts,
    resolveConflict,
    ignoreConflict,
    getConflictStats,
  };
}