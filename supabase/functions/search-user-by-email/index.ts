// supabase/functions/search-user-by-email/index.ts
// Version avec CORS corrigé

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
}

interface SearchRequest {
  email: string
}

serve(async (req) => {
  // 1. Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 2. Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 3. Récupérer le token d'authentification
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const token = authHeader.replace('Bearer ', '')

  // 4. Initialiser le client Supabase avec la clé service_role
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  // 5. Vérifier que l'utilisateur est authentifié
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Invalid or expired token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 6. Récupérer l'email depuis le corps de la requête
  let requestBody: SearchRequest
  try {
    requestBody = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { email } = requestBody

  if (!email || !email.trim()) {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 7. Rechercher l'utilisateur dans auth.users
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

  if (authError) {
    console.error('Auth error:', authError)
    return new Response(
      JSON.stringify({ error: 'Failed to search users' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const foundAuthUser = authUsers.users.find(u => u.email === email.trim().toLowerCase())

  if (!foundAuthUser) {
    return new Response(
      JSON.stringify({ found: false, user: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 8. Récupérer le profil associé
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, nom, prenom, telephone')
    .eq('id', foundAuthUser.id)
    .maybeSingle()

  if (profileError) {
    console.error('Profile error:', profileError)
  }

  // 9. Retourner les informations
  return new Response(
    JSON.stringify({
      found: true,
      user: {
        id: foundAuthUser.id,
        email: foundAuthUser.email,
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        telephone: profile?.telephone || null
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
