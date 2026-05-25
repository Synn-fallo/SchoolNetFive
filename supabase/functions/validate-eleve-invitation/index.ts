import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

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

    const { code, educmaster, parent_id } = await req.json();

    if (!code || !educmaster) {
      throw new Error('Missing required fields: code, educmaster');
    }

    // Vérifier l'invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitation_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('role', 'eleve')
      .eq('is_active', true)
      .eq('statut', 'en_attente')
      .maybeSingle();

    if (invitationError || !invitation) {
      throw new Error('Code d\'invitation invalide');
    }

    // Vérifier l'expiration
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Code d\'invitation expiré');
    }

    // Vérifier l'EducMaster
    const metadata = invitation.metadata || {};
    if (metadata.educmaster !== educmaster) {
      throw new Error('EducMaster ne correspond pas à l\'invitation');
    }

    const eleveId = metadata.eleve_id;

    if (!eleveId) {
      throw new Error('Élève non associé à cette invitation');
    }

    // Récupérer les informations de l'élève
    const { data: eleve, error: eleveError } = await supabaseAdmin
      .from('eleves')
      .select('id, nom, prenom, educmaster')
      .eq('id', eleveId)
      .single();

    if (eleveError || !eleve) {
      throw new Error('Élève non trouvé');
    }

    const parentId = parent_id || user.id;

    // Vérifier si le lien parent-élève existe déjà
    const { data: existingLink, error: linkError } = await supabaseAdmin
      .from('parents_eleves')
      .select('id')
      .eq('parent_id', parentId)
      .eq('eleve_id', eleveId)
      .maybeSingle();

    if (existingLink) {
      throw new Error('Cet enfant est déjà lié à votre compte');
    }

    // Créer le lien parent-élève
    const { error: insertError } = await supabaseAdmin
      .from('parents_eleves')
      .insert({
        parent_id: parentId,
        eleve_id: eleveId,
        lien_parente: 'tuteur',
        est_principal: false,
      });

    if (insertError) throw insertError;

    // Marquer l'invitation comme acceptée
    await supabaseAdmin
      .from('invitation_codes')
      .update({ statut: 'acceptee', is_active: false })
      .eq('id', invitation.id);

    // Mettre à jour le profil du parent si nécessaire
    if (parent_id === user.id) {
      await supabaseAdmin
        .from('profiles')
        .update({ type_utilisateur: 'parent' })
        .eq('id', user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        eleve_id: eleveId,
        eleve_nom: eleve.nom,
        eleve_prenom: eleve.prenom,
        message: 'Enfant lié avec succès',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-eleve-invitation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});