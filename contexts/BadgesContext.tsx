import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BadgesContextType {
  messagesBadge: number;
  demandesBadge: number;
  invitationsBadge: number;
  loading: boolean;
  refreshBadges: () => Promise<void>;
}

const BadgesContext = createContext<BadgesContextType | undefined>(undefined);

// ✅ Cache pour éviter les appels Supabase trop fréquents
let cachedBadges: {
  messagesBadge: number;
  demandesBadge: number;
  invitationsBadge: number;
  timestamp: number;
} | null = null;
const CACHE_TTL = 30000; // 30 secondes

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

export function BadgesProvider({ children }: { children: React.ReactNode }) {
  const { user, hasRole } = useAuth();
  const [messagesBadge, setMessagesBadge] = useState(0);
  const [demandesBadge, setDemandesBadge] = useState(0);
  const [invitationsBadge, setInvitationsBadge] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Ref pour éviter les appels concurrents
  const isFetchingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const fetchBadges = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // ✅ Vérifier le cache
    if (cachedBadges && Date.now() - cachedBadges.timestamp < CACHE_TTL) {
      setMessagesBadge(cachedBadges.messagesBadge);
      setDemandesBadge(cachedBadges.demandesBadge);
      setInvitationsBadge(cachedBadges.invitationsBadge);
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setLoading(true);
    
    // ✅ hasRole est maintenant stable (useCallback)
    const isAdmin = hasRole('admin');

    try {
      // Messages non lus
      const { count: messagesCount, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('destinataire_id', user.id)
        .eq('is_read', false);

      if (!messagesError && messagesCount !== undefined) {
        setMessagesBadge(messagesCount);
      }

      // Demandes en attente (admin uniquement)
      if (isAdmin) {
        const { count: demandesCount, error: demandesError } = await supabase
          .from('demandes_etablissement')
          .select('*', { count: 'exact', head: true })
          .in('statut', ['en_attente', 'en_cours']);

        if (!demandesError && demandesCount !== undefined) {
          setDemandesBadge(demandesCount);
        }
      }

      // Invitations en attente
      const etablissementId = await getCurrentEtablissementId(user.id);
      if (etablissementId && isAdmin) {
        const { count: invitationsCount, error: invitationsError } = await supabase
          .from('invitation_codes')
          .select('*', { count: 'exact', head: true })
          .eq('etablissement_id', etablissementId)
          .eq('role', 'enseignant')
          .eq('statut', 'en_attente')
          .gt('expires_at', new Date().toISOString());

        if (!invitationsError && invitationsCount !== undefined) {
          setInvitationsBadge(invitationsCount);
        }
      }

      // ✅ Mettre à jour le cache
      cachedBadges = {
        messagesBadge: messagesBadge,
        demandesBadge: demandesBadge,
        invitationsBadge: invitationsBadge,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      initialLoadDoneRef.current = true;
    }
  }, [user, hasRole, messagesBadge, demandesBadge, invitationsBadge]);

  // Chargement initial
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setMessagesBadge(0);
      setDemandesBadge(0);
      setInvitationsBadge(0);
      return;
    }

    if (!initialLoadDoneRef.current) {
      fetchBadges();
    }
  }, [user, fetchBadges]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!user) return;

    // Messages subscription
    const messagesSubscription = supabase
      .channel('messages-badge')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `destinataire_id=eq.${user.id}`,
      }, () => {
        setMessagesBadge(prev => prev + 1);
        // Invalider le cache
        cachedBadges = null;
      })
      .subscribe();

    // Demandes subscription (admin uniquement)
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
          cachedBadges = null;
        })
        .subscribe();
    }

    // Invitations subscription
    let invitationsSubscription: any = null;
    const setupInvitationsSubscription = async () => {
      const etablissementId = await getCurrentEtablissementId(user.id);
      if (etablissementId && hasRole('admin')) {
        invitationsSubscription = supabase
          .channel('invitations-badge')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'invitation_codes',
            filter: `etablissement_id=eq.${etablissementId},role=eq.enseignant,statut=eq.en_attente`,
          }, () => {
            setInvitationsBadge(prev => prev + 1);
            cachedBadges = null;
          })
          .subscribe();
      }
    };

    setupInvitationsSubscription();

    return () => {
      messagesSubscription.unsubscribe();
      if (demandesSubscription) demandesSubscription.unsubscribe();
      if (invitationsSubscription) invitationsSubscription.unsubscribe();
    };
  }, [user, hasRole]);

  const refreshBadges = useCallback(async () => {
    cachedBadges = null;
    await fetchBadges();
  }, [fetchBadges]);

  return (
    <BadgesContext.Provider value={{
      messagesBadge,
      demandesBadge,
      invitationsBadge,
      loading,
      refreshBadges,
    }}>
      {children}
    </BadgesContext.Provider>
  );
}

export function useBadges() {
  const context = useContext(BadgesContext);
  if (context === undefined) {
    throw new Error('useBadges must be used within a BadgesProvider');
  }
  return context;
}