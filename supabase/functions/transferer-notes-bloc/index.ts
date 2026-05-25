// /home/project/supabase/functions/transferer-notes-bloc/index.ts
// Edge Function pour le transfert transactionnel des notes (indépendant → affilié)
// Transaction PostgreSQL : tout réussit ou tout échoue

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Evaluation {
  id: string;
  type: 'interrogation' | 'devoir';
  titre: string;
  date: string;
  note_sur: number;
  coefficient: number;
}

interface TransferRequest {
  classe_personnelle_id: string;
  classe_officielle_id: string;
  matiere_officielle_id: string;
  evaluations: Evaluation[];
}

interface NoteTransfer {
  eleve_officiel_id: string;
  note: number;
  appreciation?: string;
}

interface RapportDetail {
  evaluation: string;
  statut: 'success' | 'partial' | 'failed';
  message?: string;
}

serve(async (req) => {
  // Vérification de la méthode
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body: TransferRequest = await req.json()
    const {
      classe_personnelle_id,
      classe_officielle_id,
      matiere_officielle_id,
      evaluations
    } = body

    if (!classe_personnelle_id || !classe_officielle_id || !matiere_officielle_id || !evaluations?.length) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Paramètres manquants : classe_personnelle_id, classe_officielle_id, matiere_officielle_id, evaluations'
      }), { status: 400 })
    }

    // Initialisation du client Supabase avec les headers de la requête
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Récupérer l'utilisateur
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Utilisateur non authentifié' }), { status: 401 })
    }

    // Récupérer la classe personnelle avec ses élèves et matières
    const { data: classePerso, error: classePersoError } = await supabaseClient
      .from('classes_personnelles')
      .select('*')
      .eq('id', classe_personnelle_id)
      .eq('enseignant_id', user.id)
      .single()

    if (classePersoError || !classePerso) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Classe personnelle non trouvée ou non autorisée'
      }), { status: 404 })
    }

    // Récupérer la matière officielle
    const { data: matiereOfficielle, error: matiereError } = await supabaseClient
      .from('matieres')
      .select('*')
      .eq('id', matiere_officielle_id)
      .single()

    if (matiereError || !matiereOfficielle) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Matière officielle non trouvée'
      }), { status: 404 })
    }

    // Récupérer les correspondances des élèves
    const { data: correspondancesEleves, error: corrError } = await supabaseClient
      .from('correspondance_eleves')
      .select('*')
      .eq('classe_personnelle_id', classe_personnelle_id)
      .eq('statut', 'active')

    if (corrError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la récupération des correspondances élèves'
      }), { status: 500 })
    }

    // Créer un mapping élève personnel → élève officiel
    const eleveMapping = new Map<string, string>()
    for (const corr of correspondancesEleves) {
      const key = `${corr.eleve_personnel_nom}|${corr.eleve_personnel_prenom}`
      if (corr.eleve_officiel_id) {
        eleveMapping.set(key, corr.eleve_officiel_id)
      }
    }

    // Liste des élèves personnels (depuis JSONB)
    const elevesPersonnels: any[] = classePerso.eleves || []

    const rapport: {
      evaluations_transferees: number;
      notes_transferees: number;
      notes_ecrasees: number;
      notes_ignorees: number;
      details: RapportDetail[];
    } = {
      evaluations_transferees: 0,
      notes_transferees: 0,
      notes_ecrasees: 0,
      notes_ignorees: 0,
      details: []
    }

    // Transaction PostgreSQL : tout ou rien
    const { data: txResult, error: txError } = await supabaseClient.rpc('transferer_notes_transaction', {
      p_classe_personnelle_id: classe_personnelle_id,
      p_classe_officielle_id: classe_officielle_id,
      p_matiere_officielle_id: matiere_officielle_id,
      p_enseignant_id: user.id,
      p_evaluations: evaluations,
      p_eleves_personnels: elevesPersonnels,
      p_eleve_mapping: Object.fromEntries(eleveMapping)
    })

    if (txError) {
      console.error('Transaction error:', txError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la transaction',
        details: txError.message
      }), { status: 500 })
    }

    // Construire le rapport à partir du résultat de la transaction
    rapport.evaluations_transferees = txResult?.evaluations_transferees || 0
    rapport.notes_transferees = txResult?.notes_transferees || 0
    rapport.notes_ecrasees = txResult?.notes_ecrasees || 0
    rapport.notes_ignorees = txResult?.notes_ignorees || 0
    rapport.details = txResult?.details || []

    // Journaliser le transfert dans import_logs
    await supabaseClient
      .from('import_logs')
      .insert({
        user_id: user.id,
        type: 'transfert_independant_affilie',
        filename: `transfert_${classe_personnelle_id}_${new Date().toISOString()}`,
        rows_total: rapport.notes_transferees + rapport.notes_ignorees,
        rows_imported: rapport.notes_transferees,
        rows_skipped: rapport.notes_ignorees,
        status: rapport.notes_ignorees > 0 ? 'partial' : 'success',
        metadata: {
          classe_personnelle_id,
          classe_officielle_id,
          matiere_officielle_id,
          evaluations_count: evaluations.length
        }
      })

    return new Response(JSON.stringify({
      success: true,
      rapport
    }), { status: 200 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }), { status: 500 })
  }
})