import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EtablissementInfo {
  id: string;
  nom: string;
  slug: string;
  ville?: string;
  statut: string;
  is_active: boolean;
  plan?: string;
  created_at?: string;
  sous_domaine?: string;
  logo_url?: string;
}

export interface UseMultiEtablissementsReturn {
  etablissements: EtablissementInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getEtablissementById: (id: string) => EtablissementInfo | undefined;
  hasMultipleEtablissements: boolean;
  count: number;
}

export function useMultiEtablissements(): UseMultiEtablissementsReturn {
  const { user } = useAuth();
  const [etablissements, setEtablissements] = useState<EtablissementInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEtablissements = useCallback(async () => {
    if (!user) {
      setEtablissements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer tous les établissements où l'utilisateur est chef
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('role', 'chef_etablissement')
        .eq('is_active', true)
        .not('etablissement_id', 'is', null);

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setEtablissements([]);
        setLoading(false);
        return;
      }

      const etablissementIds = rolesData.map(r => r.etablissement_id);

      // 2. Récupérer les abonnements actifs pour ces établissements
      const { data: abonnementsData } = await supabase
        .from('abonnements')
        .select('etablissement_id, plan')
        .in('etablissement_id', etablissementIds)
        .eq('is_active', true);

      const planMap = new Map();
      if (abonnementsData) {
        abonnementsData.forEach(abo => {
          planMap.set(abo.etablissement_id, abo.plan);
        });
      }

      // 3. Récupérer les informations des établissements
      const { data: etabsData, error: etabsError } = await supabase
        .from('etablissements')
        .select('*')
        .in('id', etablissementIds)
        .order('nom');

      if (etabsError) throw etabsError;

      // 4. Formater les données
      const formattedEtablissements: EtablissementInfo[] = (etabsData || []).map(etab => ({
        id: etab.id,
        nom: etab.nom,
        slug: etab.slug,
        ville: etab.ville,
        statut: etab.statut,
        is_active: etab.is_active,
        plan: planMap.get(etab.id),
        created_at: etab.created_at,
        sous_domaine: etab.sous_domaine,
        logo_url: etab.logo_url,
      }));

      setEtablissements(formattedEtablissements);
    } catch (err) {
      console.error('Error fetching etablissements:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des établissements');
      setEtablissements([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getEtablissementById = useCallback((id: string): EtablissementInfo | undefined => {
    return etablissements.find(e => e.id === id);
  }, [etablissements]);

  const refresh = useCallback(async () => {
    await fetchEtablissements();
  }, [fetchEtablissements]);

  useEffect(() => {
    fetchEtablissements();
  }, [fetchEtablissements]);

  return {
    etablissements,
    loading,
    error,
    refresh,
    getEtablissementById,
    hasMultipleEtablissements: etablissements.length > 1,
    count: etablissements.length,
  };
}