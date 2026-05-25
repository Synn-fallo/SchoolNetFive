/**
 * Edge Function: send-enseignant-invitation
 * 
 * Crée une invitation pour un enseignant
 * - Génère un token unique
 * - Enregistre dans invitation_codes
 * - Envoie une notification (email/SMS) à l'enseignant invité
 * - Vérifie les plafonds si l'invitant est un AE
 * 
 * Endpoint: POST /functions/v1/send-enseignant-invitation
 * Body: {
 *   email: string,
 *   nom: string,
 *   prenom: string,
 *   telephone?: string,
 *   etablissement_id: string,
 *   departement?: string,
 *   matieres?: string[],
 *   classes?: string[]
 * }
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InvitationRequest {
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  etablissement_id: string;
  departement?: string;
  matieres?: string[];
  classes?: string[];
}

// Générer un token unique pour l'invitation
function generateToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}`;
}

// Vérifier si l'invitant a le droit d'inviter
async function canInvite(
  supabaseAdmin: any,
  invitantId: string,
  etablissementId: string,
  departement?: string
): Promise<{ allowed: boolean; message?: string }> {
  // Récupérer le rôle de l'invitant
  const { data: roles, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', invitantId)
    .eq('etablissement_id', etablissementId)
    .eq('is_active', true);

  if (roleError || !roles || roles.length === 0) {
    return { allowed: false, message: 'Vous n\'avez pas de rôle actif dans cet établissement' };
  }

  const userRoles = roles.map(r => r.role);

  // Chef d'établissement et DE peuvent toujours inviter
  if (userRoles.includes('chef_etablissement')) {
    return { allowed: true };
  }

  // Vérifier si c'est un Directeur des Études (type 'de')
  if (userRoles.includes('membre_administratif')) {
    const { data: adminMeta, error: metaError } = await supabaseAdmin
      .from('user_roles')
      .select('metadata')
      .eq('user_id', invitantId)
      .eq('etablissement_id', etablissementId)
      .eq('role', 'membre_administratif')
      .single();

    if (!metaError && adminMeta?.metadata?.type_admin === 'de') {
      return { allowed: true };
    }
  }

  // Vérifier si c'est un Animateur d'Établissement (type 'ae')
  if (userRoles.includes('membre_administratif')) {
    const { data: adminMeta, error: metaError } = await supabaseAdmin
      .from('user_roles')
      .select('metadata')
      .eq('user_id', invitantId)
      .eq('etablissement_id', etablissementId)
      .eq('role', 'membre_administratif')
      .single();

    if (!metaError && adminMeta?.metadata?.type_admin === 'ae') {
      if (!departement) {
        return { allowed: false, message: 'Vous devez spécifier un département' };
      }

      // Vérifier le plafond
      const { data: result, error: funcError } = await supabaseAdmin.rpc('can_ae_invite', {
        p_ae_id: invitantId,
        p_departement: departement,
        p_etablissement_id: etablissementId,
      });

      if (funcError) {
        console.error('Error checking plafond:', funcError);
        return { allowed: false, message: 'Erreur de vérification du plafond' };
      }

      if (!result) {
        return { allowed: false, message: 'Plafond de votre département atteint. Contactez le Directeur des Études.' };
      }

      return { allowed: true };
    }
  }

  return { allowed: false, message: 'Vous n\'avez pas les droits pour inviter un enseignant' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Récupérer l'utilisateur connecté via l'en-tête Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { email, nom, prenom, telephone, etablissement_id, departement, matieres, classes }: InvitationRequest = await req.json();

    if (!email || !nom || !prenom || !etablissement_id) {
      throw new Error('Missing required fields: email, nom, prenom, etablissement_id');
    }

    // Vérifier les droits
    const { allowed, message } = await canInvite(supabaseAdmin, user.id, etablissement_id, departement);
    if (!allowed) {
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si l'email est déjà utilisé
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    // Vérifier si une invitation en attente existe déjà
    const { data: existingInvitation } = await supabaseAdmin
      .from('invitation_codes')
      .select('id, code, expires_at, statut')
      .eq('email', email)
      .eq('etablissement_id', etablissement_id)
      .eq('statut', 'en_attente')
      .maybeSingle();

    if (existingInvitation) {
      // Renvoyer la même invitation si elle n'est pas expirée
      if (new Date(existingInvitation.expires_at) > new Date()) {
        return new Response(
          JSON.stringify({
            success: true,
            already_exists: true,
            invitation_id: existingInvitation.id,
            message: 'Une invitation est déjà en attente pour cet email',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Générer le token et la date d'expiration (7 jours)
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Créer l'invitation
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('invitation_codes')
      .insert({
        code: token,
        role: 'enseignant',
        etablissement_id,
        email,
        nom,
        prenom,
        telephone: telephone || null,
        statut: 'en_attente',
        max_usages: 1,
        usages_count: 0,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        is_active: true,
        metadata: {
          matieres: matieres || [],
          classes: classes || [],
          departement: departement || null,
          invitant_id: user.id,
        },
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create invitation: ${insertError.message}`);
    }

    // Construire le lien d'acceptation
    const baseUrl = Deno.env.get('APP_URL') ?? 'https://schoolnet.bj';
    const acceptUrl = `${baseUrl}/accept-invitation?token=${token}&type=enseignant`;

    // Envoyer la notification à l'enseignant invité
    try {
      const notificationPayload = {
        user_id: null, // L'enseignant n'a pas encore de compte
        email: email,
        type: 'invitation_enseignant',
        subject: `Invitation à rejoindre SchoolNet en tant qu'enseignant`,
        message: `Bonjour ${prenom} ${nom},\n\n${user.email} vous invite à rejoindre SchoolNet en tant qu'enseignant.\n\nCliquez sur le lien suivant pour accepter l'invitation : ${acceptUrl}\n\nCette invitation expire dans 7 jours.\n\nÀ bientôt sur SchoolNet !`,
      };

      if (telephone) {
        Object.assign(notificationPayload, { phone: telephone, sms: `SchoolNet: ${user.email} vous invite à rejoindre SchoolNet. ${acceptUrl}` });
      }

      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-enseignant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify(notificationPayload),
      });
    } catch (notifyError) {
      console.error('Error sending notification:', notifyError);
      // Ne pas échouer la création de l'invitation si la notification échoue
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        token: invitation.code,
        expires_at: invitation.expires_at,
        message: 'Invitation créée avec succès',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-enseignant-invitation:', error);
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