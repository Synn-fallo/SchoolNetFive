// ============================================================
// PHASE 5 – WORKFLOW ENSEIGNANT
// Fichier : lib/abonnement.ts
// Objectif : Vérifier si un établissement est abonné
// ============================================================

import { supabase } from '@/lib/supabase';

export interface Subscription {
  id: string;
  etablissement_id: string;
  plan: string;
  is_active: boolean;
  date_debut: string;
  date_fin?: string;
  cycle?: 'monthly' | 'yearly';
}

/**
 * Vérifie si un établissement a un abonnement actif
 * @param etablissementId - ID de l'établissement
 * @returns boolean - true si abonnement actif
 */
export async function isEtablissementAbonne(etablissementId: string): Promise<boolean> {
  if (!etablissementId) return false;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('etablissement_id', etablissementId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return false;

    return isSubscriptionActive(data);
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

/**
 * Vérifie si un abonnement est actif (avec gestion d'expiration)
 * @param subscription - Objet abonnement
 * @returns boolean - true si actif
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  if (!subscription?.is_active) return false;

  // Si date_fin existe, l'utiliser
  if (subscription.date_fin) {
    return new Date(subscription.date_fin) > new Date();
  }

  // Sinon calculer selon le cycle
  if (subscription.cycle === 'monthly') {
    const dateDebut = new Date(subscription.date_debut);
    const expiration = new Date(dateDebut);
    expiration.setMonth(expiration.getMonth() + 1);
    return new Date() < expiration;
  }

  // Cycle yearly ou défaut : 1 an
  const dateDebut = new Date(subscription.date_debut);
  const expiration = new Date(dateDebut);
  expiration.setFullYear(expiration.getFullYear() + 1);
  return new Date() < expiration;
}

/**
 * Récupère l'abonnement actif d'un établissement
 * @param etablissementId - ID de l'établissement
 * @returns Subscription | null
 */
export async function getActiveSubscription(etablissementId: string): Promise<Subscription | null> {
  if (!etablissementId) return null;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('etablissement_id', etablissementId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;

    return isSubscriptionActive(data) ? data : null;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
}