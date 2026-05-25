// /home/project/hooks/useSubscriptionCheck.ts
// Hook réutilisable pour vérifier l'abonnement d'un établissement

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Subscription {
  id: string;
  etablissement_id: string;
  plan: 'essentiel' | 'premium' | 'prestige';
  is_active: boolean;
  date_debut: string;
  telephone?: string;
  operateur?: 'mtn' | 'moov' | 'celtis';
  montant?: number;
  cycle?: 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan?: string;
  dateDebut?: string;
  etablissementId: string;
  subscription?: Subscription;
}

interface UseSubscriptionCheckReturn {
  isSubscribed: boolean | null;
  loading: boolean;
  error: string | null;
  subscription: Subscription | null;
  plan: string | null;
  refresh: () => Promise<void>;
  checkSubscription: () => Promise<boolean>;
}

export function useSubscriptionCheck(
  etablissementId: string | null
): UseSubscriptionCheckReturn {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  const checkSubscription = useCallback(async (): Promise<boolean> => {
    if (!etablissementId) {
      setIsSubscribed(false);
      setSubscription(null);
      setPlan(null);
      return false;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('abonnements')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking subscription:', fetchError);
        setIsSubscribed(false);
        setSubscription(null);
        setPlan(null);
        return false;
      }

      if (data) {
        setIsSubscribed(true);
        setSubscription(data as Subscription);
        setPlan(data.plan);
        return true;
      } else {
        setIsSubscribed(false);
        setSubscription(null);
        setPlan(null);
        return false;
      }
    } catch (err) {
      console.error('Unexpected error checking subscription:', err);
      setIsSubscribed(false);
      setSubscription(null);
      setPlan(null);
      return false;
    }
  }, [etablissementId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await checkSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  }, [checkSubscription]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isSubscribed,
    loading,
    error,
    subscription,
    plan,
    refresh,
    checkSubscription,
  };
}