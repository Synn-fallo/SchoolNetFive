// /home/project/hooks/useDelegations.ts
// Version complète – Délégations uniquement (pas de nomination)
// Avec logs détaillés pour debug

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendDelegationNotification } from '@/utils/notifications';

// ============================================================
// CONSTANTES EXPORTÉES POUR LES TYPES ET RÔLES DE DÉLÉGATION
// ============================================================

export const DELEGATION_TYPES = [
  { value: 'financiere', label: 'Financière' },
  { value: 'pedagogique', label: 'Pédagogique' },
  { value: 'administrative', label: 'Administrative' },
];

export const ROLES_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  financiere: [
    { value: 'caissier', label: 'Caissier' },
    { value: 'assistant_comptable', label: 'Assistant comptable' },
    { value: 'comptable', label: 'Comptable' },
  ],
  pedagogique: [
    { value: 'ae', label: 'Animateur d\'Établissement' },
    { value: 'de', label: 'Directeur des Études' },
  ],
  administrative: [
    { value: 'personnel_administratif', label: 'Personnel Administratif' },
    { value: 'personnel_vie_scolaire', label: 'Personnel Vie Scolaire' },
  ],
};

export interface Delegation {
  id: string;
  delegant_id: string;
  delegue_id: string;
  etablissement_id: string;
  type: string;
  role_delegue: string;
  departement?: string;
  plafond?: number;
  droits: any;
  is_active: boolean;
  date_debut: string;
  date_fin: string | null;
  justification?: string;
  created_at: string;
  updated_at: string;
  revoquee_at?: string;
  revoquee_par?: string;
  // Jointures
  delegue_nom?: string;
  delegue_prenom?: string;
  delegue_email?: string;
  etablissement_nom?: string;
  delegant_nom?: string;
  delegant_prenom?: string;
}

export interface PlafondInfo {
  allowed: boolean;
  current_count: number;
  plafond: number;
  remaining: number;
}

export interface EnseignantSupervise {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  classes: Array<{ id: string; nom: string }>;
  matieres: Array<{ id: string; nom: string }>;
}

// ============================================================
// UTILITAIRE – Mapping rôle → type (conforme à la base)
// ============================================================
export function getTypeFromRole(role: string): string {
  switch (role) {
    // Pédagogique
    case 'de': return 'directeur_etudes';
    case 'ae': return 'animateur_etablissement';
    // Financier
    case 'comptable': return 'comptable';
    case 'caissier': return 'caissier';
    case 'assistant_comptable': return 'assistant_comptable';
    // Administratif
    case 'personnel_administratif': return 'personnel_administratif';
    case 'personnel_vie_scolaire': return 'personnel_vie_scolaire';
    // Fallback
    default: return role;
  }
}

