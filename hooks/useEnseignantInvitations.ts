import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Invitation {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  statut: 'en_attente' | 'acceptee' | 'expiree' | 'annulee';
  expires_at: string;
  created_at: string;
  metadata?: {
    matieres?: string[];
    classes?: string[];
    departement?: string;
  };
}

export interface CreateInvitationParams {
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  etablissement_id: string;
  departement?: string;
  matieres?: string[];
  classes?: string[];
}

export function useEnseignantInvitations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInvitation = useCallback(async (params: CreateInvitationParams): Promise<{ success: boolean; invitation_id?: string; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-enseignant-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (result.success) {
        return { success: true, invitation_id: result.invitation_id };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création de l\'invitation';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getInvitations = useCallback(async (etablissementId: string): Promise<Invitation[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .eq('role', 'enseignant')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des invitations';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getInvitationByToken = useCallback(async (token: string): Promise<Invitation | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', token)
        .eq('role', 'enseignant')
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invitation invalide';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptInvitation = useCallback(async (token: string, password?: string): Promise<{ success: boolean; user_id?: string; is_new_user?: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/accept-enseignant-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          user_id: result.user_id,
          is_new_user: result.is_new_user,
        };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation de l\'invitation';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('invitation_codes')
        .update({ statut: 'annulee', is_active: false })
        .eq('id', invitationId);

      if (error) throw error;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'annulation';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createInvitation,
    getInvitations,
    getInvitationByToken,
    acceptInvitation,
    cancelInvitation,
  };
}