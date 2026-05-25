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

    const { eleve_id, etablissement_id } = await req.json();

    if (!eleve_id || !etablissement_id) {
      throw new Error('Missing required fields: eleve_id, etablissement_id');
    }

    // Vérifier les droits (chef ou DE)
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('etablissement_id', etablissement_id)
      .eq('is_active', true);

    if (rolesError || !roles || roles.length === 0) {
      throw new Error('Vous n\'avez pas les droits pour générer une invitation');
    }

    const hasRight = roles.some(r => r.role === 'chef_etablissement' || 
      (r.role === 'membre_administratif' && (r as any).metadata?.type_admin === 'de'));

    if (!hasRight) {
      throw new Error('Droits insuffisants');
    }

    // Récupérer les informations de l'élève
    const { data: eleve, error: eleveError } = await supabaseAdmin
      .from('eleves')
      .select('id, user_id, nom, prenom, educmaster')
      .eq('id', eleve_id)
      .single();

    if (eleveError || !eleve) {
      throw new Error('Élève non trouvé');
    }

    // Récupérer le profil de l'élève pour le nom/prénom
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nom, prenom')
      .eq('id', eleve.user_id)
      .single();

    const eleveNom = profile?.nom || eleve.nom;
    const elevePrenom = profile?.prenom || eleve.prenom;

    // Générer un code unique
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    // Stocker l'invitation dans invitation_codes
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('invitation_codes')
      .insert({
        code,
        role: 'eleve',
        etablissement_id,
        email: null,
        nom: eleveNom,
        prenom: elevePrenom,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_by: user.id,
        statut: 'en_attente',
        metadata: {
          eleve_id,
          educmaster: eleve.educmaster,
          type: 'eleve_invitation',
        },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ✅ CORRECTION: Utiliser la nouvelle table parent_eleve au lieu de parents_eleves
    const { data: parents, error: parentsError } = await supabaseAdmin
      .from('parent_eleve')
      .select(`
        parent_id,
        parents:parent_id (email_personnel, email_snet, telephone)
      `)
      .eq('eleve_id', eleve_id);

    if (parentsError) {
      console.error('Error fetching parents from parent_eleve:', parentsError);
    }

    // Envoyer les notifications aux parents
    if (parents && parents.length > 0) {
      for (const parentLink of parents) {
        const parent = parentLink.parents;
        const parentEmail = parent?.email_personnel || parent?.email_snet;
        
        if (!parentEmail) {
          console.log('Parent sans email, skip notification:', parentLink.parent_id);
          continue;
        }

        const baseUrl = Deno.env.get('APP_URL') ?? 'https://schoolnet.bj';
        const acceptUrl = `${baseUrl}/enfants/lier?code=${code}&educmaster=${eleve.educmaster}`;

        // Envoi d'email (via edge function notify)
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              email: parentEmail,
              type: 'invitation_eleve',
              subject: `Invitation à lier votre enfant ${elevePrenom} ${eleveNom}`,
              message: `Bonjour,\n\nL'établissement scolaire de votre enfant vous invite à lier ${elevePrenom} ${eleveNom} à votre compte parent.\n\nCode d'invitation : ${code}\nEducMaster : ${eleve.educmaster}\n\nLien : ${acceptUrl}\n\nCette invitation expire dans 7 jours.\n\nÀ bientôt sur SchoolNet !`,
            }),
          });
        } catch (notifyError) {
          console.error('Error sending notification:', notifyError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        code: invitation.code,
        expires_at: invitation.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-eleve-invitation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});