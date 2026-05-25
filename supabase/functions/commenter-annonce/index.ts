// supabase/functions/commenter-annonce/index.ts
// Edge Function pour ajouter un commentaire sur une annonce
// ⚠️ Déployer avec JWT verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

interface CommentaireRequest {
  annonce_id: string;
  contenu: string;
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
    const { annonce_id, contenu } = body as CommentaireRequest;

    if (!annonce_id || !contenu || contenu.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: annonce_id, contenu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Récupérer l'annonce
    const { data: annonce, error: annonceError } = await supabaseAdmin
      .from('annonces_institutionnelles')
      .select('commentaires_actifs, visibilite_commentaires, publie_par_id')
      .eq('id', annonce_id)
      .single();

    if (annonceError || !annonce) {
      return new Response(
        JSON.stringify({ error: 'Annonce non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!annonce.commentaires_actifs) {
      return new Response(
        JSON.stringify({ error: 'Les commentaires sont désactivés pour cette annonce' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Récupérer le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profil non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Récupérer le rôle de l'utilisateur
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const userRoleValue = userRole?.role || 'visiteur';

    // 4. Déterminer si le commentaire est masqué
    const estMasque = annonce.visibilite_commentaires === 'masques' && user.id !== annonce.publie_par_id;

    // 5. Insérer le commentaire
    const { data: commentaire, error: insertError } = await supabaseAdmin
      .from('annonces_commentaires')
      .insert({
        annonce_id,
        user_id: user.id,
        user_role: userRoleValue,
        contenu: contenu.trim(),
        est_masque: estMasque,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur insertion commentaire:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'ajout du commentaire' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Envoyer notification à l'émetteur (si ce n'est pas lui-même)
    if (user.id !== annonce.publie_par_id) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notifications-parent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            user_id: annonce.publie_par_id,
            type: 'NOUVEAU_COMMENTAIRE',
            data: {
              annonce_titre: annonce.titre,
              commentaire: contenu.substring(0, 100),
              commentateur: `${profile.prenom || ''} ${profile.nom || ''}`,
            },
            canal: 'IN_APP',
          }),
        });
      } catch (notifError) {
        console.warn('Erreur envoi notification:', notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        commentaire: {
          id: commentaire.id,
          contenu: commentaire.contenu,
          est_masque: commentaire.est_masque,
          created_at: commentaire.created_at,
        },
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