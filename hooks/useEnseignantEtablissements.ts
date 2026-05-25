import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EtablissementRattache {
  id: string;
  etablissement_id: string;
  etablissement_nom: string;
  etablissement_slug: string;
  role: string;
  is_active: boolean;
  est_principal: boolean;
  created_at: string;
}

export interface InvitationRecue {
  id: string;
  code: string;
  etablissement_id: string;
  etablissement_nom: string;
  message?: string;
  statut: 'en_attente' | 'acceptee' | 'expiree' | 'annulee';
  expires_at: string;
  created_at: string;
}

export function useEnseignantEtablissements() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer tous les établissements rattachés à l'enseignant
  const getEtablissementsRattaches = useCallback(async (): Promise<EtablissementRattache[]> => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('enseignant_etablissements')
        .select(`
          id,
          etablissement_id,
          role,
          is_active,
          est_principal,
          created_at,
          etablissements:etablissement_id (nom, slug)
        `)
        .eq('enseignant_id', user.id);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        etablissement_id: item.etablissement_id,
        etablissement_nom: (item.etablissements as any)?.nom || '',
        etablissement_slug: (item.etablissements as any)?.slug || '',
        role: item.role,
        is_active: item.is_active,
        est_principal: item.est_principal,
        created_at: item.created_at,
      }));
    } catch (err) {
      console.error('Error fetching rattachements:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Récupérer les invitations reçues
  const getInvitationsRecues = useCallback(async (): Promise<InvitationRecue[]> => {
    if (!user || !user.email) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('invitations_enseignant')
        .select(`
          id,
          code,
          etablissement_id,
          message,
          statut,
          expires_at,
          created_at,
          etablissements:etablissement_id (nom)
        `)
        .eq('email_destinataire', user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        code: item.code,
        etablissement_id: item.etablissement_id,
        etablissement_nom: (item.etablissements as any)?.nom || '',
        message: item.message,
        statut: item.statut,
        expires_at: item.expires_at,
        created_at: item.created_at,
      }));
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Accepter une invitation
  const accepterInvitation = useCallback(async (invitationId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Utilisateur non connecté' };

    setLoading(true);
    setError(null);

    try {
      // Vérifier le code
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations_enseignant')
        .select('*')
        .eq('id', invitationId)
        .eq('code', code)
        .eq('statut', 'en_attente')
        .single();

      if (inviteError || !invitation) {
        throw new Error('Code d\'invitation invalide ou expiré');
      }

      // Vérifier l'expiration
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Cette invitation a expiré');
      }

      // Créer le rattachement
      const { error: rattachementError } = await supabase
        .from('enseignant_etablissements')
        .insert({
          enseignant_id: user.id,
          etablissement_id: invitation.etablissement_id,
          role: 'enseignant',
          is_active: true,
          est_principal: false,
        });

      if (rattachementError) throw rattachementError;

      // Marquer l'invitation comme acceptée
      await supabase
        .from('invitations_enseignant')
        .update({ statut: 'acceptee' })
        .eq('id', invitationId);

      return { success: true };
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Erreur d\'acceptation');
      return { success: false, error: err instanceof Error ? err.message : 'Erreur d\'acceptation' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Définir l'établissement principal
  const setEtablissementPrincipal = useCallback(async (rattachementId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Utilisateur non connecté' };

    setLoading(true);
    setError(null);

    try {
      // Réinitialiser tous les établissements principaux
      await supabase
        .from('enseignant_etablissements')
        .update({ est_principal: false })
        .eq('enseignant_id', user.id);

      // Définir le nouveau principal
      const { error } = await supabase
        .from('enseignant_etablissements')
        .update({ est_principal: true })
        .eq('id', rattachementId)
        .eq('enseignant_id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Error setting principal etablissement:', err);
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de mise à jour' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Retirer un rattachement
  const retirerRattachement = useCallback(async (rattachementId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Utilisateur non connecté' };

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('enseignant_etablissements')
        .delete()
        .eq('id', rattachementId)
        .eq('enseignant_id', user.id);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Error removing rattachement:', err);
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de suppression' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    error,
    getEtablissementsRattaches,
    getInvitationsRecues,
    accepterInvitation,
    setEtablissementPrincipal,
    retirerRattachement,
  };
}