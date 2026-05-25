// /home/project/hooks/useNominations.ts
// Version corrigée – getNominations avec requête séparée pour les profils

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendNominationNotification } from '@/utils/notifications';

export interface Nomination {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  type_admin: string;
  fonction?: string;
  departement?: string;
  justification?: string;
  validated_at: string;
  validated_by: string;
  is_active: boolean;
  metadata?: any;
  validated_by_name?: string;
}

export interface NominationsFilters {
  etablissementId?: string;
  type_admin?: string;
  is_active?: boolean;
}

export function useNominations() {
  const { user, isChefEtablissement } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentEtablissement = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('role', 'chef_etablissement')
        .eq('is_active', true)
        .not('etablissement_id', 'is', null)
        .maybeSingle();

      if (error) throw error;
      return data?.etablissement_id || null;
    } catch (err) {
      console.error('Error loading current etablissement:', err);
      return null;
    }
  }, [user]);

  const nominateRole = useCallback(async (
    delegateId: string,
    typeAdmin: string,
    justification?: string,
    departement?: string,
    plafond?: number,
    etablissementId?: string
  ): Promise<boolean> => {
    if (!isChefEtablissement) {
      setError('Seul le Chef d\'établissement peut nommer des collaborateurs');
      return false;
    }

    if (!delegateId) {
      setError('L\'ID de l\'utilisateur est requis');
      return false;
    }

    let finalEtablissementId = etablissementId;
    if (!finalEtablissementId) {
      finalEtablissementId = await loadCurrentEtablissement();
    }

    if (!finalEtablissementId) {
      setError('Aucun établissement actif');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier si l'utilisateur a déjà ce rôle
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', delegateId)
        .eq('etablissement_id', finalEtablissementId)
        .eq('role', 'membre_administratif')
        .eq('is_active', true)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRole) {
        const { data: existingWithType, error: typeError } = await supabase
          .from('user_roles')
          .select('metadata')
          .eq('user_id', delegateId)
          .eq('etablissement_id', finalEtablissementId)
          .eq('role', 'membre_administratif')
          .eq('is_active', true)
          .maybeSingle();

        if (typeError) throw typeError;

        const currentType = existingWithType?.metadata?.type_admin;
        if (currentType === typeAdmin) {
          setError(`Cet utilisateur est déjà nommé ${typeAdmin}`);
          return false;
        }
      }

      // Créer la nomination
      const metadata: any = {
        type_admin: typeAdmin,
        nomme_par: user?.id,
        nomme_le: new Date().toISOString(),
      };

      if (justification) metadata.justification = justification;
      if (departement) metadata.departement = departement;
      if (plafond) metadata.plafond = plafond;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: delegateId,
          etablissement_id: finalEtablissementId,
          role: 'membre_administratif',
          is_active: true,
          metadata,
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Envoyer une notification
      const roleLabels: Record<string, string> = {
        comptable: 'Comptable',
        caissier: 'Caissier',
        assistant_comptable: 'Assistant comptable',
        de: 'Directeur des Études',
        ae: 'Animateur d\'Établissement',
        administratif: 'Personnel Administratif',
        vie_scolaire: 'Personnel Vie Scolaire',
      };

      const roleLabel = roleLabels[typeAdmin] || typeAdmin;
      await sendNominationNotification(delegateId, roleLabel, user?.email);

      return true;
    } catch (err) {
      console.error('Error in nominateRole:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la nomination');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isChefEtablissement, loadCurrentEtablissement, user]);

  const revokeNomination = useCallback(async (
    userId: string,
    typeAdmin?: string
  ): Promise<boolean> => {
    if (!isChefEtablissement) {
      setError('Seul le Chef d\'établissement peut révoquer des nominations');
      return false;
    }

    if (!userId) {
      setError('ID utilisateur requis');
      return false;
    }

    const etablissementId = await loadCurrentEtablissement();
    if (!etablissementId) {
      setError('Aucun établissement actif');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('user_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('etablissement_id', etablissementId)
        .eq('role', 'membre_administratif')
        .eq('is_active', true);

      if (typeAdmin) {
        query = query.eq('metadata->>type_admin', typeAdmin);
      }

      const { error } = await query;

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error in revokeNomination:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la révocation');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isChefEtablissement, loadCurrentEtablissement]);

  // ✅ VERSION CORRIGÉE – avec requête séparée pour les profils
  const getNominations = useCallback(async (filters?: NominationsFilters): Promise<Nomination[]> => {
    const etablissementId = filters?.etablissementId || await loadCurrentEtablissement();
    
    if (!etablissementId) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer les user_roles
      let query = supabase
        .from('user_roles')
        .select('id, user_id, validated_at, validated_by, is_active, metadata')
        .eq('etablissement_id', etablissementId)
        .eq('role', 'membre_administratif');

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      } else {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // 2. Récupérer les profils des utilisateurs concernés
      const userIds = [...new Set(data.map(item => item.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // 3. Créer un map id -> profile
      const profileMap = new Map();
      profiles?.forEach(p => {
        profileMap.set(p.id, p);
      });

      // 4. Récupérer les noms des validateurs
      const validatorIds = [...new Set(data.map(item => item.validated_by).filter(Boolean))];
      let validatorNames: Record<string, string> = {};
      
      if (validatorIds.length > 0) {
        const { data: validators } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', validatorIds);
        
        if (validators) {
          validatorNames = validators.reduce((acc, v) => {
            acc[v.id] = `${v.prenom} ${v.nom}`;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // 5. Construire les nominations
      const nominations: Nomination[] = data.map(item => {
        const profile = profileMap.get(item.user_id);
        return {
          id: item.id,
          user_id: item.user_id,
          nom: profile?.nom || '',
          prenom: profile?.prenom || '',
          email: profile?.email || '',
          type_admin: item.metadata?.type_admin || 'unknown',
          fonction: item.metadata?.fonction,
          departement: item.metadata?.departement,
          justification: item.metadata?.justification,
          validated_at: item.validated_at,
          validated_by: item.validated_by,
          is_active: item.is_active,
          metadata: item.metadata,
          validated_by_name: validatorNames[item.validated_by] || '',
        };
      });

      // Filtre supplémentaire par type_admin
      if (filters?.type_admin) {
        return nominations.filter(n => n.type_admin === filters.type_admin);
      }

      return nominations;
    } catch (err) {
      console.error('Error in getNominations:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des nominations');
      return [];
    } finally {
      setLoading(false);
    }
  }, [loadCurrentEtablissement]);

  const hasNomination = useCallback(async (
    userId: string,
    typeAdmin: string
  ): Promise<boolean> => {
    const etablissementId = await loadCurrentEtablissement();
    if (!etablissementId) return false;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('etablissement_id', etablissementId)
        .eq('role', 'membre_administratif')
        .eq('metadata->>type_admin', typeAdmin)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error('Error in hasNomination:', err);
      return false;
    }
  }, [loadCurrentEtablissement]);

  const getNominationsWithFilters = useCallback(async (
    etablissementId: string,
    filters?: { type?: string; status?: string }
  ): Promise<Nomination[]> => {
    try {
      let query = supabase
        .from('user_roles')
        .select('id, user_id, validated_at, validated_by, is_active, metadata')
        .eq('etablissement_id', etablissementId)
        .eq('role', 'membre_administratif');

      if (filters?.type) {
        query = query.eq('metadata->>type_admin', filters.type);
      }

      if (filters?.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters?.status === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      const userIds = [...new Set(data.map(item => item.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email')
        .in('id', userIds);

      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.id, p));

      const validatorIds = [...new Set(data.map(item => item.validated_by).filter(Boolean))];
      let validatorNames: Record<string, string> = {};
      
      if (validatorIds.length > 0) {
        const { data: validators } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', validatorIds);
        
        if (validators) {
          validatorNames = validators.reduce((acc, v) => {
            acc[v.id] = `${v.prenom} ${v.nom}`;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return data.map(item => {
        const profile = profileMap.get(item.user_id);
        return {
          id: item.id,
          user_id: item.user_id,
          nom: profile?.nom || '',
          prenom: profile?.prenom || '',
          email: profile?.email || '',
          type_admin: item.metadata?.type_admin || 'unknown',
          fonction: item.metadata?.fonction,
          departement: item.metadata?.departement,
          justification: item.metadata?.justification,
          validated_at: item.validated_at,
          validated_by: item.validated_by,
          is_active: item.is_active,
          metadata: item.metadata,
          validated_by_name: validatorNames[item.validated_by] || '',
        };
      });
    } catch (err) {
      console.error('Error fetching nominations with filters:', err);
      return [];
    }
  }, []);

  return {
    nominateRole,
    revokeNomination,
    getNominations,
    hasNomination,
    getNominationsWithFilters,
    loading,
    error,
  };
}
