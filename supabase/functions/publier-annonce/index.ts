// supabase/functions/publier-annonce/index.ts
// Edge Function pour créer/modifier une annonce avec les nouveaux champs
// ⚠️ Déployer avec JWT verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

interface PublicationRequest {
  id?: string;
  titre: string;
  contenu: string;
  type: 'etablissement' | 'classe' | 'cycle' | 'promotion';
  visibilite: 'eleves' | 'parents' | 'enseignants' | 'tous';
  etablissement_id: string;
  classe_id?: string;
  cycle_id?: string;
  promotion_niveau?: string;
  est_publiee?: boolean;
  date_desactivation?: string;
  commentaires_actifs?: boolean;
  visibilite_commentaires?: 'masques' | 'visibles';
  afficher_accuse_lecture?: boolean;
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
    const {
      id,
      titre,
      contenu,
      type,
      visibilite,
      etablissement_id,
      classe_id,
      cycle_id,
      promotion_niveau,
      est_publiee = false,
      date_desactivation,
      commentaires_actifs = false,
      visibilite_commentaires = 'masques',
      afficher_accuse_lecture = false,
    } = body as PublicationRequest;

    if (!titre || !contenu || !type || !visibilite || !etablissement_id) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Récupérer le profil de l'utilisateur
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

    const annonceData = {
      titre,
      contenu,
      type,
      visibilite,
      etablissement_id,
      classe_id: classe_id || null,
      cycle_id: cycle_id || null,
      promotion_niveau: promotion_niveau || null,
      publie_par_id: profile.id,
      est_publiee,
      date_desactivation: date_desactivation || null,
      commentaires_actifs,
      visibilite_commentaires,
      afficher_accuse_lecture,
    };

    let result;
    let isNew = false;

    if (id) {
      // Mise à jour
      const { data, error } = await supabaseAdmin
        .from('annonces_institutionnelles')
        .update(annonceData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Création
      isNew = true;
      const { data, error } = await supabaseAdmin
        .from('annonces_institutionnelles')
        .insert(annonceData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Si publication et nouvelle annonce, envoyer les notifications
    if (isNew && est_publiee) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notifications-parent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            type: 'NOUVELLE_ANNONCE',
            data: {
              titre,
              contenu,
              visibilite,
              etablissement_id,
            },
            canal: 'BOTH',
          }),
        });
      } catch (notifError) {
        console.warn('Erreur envoi notification:', notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        annonce: result,
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