/**
 * Edge Function: check-plafond-ae
 * 
 * Vérifie si un Animateur d'Établissement (AE) peut inviter un nouvel enseignant
 * en fonction de son plafond
 * 
 * Endpoint: POST /functions/v1/check-plafond-ae
 * Body: {
 *   ae_id: string,
 *   departement: string,
 *   etablissement_id: string
 * }
 * 
 * Response: {
 *   allowed: boolean,
 *   current_count: number,
 *   plafond: number,
 *   remaining: number,
 *   message?: string
 * }
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CheckPlafondRequest {
  ae_id: string;
  departement: string;
  etablissement_id: string;
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

    const { ae_id, departement, etablissement_id }: CheckPlafondRequest = await req.json();

    if (!ae_id || !departement || !etablissement_id) {
      throw new Error('Missing required fields: ae_id, departement, etablissement_id');
    }

    // Vérifier que l'utilisateur connecté a le droit de vérifier le plafond
    // (doit être Chef, DE, ou l'AE lui-même)
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('etablissement_id', etablissement_id)
      .eq('is_active', true);

    const isAuthorized = user.id === ae_id || 
      userRoles?.some(r => r.role === 'chef_etablissement') ||
      userRoles?.some(r => r.role === 'membre_administratif');

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le plafond de l'AE
    const { data: delegation, error: delegationError } = await supabaseAdmin
      .from('delegations')
      .select('plafond')
      .eq('delegue_id', ae_id)
      .eq('type', 'ae')
      .eq('departement', departement)
      .eq('etablissement_id', etablissement_id)
      .eq('is_active', true)
      .maybeSingle();

    if (delegationError || !delegation) {
      return new Response(
        JSON.stringify({
          success: true,
          allowed: false,
          plafond: null,
          current_count: 0,
          remaining: 0,
          message: 'Aucune délégation trouvée pour cet AE dans ce département',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const plafond = delegation.plafond;

    // Compter les enseignants actuels dans le département
    const { data: enseignants, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('etablissement_id', etablissement_id)
      .eq('role', 'enseignant')
      .eq('is_active', true)
      .filter('metadata->>departement', 'eq', departement);

    if (countError) {
      console.error('Error counting teachers:', countError);
    }

    const currentCount = enseignants?.length || 0;
    const allowed = currentCount < plafond;
    const remaining = plafond - currentCount;

    return new Response(
      JSON.stringify({
        success: true,
        allowed,
        current_count: currentCount,
        plafond,
        remaining,
        message: allowed 
          ? `Vous pouvez inviter jusqu'à ${remaining} enseignant(s) supplémentaire(s)`
          : `Plafond atteint (${currentCount}/${plafond}). Contactez le Directeur des Études.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-plafond-ae:', error);
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