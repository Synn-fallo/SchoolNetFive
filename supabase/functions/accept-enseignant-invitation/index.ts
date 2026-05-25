/**
 * Edge Function: accept-enseignant-invitation
 * 
 * Accepte une invitation pour devenir enseignant
 * - Vérifie le token et l'expiration
 * - Crée le compte utilisateur si nécessaire
 * - Ajoute le rôle 'enseignant' dans user_roles
 * - Met à jour le statut de l'invitation
 * - Envoie une notification à l'invitant
 * 
 * Endpoint: POST /functions/v1/accept-enseignant-invitation
 * Body: {
 *   token: string,
 *   user_id?: string,  // Si l'utilisateur a déjà un compte
 *   password?: string  // Si création de compte
 * }
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AcceptInvitationRequest {
  token: string;
  user_id?: string;
  password?: string;
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

    const { token, user_id, password }: AcceptInvitationRequest = await req.json();

    if (!token) {
      throw new Error('Token requis');
    }

    // Vérifier l'invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitation_codes')
      .select('*')
      .eq('code', token)
      .eq('role', 'enseignant')
      .eq('is_active', true)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invitation invalide ou inexistante' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier l'expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Mettre à jour le statut
      await supabaseAdmin
        .from('invitation_codes')
        .update({ statut: 'expiree', is_active: false })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Cette invitation a expiré' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    let targetUserId = user_id;
    let isNewUser = false;

    if (!targetUserId) {
      // Vérifier si l'email existe déjà
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', invitation.email)
        .maybeSingle();

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Créer un nouvel utilisateur
        if (!password) {
          throw new Error('Mot de passe requis pour la création du compte');
        }

        const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: invitation.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            nom: invitation.nom,
            prenom: invitation.prenom,
          },
        });

        if (signUpError) throw signUpError;

        targetUserId = newUser.user.id;
        isNewUser = true;

        // Créer le profil
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: targetUserId,
            nom: invitation.nom,
            prenom: invitation.prenom,
            telephone: invitation.telephone,
            email: invitation.email,
          });

        if (profileError) throw profileError;
      }
    }

    // Vérifier si l'utilisateur a déjà le rôle enseignant dans cet établissement
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('etablissement_id', invitation.etablissement_id)
      .eq('role', 'enseignant')
      .maybeSingle();

    if (existingRole) {
      // Le rôle existe déjà, mettre à jour l'invitation
      await supabaseAdmin
        .from('invitation_codes')
        .update({ statut: 'acceptee', usages_count: invitation.usages_count + 1 })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({
          success: true,
          already_exists: true,
          user_id: targetUserId,
          message: 'Vous êtes déjà enseignant dans cet établissement',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ajouter le rôle enseignant
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: targetUserId,
        etablissement_id: invitation.etablissement_id,
        role: 'enseignant',
        is_active: true,
        metadata: {
          invited_by: invitation.created_by,
          accepted_at: new Date().toISOString(),
          matieres: invitation.metadata?.matieres || [],
          classes: invitation.metadata?.classes || [],
          departement: invitation.metadata?.departement || null,
        },
      });

    if (roleError) throw roleError;

    // Mettre à jour l'invitation
    await supabaseAdmin
      .from('invitation_codes')
      .update({ statut: 'acceptee', usages_count: invitation.usages_count + 1 })
      .eq('id', invitation.id);

    // Si des matières ou classes sont spécifiées, créer les relations
    if (invitation.metadata?.matieres?.length > 0) {
      const matieresInsert = invitation.metadata.matieres.map((matiereId: string) => ({
        enseignant_id: targetUserId,
        matiere_id: matiereId,
      }));
      await supabaseAdmin.from('enseignant_matieres').insert(matieresInsert);
    }

    if (invitation.metadata?.classes?.length > 0) {
      const classesInsert = invitation.metadata.classes.map((classeId: string) => ({
        enseignant_id: targetUserId,
        classe_id: classeId,
        role: 'intervenant',
      }));
      await supabaseAdmin.from('enseignant_classes').insert(classesInsert);
    }

    // Envoyer une notification à l'invitant
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-enseignant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          user_id: invitation.created_by,
          type: 'invitation_acceptee',
          message: `${invitation.prenom} ${invitation.nom} a accepté votre invitation et a rejoint ${invitation.etablissement_id} en tant qu'enseignant.`,
          data: {
            enseignant_nom: invitation.nom,
            enseignant_prenom: invitation.prenom,
            enseignant_email: invitation.email,
          },
        }),
      });
    } catch (notifyError) {
      console.error('Error sending notification:', notifyError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: targetUserId,
        is_new_user: isNewUser,
        message: 'Invitation acceptée avec succès',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in accept-enseignant-invitation:', error);
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