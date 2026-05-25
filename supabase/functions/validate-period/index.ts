// /home/project/supabase/functions/validate-period/index.ts
// Edge Function: Validation massive d'une période (publiee → livree)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ValidatePeriodRequest {
  etablissement_id: string;
  annee_scolaire_id: string;
  periode: string; // 'S1', 'S2', 'T1', 'T2', 'T3'
}

serve(async (req) => {
  // Vérification de la méthode
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Vérification du token et du rôle
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Vérifier que l'utilisateur est chef d'établissement
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (rolesError || !roles?.some(r => r.role === 'chef_etablissement')) {
      return new Response(JSON.stringify({ error: 'Forbidden - Chef d\'établissement requis' }), { status: 403 });
    }

    // Récupération des paramètres
    const body: ValidatePeriodRequest = await req.json();
    const { etablissement_id, annee_scolaire_id, periode } = body;

    if (!etablissement_id || !annee_scolaire_id || !periode) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // 1. Vérifier qu'il n'y a pas de notes en attente
    const { count: pendingCount, error: countError } = await supabaseClient
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('etablissement_id', etablissement_id)
      .in('statut', ['en_attente', 'validee']);

    if (countError) {
      throw new Error(`Erreur lors de la vérification: ${countError.message}`);
    }

    if (pendingCount && pendingCount > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `${pendingCount} note(s) sont encore en attente ou non validées.`,
        pendingCount
      }), { status: 400 });
    }

    // 2. Compter les notes à valider
    const { count: toValidateCount, error: countValidateError } = await supabaseClient
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('etablissement_id', etablissement_id)
      .eq('statut', 'publiee');

    if (countValidateError) {
      throw new Error(`Erreur lors du comptage: ${countValidateError.message}`);
    }

    // 3. Mettre à jour les notes (publiee → livree)
    const { data: updatedNotes, error: updateError } = await supabaseClient
      .from('notes')
      .update({ 
        statut: 'livree', 
        date_livraison: new Date().toISOString(),
        validated_by: user.id
      })
      .eq('etablissement_id', etablissement_id)
      .eq('statut', 'publiee')
      .select('id');

    if (updateError) {
      throw new Error(`Erreur lors de la validation: ${updateError.message}`);
    }

    // 4. Mettre à jour la table periodes_validation
    const { error: periodError } = await supabaseClient
      .from('periodes_validation')
      .upsert({
        etablissement_id,
        annee_scolaire_id,
        periode,
        is_open: false,
        is_validated: true,
        validated_at: new Date().toISOString(),
        validated_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'etablissement_id, annee_scolaire_id, periode'
      });

    if (periodError) {
      console.error('Erreur mise à jour periodes_validation:', periodError);
      // Non bloquant
    }

    // 5. Envoyer des notifications aux enseignants concernés
    try {
      const { data: enseignants } = await supabaseClient
        .from('user_roles')
        .select('user_id')
        .eq('etablissement_id', etablissement_id)
        .eq('role', 'enseignant')
        .eq('is_active', true);

      if (enseignants && enseignants.length > 0) {
        const notifications = enseignants.map(e => ({
          user_id: e.user_id,
          titre: '✅ Période validée',
          contenu: `La période ${periode} a été validée par l'administration. Les notes sont désormais définitives.`,
          type: 'validation_periode',
          metadata: { periode, etablissement_id, annee_scolaire_id }
        }));

        await supabaseClient.from('notifications').insert(notifications);
      }
    } catch (notifError) {
      console.error('Erreur envoi notifications:', notifError);
      // Non bloquant
    }

    // 6. Journaliser l'action dans l'historique
    await supabaseClient.from('admin_logs').insert({
      user_id: user.id,
      action: 'validate_period',
      table_name: 'notes',
      metadata: {
        etablissement_id,
        annee_scolaire_id,
        periode,
        notes_updated: updatedNotes?.length || 0
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `${updatedNotes?.length || 0} note(s) ont été validées.`,
      validatedCount: updatedNotes?.length || 0,
      periode
    }), { status: 200 });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur interne'
    }), { status: 500 });
  }
});