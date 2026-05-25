import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationRequest {
  user_id: string;
  request_type: 'etablissement' | 'partenariat';
  request_id: string;
  action: 'valider' | 'rejeter';
  commentaire?: string;
  validation_auto?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { user_id, request_type, request_id, action, commentaire, validation_auto }: NotificationRequest = await req.json();

    if (!user_id || !request_type || !request_id || !action) {
      throw new Error('Missing required fields');
    }

    let titre: string;
    let contenu: string;

    if (request_type === 'etablissement') {
      if (action === 'valider') {
        if (validation_auto) {
          titre = '✅ Demande d\'établissement validée automatiquement';
          contenu = 'Félicitations ! Votre demande a été validée automatiquement par vérification de votre numéro d\'agrément. Vous pouvez maintenant compléter les informations de votre établissement.';
        } else {
          titre = '✅ Demande d\'établissement acceptée';
          contenu = 'Félicitations ! Votre demande de création d\'établissement a été acceptée. Vous pouvez maintenant compléter les informations de votre établissement.';
        }
      } else {
        titre = '❌ Demande d\'établissement refusée';
        contenu = commentaire 
          ? `Votre demande de création d'établissement a été refusée. Motif : ${commentaire}`
          : 'Votre demande de création d\'établissement a été refusée. Contactez-nous pour plus d\'informations.';
      }
    } else {
      if (action === 'valider') {
        titre = '✅ Demande de partenariat acceptée';
        contenu = 'Félicitations ! Votre demande de partenariat a été acceptée. Vous pouvez maintenant accéder à votre espace partenaire.';
      } else {
        titre = '❌ Demande de partenariat refusée';
        contenu = commentaire 
          ? `Votre demande de partenariat a été refusée. Motif : ${commentaire}`
          : 'Votre demande de partenariat a été refusée. Contactez-nous pour plus d\'informations.';
      }
    }

    // Création de la notification
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: user_id,
        titre: titre,
        contenu: contenu,
        type: 'institution',
        data: {
          request_id,
          request_type,
          action,
          validation_auto,
        },
      });

    if (notificationError) {
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }

    // Enregistrement dans les logs d'activité
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user_id,
        action_type: 'connexion',
        metadata: {
          notification_type: 'institution_request',
          request_type,
          request_id,
          action,
          validation_auto,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});