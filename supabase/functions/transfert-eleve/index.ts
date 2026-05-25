// supabase/functions/transfert-eleve/index.ts
// Edge Function pour le transfert d'un élève d'un établissement à un autre
// ⚠️ Déployer avec JWT verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

Deno.serve(async (req: Request) => {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier l'authentification via JWT
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

    // Vérifier l'utilisateur
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Erreur vérification utilisateur:', userError);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, eleve_id, etablissement_cible_id, transfert_id, accepte } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ============================================================
    // CAS 1: DEMANDE DE TRANSFERT (initiée par le parent)
    // ============================================================

    if (action === 'request') {
      if (!eleve_id || !etablissement_cible_id) {
        return new Response(
          JSON.stringify({ error: 'ID élève et établissement cible requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Vérifier que l'élève existe et est actif
      const { data: eleve, error: eleveError } = await supabaseAdmin
        .from('eleves')
        .select('*, etablissement_id, user_id')
        .eq('id', eleve_id)
        .single();

      if (eleveError || !eleve) {
        return new Response(
          JSON.stringify({ error: 'Élève non trouvé' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (eleve.statut !== 'actif' && eleve.statut !== 'CONFIRMED') {
        return new Response(
          JSON.stringify({ error: 'Seul un élève actif peut être transféré' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Vérifier que l'établissement cible existe et est actif
      const { data: etablissementCible, error: etabError } = await supabaseAdmin
        .from('etablissements')
        .select('id, nom, statut')
        .eq('id', etablissement_cible_id)
        .maybeSingle();

      if (etabError || !etablissementCible) {
        return new Response(
          JSON.stringify({ error: 'Établissement cible non trouvé' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Si établissement cible non actif → invitation
      if (etablissementCible.statut !== 'ACTIF') {
        return new Response(
          JSON.stringify({
            success: false,
            requires_invitation: true,
            message: 'Cet établissement n\'utilise pas encore SchoolNet. Contactez-le directement pour organiser le transfert.',
            etablissement_nom: etablissementCible.nom,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 4. Vérifier qu'il n'y a pas déjà une demande de transfert en cours
      const { data: transfertExistant, error: transfertCheckError } = await supabaseAdmin
        .from('demandes_transfert')
        .select('id, statut')
        .eq('eleve_id', eleve_id)
        .eq('statut', 'pending_origine')
        .maybeSingle();

      if (transfertCheckError) {
        console.error('Erreur vérification transfert existant:', transfertCheckError);
      }

      if (transfertExistant) {
        return new Response(
          JSON.stringify({ error: 'Une demande de transfert est déjà en cours pour cet élève' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 5. Créer la demande de transfert
      const { data: transfert, error: transfertError } = await supabaseAdmin
        .from('demandes_transfert')
        .insert({
          eleve_id: eleve_id,
          eleve_nom: eleve.nom,
          eleve_prenom: eleve.prenom,
          etablissement_origine_id: eleve.etablissement_id,
          etablissement_cible_id: etablissement_cible_id,
          statut: 'pending_origine',
          demande_par: user.id,
          date_demande: new Date().toISOString(),
        })
        .select()
        .single();

      if (transfertError) {
        console.error('Erreur création demande transfert:', transfertError);
        return new Response(
          JSON.stringify({ error: 'Erreur création demande de transfert' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          transfert_id: transfert.id,
          message: 'Demande de transfert envoyée. En attente de validation par l\'établissement d\'origine.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // CAS 2: VALIDATION PAR L'ÉTABLISSEMENT D'ORIGINE
    // ============================================================

    if (action === 'validate_origine') {
      if (!transfert_id || accepte === undefined) {
        return new Response(
          JSON.stringify({ error: 'ID transfert et acceptation requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Récupérer la demande
      const { data: transfert, error: transfertError } = await supabaseAdmin
        .from('demandes_transfert')
        .select('*, eleve_id, etablissement_cible_id')
        .eq('id', transfert_id)
        .single();

      if (transfertError || !transfert) {
        return new Response(
          JSON.stringify({ error: 'Demande de transfert non trouvée' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (transfert.statut !== 'pending_origine') {
        return new Response(
          JSON.stringify({ error: 'Cette demande a déjà été traitée' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!accepte) {
        // Refus du transfert
        await supabaseAdmin
          .from('demandes_transfert')
          .update({
            statut: 'refuse_origine',
            date_traitement: new Date().toISOString(),
            traite_par: user.id,
          })
          .eq('id', transfert_id);

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Transfert refusé par l\'établissement d\'origine',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Accepter le transfert (origine)
      await supabaseAdmin
        .from('demandes_transfert')
        .update({
          statut: 'accepte_origine',
          date_validation_origine: new Date().toISOString(),
          traite_par: user.id,
        })
        .eq('id', transfert_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transfert accepté par l\'établissement d\'origine. En attente de validation par l\'établissement d\'accueil.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // CAS 3: CONFIRMATION PAR L'ÉTABLISSEMENT D'ACCUEIL
    // ============================================================

    if (action === 'confirm_cible') {
      if (!transfert_id) {
        return new Response(
          JSON.stringify({ error: 'ID transfert requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Récupérer la demande
      const { data: transfert, error: transfertError } = await supabaseAdmin
        .from('demandes_transfert')
        .select('*, eleve_id, etablissement_cible_id')
        .eq('id', transfert_id)
        .single();

      if (transfertError || !transfert) {
        return new Response(
          JSON.stringify({ error: 'Demande de transfert non trouvée' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (transfert.statut !== 'accepte_origine') {
        return new Response(
          JSON.stringify({ error: 'Cette demande n\'est pas prête pour la confirmation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Mettre à jour l'élève vers le nouvel établissement
      const { error: updateError } = await supabaseAdmin
        .from('eleves')
        .update({
          etablissement_id: transfert.etablissement_cible_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transfert.eleve_id);

      if (updateError) {
        console.error('Erreur mise à jour élève:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors du transfert' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Marquer le transfert comme complété
      await supabaseAdmin
        .from('demandes_transfert')
        .update({
          statut: 'complete',
          date_completion: new Date().toISOString(),
          traite_par: user.id,
        })
        .eq('id', transfert_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Transfert complété avec succès.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // CAS 4: RÉCUPÉRER LES DEMANDES DE TRANSFERT POUR UN ÉTABLISSEMENT
    // ============================================================

    if (action === 'list') {
      const { etablissement_id, role_type } = body;

      if (!etablissement_id || !role_type) {
        return new Response(
          JSON.stringify({ error: 'ID établissement et type de rôle requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query = supabaseAdmin
        .from('demandes_transfert')
        .select('*, eleves:eleve_id (nom, prenom, educmaster)')
        .order('date_demande', { ascending: false });

      if (role_type === 'origine') {
        query = query.eq('etablissement_origine_id', etablissement_id);
      } else if (role_type === 'cible') {
        query = query.eq('etablissement_cible_id', etablissement_id);
      }

      const { data: transferts, error: listError } = await query;

      if (listError) {
        console.error('Erreur récupération transferts:', listError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la récupération' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          transferts: transferts || [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur non gérée:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});