export function useDelegations() {
  const { user, isChefEtablissement, isDirecteurEtudes, isAnimateurEtablissement, getAdminMetadata } = useAuth();
  const [delegationsGiven, setDelegationsGiven] = useState<Delegation[]>([]);
  const [delegationsReceived, setDelegationsReceived] = useState<Delegation[]>([]);
  const [supervisedTeachers, setSupervisedTeachers] = useState<EnseignantSupervise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEtablissementId, setCurrentEtablissementId] = useState<string | null>(null);

  // Vérifier si une délégation est active (date_fin non dépassée)
  const isDelegationActive = useCallback((delegation: Delegation): boolean => {
    if (!delegation.is_active) return false;
    if (delegation.date_fin) {
      return new Date(delegation.date_fin) >= new Date();
    }
    return true;
  }, []);

  // Récupérer l'ID de l'établissement courant (gère plusieurs établissements)
  const loadCurrentEtablissement = useCallback(async () => {
    if (!user) return null;
  
    try {
      // Chercher un établissement non null pour le rôle chef_etablissement
      const { data, error } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('role', 'chef_etablissement')
        .eq('is_active', true)
        .not('etablissement_id', 'is', null)  // ← IGNORE les lignes avec null
        .maybeSingle();
  
      if (error) throw error;
  
      if (data?.etablissement_id) {
        console.log('✅ loadCurrentEtablissement - trouvé:', data.etablissement_id);
        return data.etablissement_id;
      }
  
      console.warn('⚠️ loadCurrentEtablissement - Aucun établissement trouvé pour le Chef');
      return null;
    } catch (err) {
      console.error('Error loading current etablissement:', err);
      return null;
    }
  }, [user]);

  // Récupérer les délégations données (l'utilisateur est le délégant)
  const fetchDelegationsGiven = useCallback(async () => {
    if (!user || !isChefEtablissement) return [];

    try {
      const etabId = await loadCurrentEtablissement();
      if (!etabId) return [];

      const { data, error } = await supabase
        .from('delegations')
        .select('*')
        .eq('delegant_id', user.id)
        .eq('etablissement_id', etabId);

      if (error) throw error;

      const enriched = await Promise.all((data || []).map(async (d) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nom, prenom, email')
          .eq('id', d.delegue_id)
          .maybeSingle();
        
        return {
          ...d,
          delegue_nom: profile?.nom || '',
          delegue_prenom: profile?.prenom || '',
          delegue_email: profile?.email || '',
        };
      }));

      setDelegationsGiven(enriched);
      return enriched;
    } catch (err) {
      console.error('Error fetching delegations given:', err);
      return [];
    }
  }, [user, isChefEtablissement, loadCurrentEtablissement]);

  // Récupérer les délégations reçues (l'utilisateur est le délégué)
  const fetchDelegationsReceived = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('delegations')
        .select('*')
        .eq('delegue_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const enriched = await Promise.all((data || []).map(async (d) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nom, prenom, email')
          .eq('id', d.delegant_id)
          .maybeSingle();
        
        const { data: etab } = await supabase
          .from('etablissements')
          .select('nom')
          .eq('id', d.etablissement_id)
          .maybeSingle();

        return {
          ...d,
          delegue_nom: profile?.nom || '',
          delegue_prenom: profile?.prenom || '',
          delegue_email: profile?.email || '',
          etablissement_nom: etab?.nom || '',
        };
      }));

      setDelegationsReceived(enriched);
      return enriched;
    } catch (err) {
      console.error('Error fetching delegations received:', err);
      return [];
    }
  }, [user]);

  // Récupérer les délégations actives pour un utilisateur (pour fusion des menus)
  const getActiveDelegationsForUser = useCallback(async (userId: string, etablissementId?: string): Promise<Delegation[]> => {
    try {
      let query = supabase
        .from('delegations')
        .select('*')
        .eq('delegue_id', userId)
        .eq('is_active', true);

      if (etablissementId) {
        query = query.eq('etablissement_id', etablissementId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const now = new Date();
      const active = (data || []).filter(d => {
        if (!d.is_active) return false;
        if (d.date_fin) {
          return new Date(d.date_fin) >= now;
        }
        return true;
      });

      return active as Delegation[];
    } catch (err) {
      console.error('Error fetching active delegations:', err);
      return [];
    }
  }, []);

  // Récupérer les enseignants supervisés (pour DE et AE)
  const fetchSupervisedTeachers = useCallback(async () => {
    if (!user) return;
    if (!isDirecteurEtudes && !isAnimateurEtablissement && !isChefEtablissement) return;

    setLoading(true);
    try {
      const etabId = await loadCurrentEtablissement();
      if (!etabId) {
        setLoading(false);
        return;
      }

      setCurrentEtablissementId(etabId);

      let query = supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles:user_id (
            id,
            nom,
            prenom,
            email,
            telephone
          )
        `)
        .eq('role', 'enseignant')
        .eq('etablissement_id', etabId)
        .eq('is_active', true);

      if (isDirecteurEtudes || isAnimateurEtablissement) {
        const { data: delegationsData, error: delegError } = await supabase
          .from('delegations')
          .select('delegue_id')
          .eq('delegant_id', user.id)
          .eq('role_delegue', 'enseignant')
          .eq('is_active', true);

        if (delegError) throw delegError;

        const teacherIds = delegationsData.map(d => d.delegue_id);
        if (teacherIds.length > 0) {
          query = query.in('user_id', teacherIds);
        } else {
          setSupervisedTeachers([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const teachers: EnseignantSupervise[] = await Promise.all(
        (data || []).map(async (item) => {
          const { data: classesData } = await supabase
            .from('enseignant_classes')
            .select('classe:classe_id(id, nom)')
            .eq('enseignant_id', item.user_id);

          const { data: matieresData } = await supabase
            .from('enseignant_matieres')
            .select('matiere:matiere_id(id, nom)')
            .eq('enseignant_id', item.user_id);

          return {
            id: item.user_id,
            user_id: item.user_id,
            nom: item.profiles?.nom || '',
            prenom: item.profiles?.prenom || '',
            email: item.profiles?.email || '',
            telephone: item.profiles?.telephone,
            classes: classesData?.map(c => ({ id: c.classe.id, nom: c.classe.nom })) || [],
            matieres: matieresData?.map(m => ({ id: m.matiere.id, nom: m.matiere.nom })) || [],
          };
        })
      );

      setSupervisedTeachers(teachers);
    } catch (err) {
      console.error('Error fetching supervised teachers:', err);
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [user, isDirecteurEtudes, isAnimateurEtablissement, isChefEtablissement, loadCurrentEtablissement]);

  // Créer une nouvelle délégation (avec mapping automatique du type)
  const createDelegation = useCallback(async (
    delegueId: string,
    role_delegue: string,
    type?: string,
    departement?: string,
    plafond?: number,
    date_fin?: string,
    justification?: string,
    droits?: any
  ): Promise<Delegation | null> => {
    console.log('🟢 [createDelegation] - début');
    console.log('🟢 [createDelegation] - user:', user?.id);
    console.log('🟢 [createDelegation] - isChefEtablissement:', isChefEtablissement);
    
    if (!user || !isChefEtablissement) {
      console.log('🔴 [createDelegation] - Non autorisé (pas Chef)');
      return null;
    }

    try {
      const etabId = await loadCurrentEtablissement();
      console.log('🟢 [createDelegation] - etabId:', etabId);
      
      if (!etabId) {
        console.log('🔴 [createDelegation] - etabId est null');
        return null;
      }

      // Si le type n'est pas fourni, on le déduit du role_delegue
      const finalType = type || getTypeFromRole(role_delegue);
      console.log('🟢 [createDelegation] - finalType:', finalType);
      console.log('🟢 [createDelegation] - role_delegue:', role_delegue);
      console.log('🟢 [createDelegation] - delegueId:', delegueId);

      const { data, error } = await supabase
        .from('delegations')
        .insert({
          delegant_id: user.id,
          delegue_id: delegueId,
          etablissement_id: etabId,
          type: finalType,
          role_delegue,
          departement: departement || null,
          plafond: plafond || null,
          date_debut: new Date().toISOString(),
          date_fin: date_fin || null,
          justification: justification || null,
          droits: droits || { lecture: true, ecriture: true },
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('🔴 [createDelegation] - Erreur insertion:', error);
        throw error;
      }

      console.log('✅ [createDelegation] - Insertion réussie, data:', data);

      const roleLabels: Record<string, string> = {
        caissier: 'Caissier',
        assistant_comptable: 'Assistant comptable',
        comptable: 'Comptable',
        ae: 'Animateur d\'Établissement',
        de: 'Directeur des Études',
        personnel_administratif: 'Personnel Administratif',
        personnel_vie_scolaire: 'Personnel Vie Scolaire',
      };
      const roleLabel = roleLabels[role_delegue] || role_delegue;
      
      console.log('🔔 [createDelegation] - Tentative envoi notification à:', delegueId);
      console.log('🔔 [createDelegation] - roleLabel:', roleLabel);
      console.log('🔔 [createDelegation] - user.email:', user.email);

      try {
        await sendDelegationNotification(delegueId, roleLabel, user.email);
        console.log('✅ [createDelegation] - Notification envoyée avec succès');
      } catch (notifError) {
        console.error('🔴 [createDelegation] - Erreur envoi notification:', notifError);
      }

      await fetchDelegationsGiven();
      console.log('✅ [createDelegation] - fetchDelegationsGiven terminé');
      
      return data;
    } catch (err) {
      console.error('🔴 [createDelegation] - Erreur générale:', err);
      throw err;
    }
  }, [user, isChefEtablissement, loadCurrentEtablissement, fetchDelegationsGiven]);

  // ✅ MODIFIER une délégation (date_fin, plafond, departement)
  const updateDelegation = useCallback(async (
    delegationId: string,
    updates: { date_fin?: string | null; plafond?: number; departement?: string }
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('delegations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', delegationId)
        .eq('delegant_id', user.id);

      if (error) throw error;

      await fetchDelegationsGiven();
      return true;
    } catch (err) {
      console.error('Error updating delegation:', err);
      return false;
    }
  }, [user, fetchDelegationsGiven]);

  // ✅ RÉACTIVER une délégation révoquée
  const reactivateDelegation = useCallback(async (delegationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('delegations')
        .update({
          is_active: true,
          revoquee_at: null,
          revoquee_par: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', delegationId)
        .eq('delegant_id', user.id);

      if (error) throw error;

      await fetchDelegationsGiven();
      return true;
    } catch (err) {
      console.error('Error reactivating delegation:', err);
      return false;
    }
  }, [user, fetchDelegationsGiven]);

  // ✅ Récupérer les délégations avec filtres (type, statut)
  const getDelegationsWithFilters = useCallback(async (
    etablissementId: string,
    filters?: { type?: string; status?: string }
  ): Promise<Delegation[]> => {
    try {
      let query = supabase
        .from('delegations')
        .select('*')
        .eq('etablissement_id', etablissementId);

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters?.status === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrichir avec les noms
      const enriched = await Promise.all((data || []).map(async (d) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nom, prenom, email')
          .eq('id', d.delegue_id)
          .maybeSingle();
        
        return {
          ...d,
          delegue_nom: profile?.nom || '',
          delegue_prenom: profile?.prenom || '',
          delegue_email: profile?.email || '',
        };
      }));

      return enriched;
    } catch (err) {
      console.error('Error fetching delegations with filters:', err);
      return [];
    }
  }, []);

  // Révoquer une délégation
  const revokeDelegation = useCallback(async (delegationId: string, justification?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('delegations')
        .update({
          is_active: false,
          revoquee_at: new Date().toISOString(),
          revoquee_par: user.id,
          justification: justification || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', delegationId)
        .eq('delegant_id', user.id);

      if (error) throw error;

      await fetchDelegationsGiven();
      return true;
    } catch (err) {
      console.error('Error revoking delegation:', err);
      return false;
    }
  }, [user, fetchDelegationsGiven]);

  // Vérifier si l'utilisateur peut déléguer un certain rôle
  const canDelegate = useCallback((roleDelegue: string): boolean => {
    if (isChefEtablissement) return true;
    
    if (roleDelegue === 'caissier' || roleDelegue === 'assistant_comptable' || roleDelegue === 'comptable') {
      const adminMeta = getAdminMetadata();
      return adminMeta?.type_admin === 'comptable';
    }
    
    if (roleDelegue === 'ae') {
      const adminMeta = getAdminMetadata();
      return adminMeta?.type_admin === 'de';
    }
    
    return false;
  }, [isChefEtablissement, getAdminMetadata]);

  useEffect(() => {
    if (user) {
      fetchSupervisedTeachers();
      fetchDelegationsGiven();
      fetchDelegationsReceived();
    }
  }, [user, fetchSupervisedTeachers, fetchDelegationsGiven, fetchDelegationsReceived]);

  return {
    delegationsGiven,
    delegationsReceived,
    supervisedTeachers,
    loading,
    error,
    currentEtablissementId,
    isDelegationActive,
    fetchDelegationsGiven,
    fetchDelegationsReceived,
    fetchSupervisedTeachers,
    getActiveDelegationsForUser,
    createDelegation,
    updateDelegation,
    reactivateDelegation,
    getDelegationsWithFilters,
    revokeDelegation,
    canDelegate,
    refresh: fetchSupervisedTeachers,
  };
}
