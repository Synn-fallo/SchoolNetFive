import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fusionnerDonneesEnseignant, verifierCodeInvitation } from '@/lib/rattachement';

interface InvitationData {
  email: string;
  role: 'enseignant';
  etablissementId: string;
  message?: string;
}

export function useEnseignantInvitation() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Envoyer une invitation à un enseignant (Chef d'établissement)
   */
  const envoyerInvitation = async (invitationData: InvitationData): Promise<boolean> => {
    if (!user) {
      setError('Vous devez être connecté');
      return false;
    }

    // Vérifier que l'utilisateur a le droit d'inviter (chef d'établissement ou AE)
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, etablissement_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (rolesError) {
      setError('Erreur lors de la vérification des droits');
      return false;
    }

    const isChef = userRoles.some(r => r.role === 'chef_etablissement');
    const isAE = userRoles.some(r => r.role === 'membre_administratif' && 
      (r.metadata as any)?.type_admin === 'ae');

    if (!isChef && !isAE) {
      setError('Vous n\'avez pas les droits pour inviter un enseignant');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier si l'utilisateur existe déjà
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', invitationData.email)
        .maybeSingle();

      // Générer un code d'invitation unique
      const code = Math.random().toString(36).substring(2, 15).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

      // Créer l'invitation
      const { error: inviteError } = await supabase
        .from('invitation_codes')
        .insert({
          code,
          email: invitationData.email,
          role: invitationData.role,
          etablissement_id: invitationData.etablissementId,
          invite_par: user.id,
          message: invitationData.message || null,
          expires_at: expiresAt.toISOString(),
          statut: 'en_attente',
        });

      if (inviteError) throw inviteError;

      // TODO: Envoyer un email d'invitation via Edge Function
      // Pour l'instant, on simule
      console.log(`Invitation envoyée à ${invitationData.email} avec le code ${code}`);

      return true;
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError('Erreur lors de l\'envoi de l\'invitation');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Accepter une invitation (Enseignant)
   */
  const accepterInvitation = async (code: string): Promise<boolean> => {
    if (!user) {
      setError('Vous devez être connecté pour accepter cette invitation');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier le code d'invitation
      const verification = await verifierCodeInvitation(code);
      if (!verification.valide) {
        setError(verification.message);
        return false;
      }

      const { etablissementId, etablissementNom, role } = verification.data!;

      // Fusionner les données de l'enseignant avec l'établissement
      const result = await fusionnerDonneesEnseignant(user.id, etablissementId, code);

      if (!result.success) {
        setError(result.message);
        return false;
      }

      // Rafraîchir le contexte
      await refreshProfile();

      return true;
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Erreur lors de l\'acceptation de l\'invitation');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    envoyerInvitation,
    accepterInvitation,
    loading,
    error,
  };
}