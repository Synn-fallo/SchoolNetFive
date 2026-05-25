// supabase/functions/proxy-educmaster-api/index.ts
// Edge Function pour appeler l'API externe du Ministère (EducMaster)
// ⚠️ Déployer avec: supabase functions deploy proxy-educmaster-api

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

interface ValidateRequest {
  educmaster: string;
}

interface ValidateResponse {
  success: boolean;
  data?: {
    nom: string;
    prenom: string;
    sexe?: 'M' | 'F';
    date_naissance?: string;
    lieu_naissance?: string;
  };
  error?: string;
  fromCache?: boolean;
}

/**
 * Appel à l'API externe du Ministère
 */
async function callExternalApi(educmaster: string, timeoutMs: number): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiUrl = Deno.env.get('EDUCMASTER_API_URL');
  const apiKey = Deno.env.get('EDUCMASTER_API_KEY');
  const isEnabled = Deno.env.get('EDUCMASTER_API_ENABLED') === 'true';

  if (!isEnabled) {
    return { success: false, error: 'API externe désactivée' };
  }

  if (!apiUrl) {
    console.warn('⚠️ API externe non configurée (EDUCMASTER_API_URL manquante)');
    return { success: false, error: 'API non configurée' };
  }

  // Créer un AbortController pour le timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey ? `Bearer ${apiKey}` : '',
      },
      body: JSON.stringify({ educmaster }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Erreur API externe:', response.status, response.statusText);
      return { success: false, error: `API retourne erreur ${response.status}` };
    }

    const data = await response.json();
    
    // Adapter selon le format de réponse de l'API externe
    return {
      success: true,
      data: {
        nom: data.nom || data.last_name,
        prenom: data.prenom || data.first_name,
        sexe: data.sexe === 'M' || data.gender === 'M' ? 'M' : (data.sexe === 'F' || data.gender === 'F' ? 'F' : undefined),
        date_naissance: data.date_naissance || data.birth_date,
        lieu_naissance: data.lieu_naissance || data.birth_place,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: `Timeout après ${timeoutMs}ms` };
    }
    console.error('Erreur appel API externe:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Récupérer depuis le cache
 */
async function getFromCache(supabaseAdmin: any, educmaster: string): Promise<{ data?: any; fromCache: boolean }> {
  const { data, error } = await supabaseAdmin
    .from('educmaster_cache')
    .select('*')
    .eq('educmaster', educmaster)
    .maybeSingle();

  if (error || !data) {
    return { fromCache: false };
  }

  // Vérifier si le cache a expiré
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { fromCache: false };
  }

  // Mettre à jour last_accessed
  await supabaseAdmin
    .from('educmaster_cache')
    .update({ last_accessed: new Date().toISOString() })
    .eq('educmaster', educmaster);

  return {
    data: {
      nom: data.nom,
      prenom: data.prenom,
      sexe: data.sexe,
      date_naissance: data.date_naissance,
      lieu_naissance: data.lieu_naissance,
    },
    fromCache: true,
  };
}

/**
 * Sauvegarder dans le cache
 */
async function saveToCache(supabaseAdmin: any, educmaster: string, data: any, ttlHours: number) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  await supabaseAdmin
    .from('educmaster_cache')
    .upsert({
      educmaster,
      nom: data.nom,
      prenom: data.prenom,
      sexe: data.sexe,
      date_naissance: data.date_naissance,
      lieu_naissance: data.lieu_naissance,
      source: 'api',
      last_updated: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });
}

/**
 * Journaliser l'appel API
 */
async function logApiCall(supabaseAdmin: any, educmaster: string, success: boolean, responseTimeMs: number, errorMessage?: string, sourceUsed?: string) {
  await supabaseAdmin
    .from('educmaster_api_logs')
    .insert({
      educmaster,
      success,
      response_time_ms: responseTimeMs,
      error_message: errorMessage,
      source_used: sourceUsed,
    });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { educmaster }: ValidateRequest = await req.json();

    if (!educmaster || educmaster.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'EducMaster requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Nettoyer l'EducMaster (garder uniquement les chiffres)
    const cleanedEducmaster = educmaster.replace(/\D/g, '');
    if (cleanedEducmaster.length < 10 || cleanedEducmaster.length > 20) {
      return new Response(
        JSON.stringify({ success: false, error: 'Format EducMaster invalide (10-20 chiffres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Récupérer la configuration
    const { data: config } = await supabaseAdmin
      .from('config_educmaster')
      .select('*')
      .maybeSingle();

    const cacheEnabled = config?.cache_enabled ?? true;
    const ttlHours = config?.cache_ttl_hours ?? 24;
    const apiEnabled = config?.api_enabled ?? false;
    const timeoutMs = config?.api_timeout_ms ?? 5000;

    // 1. Vérifier le cache
    if (cacheEnabled) {
      const cached = await getFromCache(supabaseAdmin, cleanedEducmaster);
      if (cached.fromCache && cached.data) {
        await logApiCall(supabaseAdmin, cleanedEducmaster, true, Date.now() - startTime, undefined, 'cache');
        return new Response(
          JSON.stringify({
            success: true,
            data: cached.data,
            fromCache: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Appeler l'API externe (si activée)
    if (apiEnabled) {
      const apiResult = await callExternalApi(cleanedEducmaster, timeoutMs);
      const responseTime = Date.now() - startTime;

      if (apiResult.success && apiResult.data) {
        // Sauvegarder dans le cache
        if (cacheEnabled) {
          await saveToCache(supabaseAdmin, cleanedEducmaster, apiResult.data, ttlHours);
        }
        await logApiCall(supabaseAdmin, cleanedEducmaster, true, responseTime, undefined, 'api');
        return new Response(
          JSON.stringify({
            success: true,
            data: apiResult.data,
            fromCache: false,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        await logApiCall(supabaseAdmin, cleanedEducmaster, false, responseTime, apiResult.error, 'api');
        // Retourner l'erreur (pas de fallback ici, l'appelant gère)
        return new Response(
          JSON.stringify({
            success: false,
            error: apiResult.error,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. API désactivée
    await logApiCall(supabaseAdmin, cleanedEducmaster, false, Date.now() - startTime, 'API désactivée', 'none');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Service de validation externe désactivé',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dans proxy-educmaster-api:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});