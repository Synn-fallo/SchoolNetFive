import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type DemandeRole = {
  id: string;
  user_id: string;
  role_souhaite: string;
  message: string | null;
  justificatif_url: string | null;
  statut: 'en_attente' | 'valide' | 'rejete';
  commentaire_admin: string | null;
  created_at: string;
  traitee_at: string | null;
  traitee_par: string | null;
  metadata: any;
  user_nom?: string;
  user_prenom?: string;
  user_email?: string;
  user_telephone?: string;
};

export type FilterType = 'toutes' | 'en_attente' | 'valide' | 'rejete';
export type RoleFilterType = 'tous' | 'chef_etablissement' | 'autorite' | 'partenaire';

export function useAdminDemandes() {
  const { user, hasRole } = useAuth();
  const [demandes, setDemandes] = useState<DemandeRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statutFilter, setStatutFilter] = useState<FilterType>('en_attente');
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('tous');
  
  const isAdmin = hasRole('admin');
  const isFetching = useRef(false);
  const initialFetchDone = useRef(false);

  const fetchDemandes = useCallback(async () => {
    if (!isAdmin) {
      setError('Accès non autorisé');
      setLoading(false);
      return;
    }

    if (isFetching.current) return;
    isFetching.current = true;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('demandes_role')
        .select('*')
        .in('role_souhaite', ['chef_etablissement', 'autorite', 'partenaire'])
        .order('created_at', { ascending: false });

      if (statutFilter !== 'toutes') {
        query = query.eq('statut', statutFilter);
      }

      if (roleFilter !== 'tous') {
        query = query.eq('role_souhaite', roleFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Récupérer les profils séparément
      const userIds = (data || []).map(d => d.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom, telephone')
          .in('id', userIds);
        
        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const formattedData: DemandeRole[] = (data || []).map((item: any) => ({
        ...item,
        user_nom: profilesMap[item.user_id]?.nom,
        user_prenom: profilesMap[item.user_id]?.prenom,
        user_telephone: profilesMap[item.user_id]?.telephone,
        user_email: item.user_email,
      }));

      setDemandes(formattedData);
      initialFetchDone.current = true;
    } catch (err) {
      console.error('Error fetching demandes:', err);
      setError('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [isAdmin, statutFilter, roleFilter]);

  // Chargement initial uniquement
  useEffect(() => {
    if (isAdmin && !initialFetchDone.current) {
      fetchDemandes();
    }
  }, [isAdmin, fetchDemandes]);

  // Rechargement quand les filtres changent (mais avec debounce)
  useEffect(() => {
    if (!isAdmin || !initialFetchDone.current) return;
    
    const timeout = setTimeout(() => {
      fetchDemandes();
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [statutFilter, roleFilter, isAdmin, fetchDemandes]);

  const validerDemande = async (demandeId: string, commentaire?: string) => {
    if (!isAdmin || !user) {
      setError('Action non autorisée');
      return false;
    }

    try {
      const { data: demande, error: fetchError } = await supabase
        .from('demandes_role')
        .select('*')
        .eq('id', demandeId)
        .single();

      if (fetchError) throw fetchError;
      if (!demande) throw new Error('Demande non trouvée');

      // Ajouter le rôle dans user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: demande.user_id,
          role: demande.role_souhaite,
          is_active: true,
          metadata: {
            source: 'admin_validation',
            demande_id: demandeId,
            valide_par: user.id,
            valide_le: new Date().toISOString(),
          },
        });

      if (roleError) throw roleError;

      // Mettre à jour la demande
      const { error: updateError } = await supabase
        .from('demandes_role')
        .update({
          statut: 'valide',
          traitee_at: new Date().toISOString(),
          traitee_par: user.id,
          commentaire_admin: commentaire || null,
        })
        .eq('id', demandeId);

      if (updateError) throw updateError;

      // ✅ Mettre à jour active_role dans profiles si l'utilisateur n'en a pas
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_role')
        .eq('id', demande.user_id)
        .single();

      if (!profileError && !profile?.active_role) {
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ active_role: demande.role_souhaite })
          .eq('id', demande.user_id);
        
        if (updateProfileError) {
          console.error('Error updating active_role:', updateProfileError);
        }
      }

      await fetchDemandes();
      return true;
    } catch (err) {
      console.error('Error validating demande:', err);
      setError('Erreur lors de la validation');
      return false;
    }
  };

  const rejeterDemande = async (demandeId: string, motif: string) => {
    if (!isAdmin || !user) {
      setError('Action non autorisée');
      return false;
    }

    if (!motif.trim()) {
      setError('Veuillez fournir un motif de rejet');
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('demandes_role')
        .update({
          statut: 'rejete',
          traitee_at: new Date().toISOString(),
          traitee_par: user.id,
          commentaire_admin: motif,
        })
        .eq('id', demandeId);

      if (updateError) throw updateError;

      await fetchDemandes();
      return true;
    } catch (err) {
      console.error('Error rejecting demande:', err);
      setError('Erreur lors du rejet');
      return false;
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'chef_etablissement': return 'Chef d\'établissement';
      case 'autorite': return 'Autorité';
      case 'partenaire': return 'Partenaire';
      default: return role;
    }
  };

  const getStatutLabel = (statut: string): { label: string; color: string } => {
    switch (statut) {
      case 'en_attente': return { label: 'En attente', color: '#F59E0B' };
      case 'valide': return { label: 'Validé', color: '#10B981' };
      case 'rejete': return { label: 'Rejeté', color: '#EF4444' };
      default: return { label: statut, color: '#6B7280' };
    }
  };

  return {
    demandes,
    loading,
    error,
    isAdmin,
    statutFilter,
    setStatutFilter,
    roleFilter,
    setRoleFilter,
    fetchDemandes,
    validerDemande,
    rejeterDemande,
    getRoleLabel,
    getStatutLabel,
  };
}