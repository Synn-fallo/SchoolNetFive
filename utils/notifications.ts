// /home/project/utils/notifications.ts
// Version corrigée – colonnes exactes de la table notifications

import { supabase } from '@/lib/supabase';

export interface NotificationData {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}

/**
 * Envoie une notification in-app à un utilisateur
 */
export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any
): Promise<boolean> {
  if (!userId) {
    console.error('sendNotification: userId is required');
    return false;
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        titre: title,      // colonne = 'titre'
        contenu: message,  // colonne = 'contenu'
        data: data || {},
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error sending notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Envoie une notification de nomination
 */
export async function sendNominationNotification(
  userId: string,
  roleLabel: string,
  nominePar?: string
): Promise<boolean> {
  const message = nominePar 
    ? `Vous avez été nommé(e) ${roleLabel} par ${nominePar}.`
    : `Vous avez été nommé(e) ${roleLabel}.`;
  
  return sendNotification(
    userId,
    'nomination',
    'Nouvelle nomination',
    message,
    { role: roleLabel, nomine_par: nominePar }
  );
}

/**
 * Envoie une notification de délégation
 */
export async function sendDelegationNotification(
  userId: string,
  roleLabel: string,
  delegantPar?: string
): Promise<boolean> {
  const message = delegantPar
    ? `Vous avez reçu une délégation en tant que ${roleLabel} de la part de ${delegantPar}.`
    : `Vous avez reçu une délégation en tant que ${roleLabel}.`;
  
  return sendNotification(
    userId,
    'delegation',
    'Nouvelle délégation',
    message,
    { delegated_role: roleLabel, delegant_par: delegantPar }
  );
}
