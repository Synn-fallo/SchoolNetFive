import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fusionnerDonneesEnseignant, verifierCodeInvitation } from '@/lib/rattachement';
import { CheckCircle, XCircle, Building2, User, ArrowRight, ArrowLeft } from 'lucide-react-native';
import theme from '@/constants/theme';

interface InvitationData {
  valide: boolean;
  message: string;
  data?: {
    etablissementId: string;
    etablissementNom: string;
    role: string;
    invitePar: string;
    inviteParNom: string;
    email: string;
    nom: string;
    prenom: string;
    token: string;
  };
}

export default function AccepterInvitationScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  
  const [verification, setVerification] = useState<InvitationData | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [existingUserMatch, setExistingUserMatch] = useState(false);

  useEffect(() => {
    const verifier = async () => {
      if (!token) {
        setVerification({ valide: false, message: 'Code d\'invitation manquant' });
        setVerifying(false);
        return;
      }

      try {
        // Vérifier le code d'invitation dans la base
        const { data: invitation, error } = await supabase
          .from('invitation_codes')
          .select(`
            code,
            email,
            nom,
            prenom,
            role,
            etablissement_id,
            expires_at,
            statut,
            created_by,
            metadata,
            etablissement:etablissement_id (id, nom),
            inviteur:created_by (id, profiles!profiles_id_fkey (nom, prenom))
          `)
          .eq('code', token)
          .single();

        if (error || !invitation) {
          setVerification({ valide: false, message: 'Code d\'invitation invalide' });
          setVerifying(false);
          return;
        }

        // Vérifier si l'invitation a expiré
        if (new Date(invitation.expires_at) < new Date()) {
          setVerification({ valide: false, message: 'Cette invitation a expiré' });
          setVerifying(false);
          return;
        }

        // Vérifier si l'invitation a déjà été utilisée
        if (invitation.statut === 'utilise') {
          setVerification({ valide: false, message: 'Cette invitation a déjà été utilisée' });
          setVerifying(false);
          return;
        }

        const inviteurNom = invitation.inviteur?.profiles?.prenom 
          ? `${invitation.inviteur.profiles.prenom} ${invitation.inviteur.profiles.nom}`
          : 'un administrateur';

        setVerification({
          valide: true,
          message: 'Code valide',
          data: {
            etablissementId: invitation.etablissement_id,
            etablissementNom: invitation.etablissement?.nom || 'Établissement',
            role: invitation.role,
            invitePar: invitation.created_by,
            inviteParNom: inviteurNom,
            email: invitation.email,
            nom: invitation.nom,
            prenom: invitation.prenom,
            token: invitation.code,
          },
        });

        // Vérifier si l'utilisateur connecté correspond à l'email de l'invitation
        if (user && user.email === invitation.email) {
          setExistingUserMatch(true);
        }
      } catch (error) {
        console.error('Error verifying invitation:', error);
        setVerification({ valide: false, message: 'Erreur lors de la vérification' });
      } finally {
        setVerifying(false);
      }
    };

    verifier();
  }, [token, user]);

  const handleAccept = async () => {
    if (!verification?.data) return;
    if (!user) {
      // Rediriger vers login avec le token
      router.push(`/auth/login?redirect=/invitation/accept?token=${token}`);
      return;
    }

    // Vérifier que l'email correspond
    if (user.email !== verification.data.email) {
      Alert.alert(
        'Email incorrect',
        `Cette invitation est destinée à ${verification.data.email}. Veuillez vous connecter avec cette adresse email.`,
        [{ text: 'OK', onPress: () => router.push('/auth/login') }]
      );
      return;
    }

    setAccepting(true);
    try {
      // Rattacher l'enseignant à l'établissement et fusionner les données
      const result = await fusionnerDonneesEnseignant(
        user.id,
        verification.data.etablissementId,
        verification.data.token
      );

      if (!result.success) {
        Alert.alert('Erreur', result.message);
        return;
      }

      // Marquer l'invitation comme utilisée dans invitation_codes
      const { error: updateError } = await supabase
        .from('invitation_codes')
        .update({
          statut: 'utilise',
          utilise_le: new Date().toISOString(),
          utilise_par: user.id,
        })
        .eq('code', verification.data.token);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
      }

      // Notifier l'invitant que l'invitation a été acceptée
      try {
        await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notify-enseignant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            user_id: verification.data.invitePar,
            type: 'invitation_acceptee',
            message: `${user.email} a accepté votre invitation à rejoindre ${verification.data.etablissementNom}.`,
            data: {
              enseignant_email: user.email,
              enseignant_nom: user.email?.split('@')[0],
              etablissement_nom: verification.data.etablissementNom,
            },
          }),
        });
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError);
      }

      // Rafraîchir le contexte
      await refreshProfile();

      Alert.alert(
        'Invitation acceptée',
        `Vous êtes maintenant rattaché à ${verification.data.etablissementNom} en tant qu'enseignant. Vos données existantes ont été fusionnées.`,
        [{ text: 'OK', onPress: () => router.replace('/(app)') }]
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Erreur', 'Impossible d\'accepter l\'invitation. Veuillez réessayer.');
    } finally {
      setAccepting(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push(`/auth/login?redirect=/invitation/accept?token=${token}`);
  };

  const handleRegisterRedirect = () => {
    router.push(`/auth/register?redirect=/invitation/accept?token=${token}`);
  };

  // Affichage pendant la vérification
  if (verifying || authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Vérification de l'invitation...</Text>
      </View>
    );
  }

  // Invitation invalide
  if (!verification?.valide) {
    return (
      <View style={styles.centerContainer}>
        <XCircle size={64} color={theme.colors.danger.DEFAULT} />
        <Text style={styles.errorTitle}>Invitation invalide</Text>
        <Text style={styles.errorText}>{verification?.message || 'Ce lien d\'invitation n\'est pas valide.'}</Text>
        <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(app)')}>
          <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const invitationData = verification.data!;

  // Utilisateur non connecté
  if (!user) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>

        <View style={styles.header}>
          <CheckCircle size={48} color={theme.colors.success.DEFAULT} />
          <Text style={styles.title}>Invitation à rejoindre</Text>
          <Text style={styles.subtitle}>
            {invitationData.inviteParNom} vous invite à rejoindre {invitationData.etablissementNom} en tant qu'enseignant.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Building2 size={20} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.infoText}>Établissement : {invitationData.etablissementNom}</Text>
          </View>
          <View style={styles.infoRow}>
            <User size={20} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.infoText}>Rôle : Enseignant</Text>
          </View>
          <View style={styles.infoRow}>
            <Mail size={20} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.infoText}>Email : {invitationData.email}</Text>
          </View>
        </View>

        <Text style={styles.loginPrompt}>
          Pour accepter cette invitation, vous devez vous connecter ou créer un compte.
        </Text>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.loginButton} onPress={handleLoginRedirect}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerButton} onPress={handleRegisterRedirect}>
            <Text style={styles.registerButtonText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Utilisateur connecté - vérifier correspondance email
  if (user.email !== invitationData.email) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>

        <View style={styles.header}>
          <XCircle size={48} color={theme.colors.warning.DEFAULT} />
          <Text style={styles.title}>Email incorrect</Text>
          <Text style={styles.subtitle}>
            Cette invitation est destinée à une autre adresse email.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Mail size={20} color={theme.colors.warning.DEFAULT} />
            <Text style={styles.infoText}>Email de l'invitation : {invitationData.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <User size={20} color={theme.colors.warning.DEFAULT} />
            <Text style={styles.infoText}>Votre email : {user.email}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.logoutButtonText}>Se connecter avec le bon compte</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Utilisateur connecté et email correspond - afficher confirmation
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color={theme.colors.neutral[600]} />
      </TouchableOpacity>

      <View style={styles.header}>
        <CheckCircle size={48} color={theme.colors.success.DEFAULT} />
        <Text style={styles.title}>Accepter l'invitation</Text>
        <Text style={styles.subtitle}>
          Vous êtes invité à rejoindre {invitationData.etablissementNom} en tant qu'enseignant.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Building2 size={20} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.infoText}>Établissement : {invitationData.etablissementNom}</Text>
        </View>
        <View style={styles.infoRow}>
          <User size={20} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.infoText}>Rôle : Enseignant</Text>
        </View>
        <View style={styles.infoRow}>
          <Mail size={20} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.infoText}>Votre email : {user.email}</Text>
        </View>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ Important</Text>
        <Text style={styles.warningText}>
          En acceptant cette invitation :
        </Text>
        <Text style={styles.warningBullet}>• Vous serez rattaché à {invitationData.etablissementNom}</Text>
        <Text style={styles.warningBullet}>• Vos notes, devoirs et bulletins existants seront fusionnés avec cet établissement</Text>
        <Text style={styles.warningBullet}>• Vous pourrez accéder à toutes les fonctionnalités d'enseignant</Text>
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, accepting && styles.buttonDisabled]}
        onPress={handleAccept}
        disabled={accepting}
      >
        {accepting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <CheckCircle size={18} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Accepter l'invitation</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    padding: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.background.secondary,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.neutral[700],
    flex: 1,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 32,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    marginBottom: 8,
  },
  warningBullet: {
    fontSize: 13,
    color: '#92400E',
    marginLeft: 16,
    marginBottom: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.success.DEFAULT,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginPrompt: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonsContainer: {
    gap: 12,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  registerButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  registerButtonText: {
    fontSize: 16,
    color: theme.colors.neutral[600],
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.danger.DEFAULT,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  homeButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});