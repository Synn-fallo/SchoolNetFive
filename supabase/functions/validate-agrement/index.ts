/**
 * VALIDATION D'AGRÉMENT PAR API EXTERNE
 * 
 * ⚠️ CE FICHIER EST OPTIONNEL ET ACTUELLEMENT DÉSACTIVÉ ⚠️
 * 
 * Pour activer cette fonction :
 * 1. Décommentez le code dans la fonction principale
 * 2. Configurez les variables d'environnement (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.)
 * 3. Déployez la fonction avec : supabase functions deploy validate-agrement
 * 
 * Cette fonction permet de vérifier l'authenticité d'un numéro d'agrément
 * auprès d'une API externe (ex: API du ministère de l'éducation).
 * 
 * Intégration avec process-institution-request :
 * - Dans process-institution-request, appeler cette fonction via fetch
 *   lorsque mode_verification === 'auto'
 * - Exemple d'appel :
 *   const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-agrement`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ numero_agrement: data.numero_agrement })
 *   });
 *   const { valid } = await response.json();
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Configuration de l'API externe (à remplacer par les vraies valeurs)
// Ces variables d'environnement devront être configurées dans Supabase
const EXTERNAL_API_URL = Deno.env.get('AGREMENT_API_URL') ?? '';
const EXTERNAL_API_KEY = Deno.env.get('AGREMENT_API_KEY') ?? '';
const EXTERNAL_API_ENABLED = Deno.env.get('AGREMENT_API_ENABLED') === 'true';

interface ValidateRequest {
  numero_agrement: string;
  etablissement_nom?: string; // Optionnel, pour vérification supplémentaire
}

interface ValidateResponse {
  valid: boolean;
  message?: string;
  details?: {
    etablissement_nom?: string;
    date_validite?: string;
    niveau?: string;
  };
}

/**
 * Fonction de validation locale (mock) – utilisée quand l'API externe n'est pas activée
 */
function validateLocally(numeroAgrement: string): { valid: boolean; message?: string } {
  // Règles de validation simples pour le test
  // En production avec API externe, cette fonction ne sera pas utilisée
  if (!numeroAgrement) {
    return { valid: false, message: 'Numéro d\'agrément manquant' };
  }
  
  // Format valide : commence par "AGRE-" ou "2024-" ou 6+ caractères alphanumériques
  const isValid = numeroAgrement.startsWith('AGRE-') || 
                  numeroAgrement.startsWith('2024-') ||
                  /^[A-Z0-9]{6,}$/.test(numeroAgrement);
  
  return {
    valid: isValid,
    message: isValid ? 'Agrément valide (validation locale)' : 'Format d\'agrément invalide',
  };
}

/**
 * Appel à l'API externe de vérification d'agrément
 */
async function validateWithExternalApi(numeroAgrement: string): Promise<{ valid: boolean; message?: string; details?: any }> {
  if (!EXTERNAL_API_URL) {
    console.warn('⚠️ API externe non configurée (AGREMENT_API_URL manquante)');
    return { valid: false, message: 'Service de validation externe non disponible' };
  }

  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXTERNAL_API_KEY}`,
      },
      body: JSON.stringify({ numero_agrement }),
    });

    if (!response.ok) {
      console.error('Erreur API externe:', response.status, response.statusText);
      return { valid: false, message: 'Erreur lors de la validation externe' };
    }

    const data = await response.json();
    
    // Adaptez selon le format de réponse de l'API externe
    return {
      valid: data.valid === true || data.status === 'active',
      message: data.message,
      details: data.details,
    };
  } catch (error) {
    console.error('Erreur appel API externe:', error);
    return { valid: false, message: 'Service de validation externe injoignable' };
  }
}

Deno.serve(async (req: Request) => {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // ============================================================
    // ⚠️ FONCTION ACTUELLEMENT DÉSACTIVÉE – ACTIVER SI BESOIN ⚠️
    // Pour activer, décommentez le code ci-dessous
    // ============================================================
    
    /*
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { numero_agrement, etablissement_nom }: ValidateRequest = await req.json();

    if (!numero_agrement) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Numéro d\'agrément requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Validation agrément: ${numero_agrement}`);

    let result: { valid: boolean; message?: string; details?: any };

    if (EXTERNAL_API_ENABLED && EXTERNAL_API_URL) {
      // Utiliser l'API externe
      result = await validateWithExternalApi(numero_agrement);
    } else {
      // Utiliser la validation locale (mock)
      result = validateLocally(numero_agrement);
    }

    // Journalisation de la tentative de validation
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'validate_agrement',
        table_name: 'demandes_etablissement',
        metadata: {
          numero_agrement,
          etablissement_nom,
          valid: result.valid,
          message: result.message,
          mode: EXTERNAL_API_ENABLED ? 'external' : 'local',
        },
      });

    console.log(`📊 Validation agrément ${numero_agrement}: ${result.valid ? '✅ VALIDE' : '❌ INVALIDE'}`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    */
    
    // ============================================================
    // RÉPONSE ACTUELLE (FONCTION DÉSACTIVÉE)
    // ============================================================
    
    return new Response(
      JSON.stringify({
        valid: true,
        message: 'Fonction désactivée – en mode maintenance. Pour activer, décommentez le code dans validate-agrement/index.ts',
        mode: 'disabled',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Erreur dans validate-agrement:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});