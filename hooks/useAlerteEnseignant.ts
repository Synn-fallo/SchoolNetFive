// /home/project/hooks/useAlerteEnseignant.ts
// Hook pour l'envoi d'alertes aux enseignants

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSubscriptionCheck } from './useSubscriptionCheck';

interface UseAlerteEnseignantReturn {
  sending: boolean;
  error: string | null;
  sendAlerte: (message: string, type: string, etablissementId: string) => Promise<boolean>;
  isSubscribed: boolean | null;
}

export function useAlerteEnseignant(etablissementId: string): UseAlerteEnseignantReturn {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSubscribed } = useSubscriptionCheck(etablissementId);

  const sendAlerte = useCallback(async (message: string, type: string, etabId: string): Promise<boolean> => {
    if (!isSubscribed) {
      setError('Abonnement requis pour envoyer des alertes');
      return false;
    }

    setSending(true);
    setError(null);

    try {
      // Récupérer la liste des enseignants de l'établissement
      const { data: enseignants, error: enseignantsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('etablissement_id', etabId)
        .eq('role', 'enseignant')
        .eq('is_active', true);

      if (enseignantsError) throw enseignantsError;

      if (!enseignants || enseignants.length === 0) {
        setError('Aucun enseignant trouvé dans cet établissement');
        return false;
      }

      // Créer les notifications pour chaque enseignant
      const notifications = enseignants.map(enseignant => ({
        user_id: enseignant.user_id,
        titre: type === 'notes_manquantes' ? '⚠️ Notes manquantes' :
               type === 'notes_basses' ? '🔴 Notes anormalement basses' :
               '⏰ Retard de saisie',
        contenu: message,
        type: 'alerte_enseignant',
        metadata: { type_alerte: type, date: new Date().toISOString() },
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      // Appeler Edge Function pour envoyer les emails (optionnel)
      try {
        await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ users: enseignants.map(e => e.user_id), message, type }),
        });
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'alerte');
      return false;
    } finally {
      setSending(false);
    }
  }, [isSubscribed]);

  return { sending, error, sendAlerte, isSubscribed };
}