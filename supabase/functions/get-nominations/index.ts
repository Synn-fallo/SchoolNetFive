// supabase/functions/get-nominations/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
}

interface GetNominationsRequest {
  etablissementId: string
  type_admin?: string
  is_active?: boolean
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

  // 5. Vérifier que l'utilisateur est authentifié et est Chef
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Invalid or expired token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 6. Vérifier que l'utilisateur a le rôle chef_etablissement
  const { data: userRoles, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (roleError) {
    console.error('Role check error:', roleError)
    return new Response(
      JSON.stringify({ error: 'Failed to verify user role' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const isChef = userRoles?.some(r => r.role === 'chef_etablissement')
  if (!isChef) {
    return new Response(
      JSON.stringify({ error: 'Forbidden. Only chef_etablissement can access nominations.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 7. Récupérer les paramètres
  let requestBody: GetNominationsRequest
  try {
    requestBody = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { etablissementId, type_admin, is_active } = requestBody

  if (!etablissementId) {
    return new Response(
      JSON.stringify({ error: 'etablissementId is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 8. Récupérer les nominations
  try {
    let query = supabaseAdmin
      .from('user_roles')
      .select(`
        id,
        user_id,
        validated_at,
        validated_by,
        is_active,
        metadata
      `)
      .eq('etablissement_id', etablissementId)
      .eq('role', 'membre_administratif')

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active)
    }

    const { data, error } = await query

    if (error) throw error

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ nominations: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Récupérer les profils des utilisateurs
    const userIds = [...new Set(data.map(item => item.user_id))]
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, nom, prenom, email')
      .in('id', userIds)

    if (profilesError) throw profilesError

    const profileMap = new Map()
    profiles?.forEach(p => {
      profileMap.set(p.id, p)
    })

    // 10. Récupérer les noms des validateurs
    const validatorIds = [...new Set(data.map(item => item.validated_by).filter(Boolean))]
    let validatorNames: Record<string, string> = {}
    
    if (validatorIds.length > 0) {
      const { data: validators } = await supabaseAdmin
        .from('profiles')
        .select('id, nom, prenom')
        .in('id', validatorIds)
      
      if (validators) {
        validatorNames = validators.reduce((acc, v) => {
          acc[v.id] = `${v.prenom} ${v.nom}`
          return acc
        }, {} as Record<string, string>)
      }
    }

    // 11. Construire la réponse
    let nominations = data.map(item => {
      const profile = profileMap.get(item.user_id)
      return {
        id: item.id,
        user_id: item.user_id,
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        email: profile?.email || '',
        type_admin: item.metadata?.type_admin || 'unknown',
        fonction: item.metadata?.fonction,
        departement: item.metadata?.departement,
        justification: item.metadata?.justification,
        validated_at: item.validated_at,
        validated_by: item.validated_by,
        is_active: item.is_active,
        metadata: item.metadata,
        validated_by_name: validatorNames[item.validated_by] || '',
      }
    })

    // Filtrer par type_admin si demandé
    if (type_admin) {
      nominations = nominations.filter(n => n.type_admin === type_admin)
    }

    return new Response(
      JSON.stringify({ nominations }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error fetching nominations:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch nominations' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
