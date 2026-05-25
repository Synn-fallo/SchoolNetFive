import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  inscription_id: string;
  montant: number;
  mode_paiement: 'especes' | 'virement' | 'mobile_money' | 'cheque';
  reference?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { inscription_id, montant, mode_paiement, reference }: PaymentRequest = await req.json();

    if (!inscription_id || !montant) {
      throw new Error('Missing required fields');
    }

    // Get inscription details
    const { data: inscription, error: inscriptionError } = await supabaseClient
      .from('inscriptions')
      .select('*, etablissement_id, montant_total, montant_paye')
      .eq('id', inscription_id)
      .single();

    if (inscriptionError || !inscription) {
      throw new Error('Inscription not found');
    }

    // Create payment
    const { data: paiement, error: paiementError } = await supabaseClient
      .from('paiements')
      .insert({
        inscription_id,
        etablissement_id: inscription.etablissement_id,
        montant,
        mode_paiement,
        reference,
        created_by: user.id,
      })
      .select()
      .single();

    if (paiementError) {
      throw paiementError;
    }

    // Update inscription
    const nouveauMontantPaye = Number(inscription.montant_paye) + Number(montant);
    const nouveauStatut =
      nouveauMontantPaye >= Number(inscription.montant_total)
        ? 'paye'
        : nouveauMontantPaye > 0
        ? 'partiel'
        : 'impaye';

    const { error: updateError } = await supabaseClient
      .from('inscriptions')
      .update({
        montant_paye: nouveauMontantPaye,
        statut: nouveauStatut,
      })
      .eq('id', inscription_id);

    if (updateError) {
      throw updateError;
    }

    // Create notification
    const { data: eleve } = await supabaseClient
      .from('eleves')
      .select('user_id, parent_id')
      .eq('id', inscription.eleve_id)
      .single();

    if (eleve) {
      // Notify student
      await supabaseClient.from('notifications').insert({
        user_id: eleve.user_id,
        etablissement_id: inscription.etablissement_id,
        titre: 'Paiement enregistré',
        contenu: `Un paiement de ${montant} FCFA a été enregistré pour votre inscription.`,
        type: 'paiement',
        data: { paiement_id: paiement.id },
      });

      // Notify parent if exists
      if (eleve.parent_id) {
        await supabaseClient.from('notifications').insert({
          user_id: eleve.parent_id,
          etablissement_id: inscription.etablissement_id,
          titre: 'Paiement enregistré',
          contenu: `Un paiement de ${montant} FCFA a été enregistré.`,
          type: 'paiement',
          data: { paiement_id: paiement.id },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paiement,
        nouveau_statut: nouveauStatut,
        montant_restant: Number(inscription.montant_total) - nouveauMontantPaye,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
