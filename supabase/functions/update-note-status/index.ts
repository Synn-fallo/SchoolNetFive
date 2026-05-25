// ============================================================
// PHASE 2 – WORKFLOW ENSEIGNANT
// Edge Function : update-note-status
// Date : 2026-04-17
// Objectif :
//   1. Permettre à un enseignant de changer le statut d'une note
//   2. Vérifier que l'enseignant est responsable du devoir
//   3. Vérifier que la période est ouverte (is_open = true)
//   4. Respecter les transitions de statut autorisées
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types des statuts autorisés
type NoteStatus = 'en_attente' | 'validee' | 'publiee' | 'livree' | 'revisee' | 'annulee'

// Transitions autorisées
const ALLOWED_TRANSITIONS: Record<NoteStatus, NoteStatus[]> = {
  'en_attente': ['validee', 'annulee'],
  'validee': ['publiee', 'annulee'],
  'publiee': ['livree', 'revisee', 'annulee'],
  'livree': [], // Une fois livrée, plus de modification
  'revisee': ['publiee', 'livree', 'annulee'],
  'annulee': [] // Une fois annulée, plus de modification
}

serve(async (req) => {
  // Vérification de la méthode
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  // Extraction de l'ID depuis l'URL
  const url = new URL(req.url)
  const noteId = url.pathname.split('/').pop()
  
  if (!noteId) {
    return new Response(JSON.stringify({ error: 'Note ID is required' }), { status: 400 })
  }

  try {
    const { newStatus, reason } = await req.json()
    
    if (!newStatus || !ALLOWED_TRANSITIONS[newStatus as NoteStatus]) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 })
    }

    // Initialisation du client Supabase avec les headers de la requête
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Récupérer la note avec les infos du devoir et de la période
    const { data: note, error: noteError } = await supabaseClient
      .from('notes')
      .select(`
        id,
        statut,
        devoir:devoir_id (
          id,
          enseignant_id,
          periode_id,
          classe_id
        )
      `)
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: 'Note not found' }), { status: 404 })
    }

    // 2. Vérifier que l'enseignant est responsable du devoir
    const { data: { user } } = await supabaseClient.auth.getUser()
    
    if (!user || note.devoir.enseignant_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized: You are not the teacher responsible for this assignment' }), { status: 403 })
    }

    // 3. Vérifier que la période est ouverte (is_open = true)
    if (note.devoir.periode_id) {
      const { data: periodeValidation, error: periodeError } = await supabaseClient
        .from('periodes_validation')
        .select('is_open')
        .eq('periode_id', note.devoir.periode_id)
        .maybeSingle()

      if (periodeError) {
        console.error('Error checking period status:', periodeError)
      }
      
      if (periodeValidation && !periodeValidation.is_open) {
        return new Response(JSON.stringify({ 
          error: 'Period is closed. Cannot modify notes for this period.' 
        }), { status: 403 })
      }
    }

    // 4. Vérifier que la transition est autorisée
    const currentStatus = note.statut as NoteStatus
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus]
    
    if (!allowedNext.includes(newStatus as NoteStatus)) {
      return new Response(JSON.stringify({ 
        error: `Invalid transition from ${currentStatus} to ${newStatus}` 
      }), { status: 400 })
    }

    // 5. Mettre à jour la note (le trigger de la Phase 1 s'occupera des dates)
    const { data: updatedNote, error: updateError } = await supabaseClient
      .from('notes')
      .update({ 
        statut: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select()
      .single()

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 })
    }

    // 6. Journaliser le changement (optionnel, pour traçabilité)
    await supabaseClient
      .from('note_history')
      .insert({
        note_id: noteId,
        old_status: currentStatus,
        new_status: newStatus,
        reason: reason || null,
        user_id: user.id,
        user_role: 'enseignant'
      })
      .catch(err => console.error('Failed to log history:', err))

    return new Response(JSON.stringify({ 
      success: true, 
      note: updatedNote,
      message: `Status updated from ${currentStatus} to ${newStatus}`
    }), { status: 200 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
})