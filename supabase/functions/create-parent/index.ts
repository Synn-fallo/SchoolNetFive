// supabase/functions/create-parent/index.ts
// Edge Function pour créer un parent (compte auth + table parents)
// ⚠️ Déployer avec : supabase functions deploy create-parent --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function normaliserTelephone(tel: string): string {
  if (!tel) return '';
  return tel.replace(/[\s\-\.\(\)]/g, '');
}

function normaliserEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function genererEmailSnet(nom: string, prenom: string): string {
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
  };
  const nomNormalise = normalize(nom);
  const prenomNormalise = normalize(prenom);
  return `${prenomNormalise}.${nomNormalise}@snet.bj`;
}

function genererMotDePasseTemp(prenom: string): string {
  const chiffres = Math.floor(1000 + Math.random() * 9000);
  return `Parent${prenom}${chiffres}`;
}

async function getUniqueEmailSnet(
  supabaseAdmin: any,
  nom: string,
  prenom: string
): Promise<string> {
  let emailSnet = genererEmailSnet(nom, prenom);
  let suffixe = 1;
  let exists = true;
  
  while (exists && suffixe < 100) {
    const { data: check } = await supabaseAdmin
      .from('parents')
      .select('id')
      .eq('email_snet', emailSnet)
      .maybeSingle();
    
    if (!check) {
      exists = false;
    } else {
      emailSnet = genererEmailSnet(nom, prenom).replace('@snet.bj', `.${suffixe}@snet.bj`);
      suffixe++;
    }
  }
  
  return emailSnet;
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

Deno.serve(async (req: Request) => {
  // Gestion CORS pour preflight
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
    const {
      nom,
      prenom,
      telephone,
      email_personnel,
      etablissement_id,
    } = body;

    // Validation des champs obligatoires
    if (!nom || !prenom || !telephone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: nom, prenom, telephone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nomFormate = nom.toUpperCase();
    const prenomFormate = toTitleCase(prenom);
    const telephoneNormalise = normaliserTelephone(telephone);
    const emailPersonnelNormalise = email_personnel ? normaliserEmail(email_personnel) : null;

    // Initialiser le client Supabase avec service_role (droits admin)
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

    // Vérifier si un parent existe déjà avec ce téléphone (sécurité supplémentaire)
    const { data: existingParent, error: checkError } = await supabaseAdmin
      .from('parents')
      .select('id')
      .eq('telephone', telephoneNormalise)
      .maybeSingle();

    if (checkError) {
      console.error('Erreur vérification parent existant:', checkError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingParent) {
      return new Response(
        JSON.stringify({ error: 'Un parent avec ce numéro de téléphone existe déjà' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer un email SNET unique
    const emailSnet = await getUniqueEmailSnet(supabaseAdmin, nomFormate, prenomFormate);
    
    // Générer un mot de passe temporaire
    const motDePasseTemp = genererMotDePasseTemp(prenomFormate);

    // Créer l'utilisateur dans auth.users
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: emailSnet,
      password: motDePasseTemp,
      email_confirm: true,
      user_metadata: {
        nom: nomFormate,
        prenom: prenomFormate,
        role: 'parent',
        telephone: telephoneNormalise,
      },
    });

    if (createUserError) {
      console.error('Erreur création utilisateur parent:', createUserError);
      return new Response(
        JSON.stringify({ error: `Erreur création compte parent: ${createUserError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insérer le parent dans la table parents
    const { data: parentData, error: parentError } = await supabaseAdmin
      .from('parents')
      .insert({
        user_id: newUser.user.id,
        nom: nomFormate,
        prenom: prenomFormate,
        telephone: telephoneNormalise,
        email_snet: emailSnet,
        email_personnel: emailPersonnelNormalise,
        mot_de_passe_temp: motDePasseTemp,
        premiere_connexion: true,
        is_active: true,
      })
      .select()
      .single();

    if (parentError) {
      console.error('Erreur insertion parent:', parentError);
      // Rollback : supprimer l'utilisateur auth créé
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Erreur création parent: ${parentError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Parent créé avec succès:', parentData.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: parentData.id,
          user_id: parentData.user_id,
          nom: parentData.nom,
          prenom: parentData.prenom,
          telephone: parentData.telephone,
          email_snet: parentData.email_snet,
          email_personnel: parentData.email_personnel,
          mot_de_passe_temp: motDePasseTemp,
        },
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