import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { genererMotDePasseSecurise } from '@/utils/motDePasseUtils';

interface ReinitialisationResult {
  success: boolean;
  nouveauMotDePasse?: string;
  error?: string;
}

export function useReinitialisationMotDePasse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Réinitialiser le mot de passe d'un élève
   * Uniquement possible si l'élève n'a jamais effectué sa première connexion
   */
  const reinitialiserMotDePasse = async (
    eleveId: string,
    userId: string
  ): Promise<ReinitialisationResult> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Vérifier si l'élève a déjà changé son mot de passe
      // (à implémenter après ajout de la colonne first_login)
      
      // 2. Générer un nouveau mot de passe temporaire
      const nouveauMotDePasse = genererMotDePasseSecurise();
      
      // 3. Mettre à jour le mot de passe dans auth.users
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: nouveauMotDePasse }
      );
      
      if (updateError) throw updateError;
      
      // 4. Remettre first_login à true (si colonne existe)
      
      return { success: true, nouveauMotDePasse };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    reinitialiserMotDePasse,
    loading,
    error,
  };
}