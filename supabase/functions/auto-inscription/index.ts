// supabase/functions/auto-inscription/index.ts
// Edge Function pour l'auto-inscription (Mode B)
// Soumission d'une demande en attente de validation admin
// ⚠️ Déployer avec --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function normalizeTelephone(tel: string): string {
  if (!tel) return '';
  return tel.replace(/\D/g, '');
}

function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function isValidEducMaster(educmaster: string): boolean {
  if (!educmaster) return false;
  const cleaned = educmaster.replace(/\s/g, '');
  return /^\d{12}$/.test(cleaned) || /^\d{13}$/.test(cleaned);
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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

    const body = await req.json();
    const { code_etablissement, eleve, parent, session_id } = body;

    // ============================================================
    // VALIDATION DES CHAMPS OBLIGATOIRES
    // ============================================================

    if (!code_etablissement) {
      return new Response(
        JSON.stringify({ error: 'Code établissement requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!eleve || !eleve.educmaster || !eleve.nom || !eleve.prenom) {
      return new Response(
        JSON.stringify({ error: 'Informations élève incomplètes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!parent || !parent.nom || !parent.prenom || !parent.telephone) {
      return new Response(
        JSON.stringify({ error: 'Informations parent incomplètes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // VALIDATION EDUC MASTER
    // ============================================================

    if (!isValidEducMaster(eleve.educmaster)) {
      return new Response(
        JSON.stringify({ error: 'EducMaster invalide (12 chiffres requis)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const educmasterClean = eleve.educmaster.replace(/\s/g, '');

    // ============================================================
    // CRÉATION CLIENT SUPABASE
    // ============================================================

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
    // ÉTAPE 1: VÉRIFIER LE CODE ÉTABLISSEMENT
    // ============================================================

    const { data: etablissement, error: etabError } = await supabaseAdmin
      .from('etablissements')
      .select('id, nom, code_etablissement, ville, telephone, email')
      .eq('code_etablissement', code_etablissement.toUpperCase())
      .maybeSingle();

    if (etabError || !etablissement) {
      console.error('Erreur vérification établissement:', etabError);
      return new Response(
        JSON.stringify({ error: 'Code établissement invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // ÉTAPE 2: VÉRIFIER QUE L'EDUC MASTER N'EXISTE PAS DÉJÀ
    // ============================================================

    // 2.1 Vérifier dans la table eleves
    const { data: eleveExistant, error: eleveCheckError } = await supabaseAdmin
      .from('eleves')
      .select('id, user_id, educmaster, statut')
      .eq('educmaster', educmasterClean)
      .maybeSingle();

    if (eleveCheckError) {
      console.error('Erreur vérification EducMaster dans eleves:', eleveCheckError);
    }

    if (eleveExistant) {
      let message = `Cet élève existe déjà dans SchoolNet`;
      if (eleveExistant.statut === 'PENDING_ADMIN_VALIDATION') {
        message = 'Une demande est déjà en attente de validation pour cet élève';
      } else if (eleveExistant.statut === 'actif') {
        message = 'Cet élève est déjà inscrit dans un établissement';
      } else if (eleveExistant.statut === 'PRE_ACCEPTED') {
        message = 'Une demande a déjà été acceptée pour cet élève, en attente de paiement';
      }
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2.2 Vérifier dans la table des demandes (en attente)
    const { data: demandeExistant, error: demandeCheckError } = await supabaseAdmin
      .from('demandes_auto_inscription')
      .select('id, statut')
      .eq('educmaster', educmasterClean)
      .eq('statut', 'pending')
      .maybeSingle();

    if (demandeCheckError) {
      console.error('Erreur vérification demande existante:', demandeCheckError);
    }

    if (demandeExistant) {
      return new Response(
        JSON.stringify({ error: 'Une demande est déjà en attente de validation pour cet élève' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // ÉTAPE 3: AUTO-REMPLISSAGE (recherche dans la base)
    // ============================================================
    
    let autoFilled = false;
    let existingData = null;
    
    // Rechercher si l'EducMaster existe dans la base (élève peut-être dans un autre établissement)
    const { data: existingEleve, error: searchError } = await supabaseAdmin
      .from('eleves')
      .select('id, educmaster, date_naissance')
      .eq('educmaster', educmasterClean)
      .maybeSingle();
    
    if (!searchError && existingEleve) {
      // Récupérer le profil associé
      if (existingEleve.user_id) {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('nom, prenom, sexe, date_naissance')
          .eq('id', existingEleve.user_id)
          .maybeSingle();
        
        if (!profileError && profile) {
          autoFilled = true;
          existingData = {
            nom: profile.nom,
            prenom: profile.prenom,
            sexe: profile.sexe,
            date_naissance: profile.date_naissance || existingEleve.date_naissance
          };
        }
      }
    }

    // ============================================================
    // ÉTAPE 4: CRÉER LA DEMANDE
    // ============================================================

    const eleveNom = autoFilled && existingData?.nom ? existingData.nom : eleve.nom.toUpperCase();
    const elevePrenom = autoFilled && existingData?.prenom ? existingData.prenom : toTitleCase(eleve.prenom);
    const eleveSexe = autoFilled && existingData?.sexe ? existingData.sexe : (eleve.sexe || null);
    const eleveDateNaissance = autoFilled && existingData?.date_naissance ? existingData.date_naissance : (eleve.date_naissance || null);

    const { data: demande, error: insertError } = await supabaseAdmin
      .from('demandes_auto_inscription')
      .insert({
        educmaster: educmasterClean,
        eleve_nom: eleveNom,
        eleve_prenom: elevePrenom,
        eleve_sexe: eleveSexe,
        eleve_date_naissance: eleveDateNaissance,
        classe_souhaitee: eleve.classe_souhaitee || null,
        parent_nom: parent.nom.toUpperCase(),
        parent_prenom: toTitleCase(parent.prenom),
        parent_telephone: normalizeTelephone(parent.telephone),
        parent_email: parent.email_personnel ? normalizeEmail(parent.email_personnel) : null,
        parent_type_lien: parent.type_lien || 'autre',
        code_etablissement: code_etablissement.toUpperCase(),
        etablissement_id: etablissement.id,
        statut: 'pending',
        date_soumission: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur création demande:', insertError);
      return new Response(
        JSON.stringify({ error: `Erreur création demande: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // RÉPONSE AVEC INFOS POUR AUTO-REMPLISSAGE
    // ============================================================

    return new Response(
      JSON.stringify({
        success: true,
        demande_id: demande.id,
        auto_filled: autoFilled,
        existing_data: autoFilled ? existingData : null,
        message: 'Demande soumise avec succès. En attente de validation.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur non gérée:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});