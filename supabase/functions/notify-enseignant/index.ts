/**
 * Edge Function: notify-enseignant
 * 
 * Envoie des notifications pour les événements liés aux enseignants
 * - Invitation créée
 * - Invitation acceptée
 * - Rattachement à une classe
 * - Rattachement à une matière
 * - Affectation à un groupe
 * - Plafond atteint
 * 
 * Endpoint: POST /functions/v1/notify-enseignant
 * Body: {
 *   user_id?: string,
 *   email?: string,
 *   phone?: string,
 *   type: string,
 *   subject?: string,
 *   message: string,
 *   data?: any
 * }
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationRequest {
  user_id?: string;
  email?: string;
  phone?: string;
  type: string;
  subject?: string;
  message: string;
  data?: any;
}

// Templates de notifications
const NOTIFICATION_TEMPLATES = {
  invitation_enseignant: {
    title: '📨 Invitation à rejoindre SchoolNet',
    inAppMessage: (data: any) => `Vous avez été invité à rejoindre ${data.etablissement_nom} en tant qu'enseignant.`,
  },
  invitation_acceptee: {
    title: '✅ Invitation acceptée',
    inAppMessage: (data: any) => `${data.enseignant_prenom} ${data.enseignant_nom} a accepté votre invitation.`,
  },
  rattachement_classe: {
    title: '📚 Nouvelle classe attribuée',
    inAppMessage: (data: any) => `Vous avez été affecté à la classe ${data.classe_nom} en tant que ${data.role}.`,
  },
  rattachement_matiere: {
    title: '📖 Nouvelle matière attribuée',
    inAppMessage: (data: any) => `Vous êtes maintenant enseignant de ${data.matiere_nom}.`,
  },
  affectation_groupe: {
    title: '👥 Affectation à un groupe',
    inAppMessage: (data: any) => `Vous avez été affecté au groupe ${data.groupe_nom} pour la matière ${data.matiere_nom} en tant que ${data.role}.`,
  },
  plafond_atteint: {
    title: '⚠️ Plafond de département atteint',
    inAppMessage: (data: any) => `Le plafond d'enseignants dans le département ${data.departement} est atteint.`,
  },
  enseignant_actif: {
    title: '🎉 Bienvenue dans SchoolNet !',
    inAppMessage: (data: any) => `Votre compte enseignant est maintenant actif. Vous pouvez commencer à gérer vos classes.`,
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { user_id, email, phone, type, subject, message, data }: NotificationRequest = await req.json();

    if (!type) {
      throw new Error('Missing required field: type');
    }

    const template = NOTIFICATION_TEMPLATES[type as keyof typeof NOTIFICATION_TEMPLATES];
    const title = template?.title || 'Notification SchoolNet';
    const inAppMessage = template?.inAppMessage ? template.inAppMessage(data || {}) : message;

    // Créer une notification in-app si user_id est fourni
    if (user_id) {
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: user_id,
          titre: title,
          contenu: inAppMessage,
          type: 'enseignant',
          data: data || {},
        });

      if (notifError) {
        console.error('Error creating in-app notification:', notifError);
      }
    }

    // Envoyer un email si email est fourni
    if (email) {
      // Ici, vous pouvez intégrer un service d'envoi d'email (Sendinblue, Resend, etc.)
      console.log(`[EMAIL] To: ${email}, Subject: ${subject || title}, Body: ${message}`);
    }

    // Envoyer un SMS si phone est fourni
    if (phone) {
      // Ici, vous pouvez intégrer un service d'envoi de SMS
      console.log(`[SMS] To: ${phone}, Message: ${message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification envoyée avec succès',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in notify-enseignant:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});