import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface UserReaction {
  annonce_id: string;
  reaction: 'like' | 'participe' | 'question' | 'notify' | null;
  confirmation_presence: boolean;
}

export function useReactions(annonceId: string) {
  const { user } = useAuth();
  const [userReaction, setUserReaction] = useState<UserReaction | null>(null);
  const [reactionCounts, setReactionCounts] = useState({
    like: 0,
    participe: 0,
    question: 0,
    notify: 0,
  });
  const [totalConfirmations, setTotalConfirmations] = useState(0);
  const [loading, setLoading] = useState(true);

  const chargerReactions = useCallback(async () => {
    if (!user || !annonceId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Récupérer la réaction de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('annonces_participants')
        .select('reaction, confirmation_presence')
        .eq('annonce_id', annonceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userError && userData) {
        setUserReaction({
          annonce_id: annonceId,
          reaction: userData.reaction,
          confirmation_presence: userData.confirmation_presence || false,
        });
      } else {
        setUserReaction({
          annonce_id: annonceId,
          reaction: null,
          confirmation_presence: false,
        });
      }

      // Récupérer les compteurs
      const { data: allData, error: allError } = await supabase
        .from('annonces_participants')
        .select('reaction, confirmation_presence')
        .eq('annonce_id', annonceId);

      if (!allError && allData) {
        const counts = { like: 0, participe: 0, question: 0, notify: 0 };
        let confirmations = 0;

        allData.forEach(p => {
          if (p.reaction === 'like') counts.like++;
          else if (p.reaction === 'participe') counts.participe++;
          else if (p.reaction === 'question') counts.question++;
          else if (p.reaction === 'notify') counts.notify++;
          if (p.confirmation_presence) confirmations++;
        });

        setReactionCounts(counts);
        setTotalConfirmations(confirmations);
      }
    } catch (err) {
      console.error('Erreur chargement réactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user, annonceId]);

  const ajouterReaction = useCallback(async (reaction: 'like' | 'participe' | 'question' | 'notify') => {
    if (!user || !annonceId) return false;

    try {
      const { data, error } = await supabase.functions.invoke('reagir-annonce', {
        body: { annonce_id: annonceId, reaction, action: 'add' },
      });

      if (error) throw error;

      setUserReaction(prev => ({ ...prev!, reaction }));
      if (data.reactionCounts) {
        setReactionCounts(data.reactionCounts);
      }
      return true;
    } catch (err) {
      console.error('Erreur ajout réaction:', err);
      return false;
    }
  }, [user, annonceId]);

  const retirerReaction = useCallback(async () => {
    if (!user || !annonceId || !userReaction?.reaction) return false;

    try {
      const { data, error } = await supabase.functions.invoke('reagir-annonce', {
        body: { annonce_id: annonceId, reaction: userReaction.reaction, action: 'remove' },
      });

      if (error) throw error;

      setUserReaction(prev => ({ ...prev!, reaction: null }));
      if (data.reactionCounts) {
        setReactionCounts(data.reactionCounts);
      }
      return true;
    } catch (err) {
      console.error('Erreur retrait réaction:', err);
      return false;
    }
  }, [user, annonceId, userReaction]);

  const confirmer = useCallback(async (confirme: boolean) => {
    if (!user || !annonceId) return false;

    try {
      const { data, error } = await supabase.functions.invoke('confirmer-presence', {
        body: { annonce_id: annonceId, confirme },
      });

      if (error) throw error;

      setUserReaction(prev => ({ ...prev!, confirmation_presence: confirme }));
      if (data.totalConfirmations !== undefined) {
        setTotalConfirmations(data.totalConfirmations);
      }
      return true;
    } catch (err) {
      console.error('Erreur confirmation présence:', err);
      return false;
    }
  }, [user, annonceId]);

  useEffect(() => {
    chargerReactions();
  }, [chargerReactions]);

  return {
    userReaction,
    reactionCounts,
    totalConfirmations,
    loading,
    ajouterReaction,
    retirerReaction,
    confirmer,
    refetch: chargerReactions,
  };
}