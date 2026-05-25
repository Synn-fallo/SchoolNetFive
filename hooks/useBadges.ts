import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Helper pour récupérer l'établissement de l'utilisateur
const getCurrentEtablissementId = async (userId: string) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('etablissement_id')
    .eq('id', userId)
    .maybeSingle();
  
  if (error || !profile?.etablissement_id) {
    return null;
  }
  
  return profile.etablissement_id;
};

export function useBadges() {
  const { user, hasRole } = useAuth();
  const [messagesBadge, setMessagesBadge] = useState(0);
  const [demandesBadge, setDemandesBadge] = useState(0);
  const [invitationsBadge, setInvitationsBadge] = useState(0);
  const [demandesAutoInscriptionBadge, setDemandesAutoInscriptionBadge] = useState(0); // 🆕
  const [loading, setLoading] = useState(true);

  // 🆕 Fonction pour charger le badge des demandes auto-inscription
  const loadAutoInscriptionBadge = async () => {
    if (!user) return;
    
    try {
      const etablissementId = await getCurrentEtablissementId(user.id);
      if (!etablissementId) return;
      
      const { count, error } = await supabase
        .from('demandes_auto_inscription')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', etablissementId)
        .eq('statut', 'pending');
      
      if (!error) {
        setDemandesAutoInscriptionBadge(count || 0);
      }
    } catch (error) {
      console.error('Error loading auto-inscription badge:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchBadges = async () => {
      try {
        // Messages non lus
        const { count: messagesCount, error: messagesError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('destinataire_id', user.id)
          .eq('is_read', false);

        if (!messagesError && messagesCount) {
          setMessagesBadge(messagesCount);
        }

        // Demandes en attente (admin uniquement)
        if (hasRole('admin')) {
          const { count: demandesCount, error: demandesError } = await supabase
            .from('demandes_etablissement')
            .select('*', { count: 'exact', head: true })
            .in('statut', ['en_attente', 'en_cours']);

          if (!demandesError && demandesCount) {
            setDemandesBadge(demandesCount);
          }
        }

        // Invitations en attente (pour les administrateurs)
        const loadInvitationsBadge = async () => {
          if (!user) return;
          
          try {
            const etablissementId = await getCurrentEtablissementId(user.id);
            if (!etablissementId) return;
            
            const { count, error } = await supabase
              .from('invitation_codes')
              .select('*', { count: 'exact', head: true })
              .eq('etablissement_id', etablissementId)
              .eq('role', 'enseignant')
              .eq('statut', 'en_attente')
              .gt('expires_at', new Date().toISOString());
            
            if (!error) {
              setInvitationsBadge(count || 0);
            }
          } catch (error) {
            console.error('Error loading invitations badge:', error);
          }
        };

        await loadInvitationsBadge();
        
        // 🆕 Charger le badge des demandes auto-inscription
        await loadAutoInscriptionBadge();

      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();

    // Écouter les changements en temps réel pour les messages
    const messagesSubscription = supabase
      .channel('messages-badge')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `destinataire_id=eq.${user.id}`,
      }, () => {
        setMessagesBadge(prev => prev + 1);
      })
      .subscribe();

    // Écouter les changements pour les demandes (admin)
    let demandesSubscription: any = null;
    if (hasRole('admin')) {
      demandesSubscription = supabase
        .channel('demandes-badge')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'demandes_etablissement',
          filter: 'statut=in.(en_attente,en_cours)',
        }, () => {
          setDemandesBadge(prev => prev + 1);
        })
        .subscribe();
    }

    // Écouter les changements pour les invitations (admin)
    let invitationsSubscription: any = null;
    if (hasRole('admin')) {
      invitationsSubscription = supabase
        .channel('invitations-badge')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'invitation_codes',
          filter: 'role=eq.enseignant,statut=eq.en_attente',
        }, () => {
          setInvitationsBadge(prev => prev + 1);
        })
        .subscribe();
    }

    // 🆕 Écouter les changements pour les demandes auto-inscription
    let autoInscriptionSubscription: any = null;
    if (hasRole('chef_etablissement') || hasRole('directeur_etudes')) {
      const setupAutoInscriptionSubscription = async () => {
        const etablissementId = await getCurrentEtablissementId(user.id);
        if (etablissementId) {
          autoInscriptionSubscription = supabase
            .channel('auto-inscription-badge')
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'demandes_auto_inscription',
              filter: `etablissement_id=eq.${etablissementId},statut=eq.pending`,
            }, () => {
              setDemandesAutoInscriptionBadge(prev => prev + 1);
            })
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'demandes_auto_inscription',
              filter: `etablissement_id=eq.${etablissementId}`,
            }, () => {
              // Recharger le compteur en cas de mise à jour
              loadAutoInscriptionBadge();
            })
            .subscribe();
        }
      };
      setupAutoInscriptionSubscription();
    }

    return () => {
      messagesSubscription.unsubscribe();
      if (demandesSubscription) demandesSubscription.unsubscribe();
      if (invitationsSubscription) invitationsSubscription.unsubscribe();
      if (autoInscriptionSubscription) autoInscriptionSubscription.unsubscribe();
    };
  }, [user, hasRole]);

  return {
    messagesBadge,
    demandesBadge,
    invitationsBadge,
    demandesAutoInscriptionBadge, // 🆕
    loading,
  };
}