// supabase/functions/confirmer-presence/index.ts
// Edge Function pour confirmer sa présence à un événement
// ⚠️ Déployer avec JWT verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

interface ConfirmationRequest {
  annonce_id: string;
  confirme: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { annonce_id, confirme } = body as ConfirmationRequest;

    if (!annonce_id) {
      return new Response(
        JSON.stringify({ error: 'Paramètre manquant: annonce_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Vérifier que l'annonce existe
    const { data: annonce, error: annonceError } = await supabaseAdmin
      .from('annonces_institutionnelles')
      .select('id, est_publiee')
      .eq('id', annonce_id)
      .single();

    if (annonceError || !annonce) {
      return new Response(
        JSON.stringify({ error: 'Annonce non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!annonce.est_publiee) {
      return new Response(
        JSON.stringify({ error: 'Annonce non publiée' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Récupérer le rôle de l'utilisateur
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const userRoleValue = userRole?.role || 'visiteur';

    // 3. Mettre à jour ou insérer la confirmation
    const { error: upsertError } = await supabaseAdmin
      .from('annonces_participants')
      .upsert({
        annonce_id,
        user_id: user.id,
        user_role: userRoleValue,
        confirmation_presence: confirme,
      }, {
        onConflict: 'annonce_id,user_id',
      });

    if (upsertError) throw upsertError;

    // 4. Récupérer le nombre total de confirmations
    const { count: totalConfirmations, error: countError } = await supabaseAdmin
      .from('annonces_participants')
      .select('id', { count: 'exact', head: true })
      .eq('annonce_id', annonce_id)
      .eq('confirmation_presence', true);

    return new Response(
      JSON.stringify({
        success: true,
        message: confirme ? 'Présence confirmée' : 'Confirmation annulée',
        totalConfirmations: totalConfirmations || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});