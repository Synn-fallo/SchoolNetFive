// supabase/functions/reagir-annonce/index.ts
// Edge Function pour gérer les réactions sur les annonces
// ⚠️ Déployer avec JWT verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

type ReactionType = 'like' | 'participe' | 'question' | 'notify';

interface ReactionRequest {
  annonce_id: string;
  reaction: ReactionType;
  action: 'add' | 'remove';
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
    const { annonce_id, reaction, action } = body as ReactionRequest;

    if (!annonce_id || !reaction || !action) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: annonce_id, reaction, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['like', 'participe', 'question', 'notify'].includes(reaction)) {
      return new Response(
        JSON.stringify({ error: 'Réaction invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Vérifier que l'annonce existe et est publiée
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

    // 3. Ajouter ou supprimer la réaction
    if (action === 'add') {
      const { error: upsertError } = await supabaseAdmin
        .from('annonces_participants')
        .upsert({
          annonce_id,
          user_id: user.id,
          user_role: userRoleValue,
          reaction: reaction,
        }, {
          onConflict: 'annonce_id,user_id',
          ignoreDuplicates: false,
        });

      if (upsertError) throw upsertError;
    } else {
      const { error: deleteError } = await supabaseAdmin
        .from('annonces_participants')
        .delete()
        .eq('annonce_id', annonce_id)
        .eq('user_id', user.id)
        .eq('reaction', reaction);

      if (deleteError) throw deleteError;
    }

    // 4. Récupérer les compteurs mis à jour
    const { data: compteurs, error: countError } = await supabaseAdmin
      .from('annonces_participants')
      .select('reaction', { count: 'exact', head: false })
      .eq('annonce_id', annonce_id);

    const reactionCounts = {
      like: 0,
      participe: 0,
      question: 0,
      notify: 0,
    };

    if (compteurs) {
      compteurs.forEach(p => {
        if (p.reaction === 'like') reactionCounts.like++;
        else if (p.reaction === 'participe') reactionCounts.participe++;
        else if (p.reaction === 'question') reactionCounts.question++;
        else if (p.reaction === 'notify') reactionCounts.notify++;
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        reactionCounts,
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