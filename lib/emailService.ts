// lib/emailService.ts
// Service d'envoi d'emails via Edge Function Supabase

import { supabase } from './supabase';

export interface InvitationEmailParams {
  email: string;
  nom: string;
  prenom: string;
  emailSnet: string;
  motDePasseTemp: string;
  codeInvitation?: string;
  etablissementNom?: string | null;
  eleveNom?: string | null;
}

export const emailService = {
  /**
   * Envoie un email d'invitation à un parent nouvellement créé
   */
  envoyerInvitation: async (params: InvitationEmailParams): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                           process.env.NEXT_PUBLIC_SUPABASE_URL || 
                           'https://dohqohgnnysbvykyruwy.supabase.co';
      
      const functionUrl = `${supabaseUrl}/functions/v1/send-email`;

      // Récupérer la session pour le token JWT
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        console.warn('Non authentifié, impossible d\'envoyer un email');
        return { success: false, error: 'Non authentifié' };
      }

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: params.email,
          subject: 'SchoolNet - Vos identifiants de connexion',
          template: 'invitation-parent',
          data: {
            nom: params.nom,
            prenom: params.prenom,
            email_snet: params.emailSnet,
            mot_de_passe_temp: params.motDePasseTemp,
            code_invitation: params.codeInvitation,
            etablissement_nom: params.etablissementNom,
            eleve_nom: params.eleveNom,
            login_url: 'https://schoolnet.bj/auth/login',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur envoi email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  },

  /**
   * Envoie un email de bienvenue après activation du compte
   */
  envoyerBienvenue: async (email: string, nom: string, prenom: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                           process.env.NEXT_PUBLIC_SUPABASE_URL || 
                           'https://dohqohgnnysbvykyruwy.supabase.co';
      
      const functionUrl = `${supabaseUrl}/functions/v1/send-email`;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return { success: false, error: 'Non authentifié' };
      }

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: email,
          subject: 'SchoolNet - Bienvenue !',
          template: 'bienvenue-parent',
          data: {
            nom: nom,
            prenom: prenom,
            login_url: 'https://schoolnet.bj/auth/login',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur envoi email bienvenue:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  },
};