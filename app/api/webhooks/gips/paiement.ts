// /home/project/app/api/webhooks/gips/paiement.ts
// Endpoint pour recevoir les webhooks de confirmation de paiement de GIPS
// URL: https://schoolnet.bj/api/webhooks/gips/paiement

import { supabase } from '@/lib/supabase';
import { PaiementWebhookPayload } from '@/types/gips.types';

// Configuration (à placer dans .env)
const WEBHOOK_SECRET = process.env.GIPS_WEBHOOK_SECRET || 'dev-secret-key';

/**
 * Vérifie la signature du webhook (optionnel mais recommandé)
 */
function verifierSignature(payload: string, signature: string | null): boolean {
  // En développement, on accepte tout
  if (process.env.NODE_ENV !== 'production') return true;
  
  if (!signature) return false;
  
  // Implémenter la vérification HMAC selon la méthode choisie par GIPS
  // Exemple avec HMAC-SHA256
  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Met à jour le statut d'un élève après paiement confirmé
 */
async function mettreAJourStatutEleve(matricule: string): Promise<boolean> {
  // Vérifier que l'élève existe et est en statut PRE_ACCEPTED
  const { data: eleve, error: findError } = await supabase
    .from('eleves')
    .select('id, statut')
    .eq('matricule', matricule)
    .single();
  
  if (findError || !eleve) {
    console.error('❌ Élève non trouvé:', matricule);
    return false;
  }
  
  if (eleve.statut !== 'PRE_ACCEPTED') {
    console.log(`ℹ️ Élève ${matricule} déjà en statut ${eleve.statut}, ignoré`);
    return true;
  }
  
  // Mettre à jour le statut
  const { error: updateError } = await supabase
    .from('eleves')
    .update({ 
      statut: 'actif',
      updated_at: new Date().toISOString(),
    })
    .eq('matricule', matricule);
  
  if (updateError) {
    console.error('❌ Erreur mise à jour statut:', updateError);
    return false;
  }
  
  console.log(`✅ Élève ${matricule} est maintenant actif`);
  return true;
}

/**
 * Enregistre le paiement dans la base
 */
async function enregistrerPaiement(payload: PaiementWebhookPayload): Promise<boolean> {
  const { error } = await supabase
    .from('paiements')
    .insert({
      facture_id: payload.facture_id,
      numero_facture: payload.numero_facture,
      matricule: payload.matricule,
      montant: payload.montant,
      mode_paiement: payload.mode_paiement,
      operateur: payload.operateur,
      reference_transaction: payload.reference_transaction,
      date_paiement: payload.date_paiement,
      statut: payload.statut,
    });
  
  if (error) {
    console.error('❌ Erreur enregistrement paiement:', error);
    return false;
  }
  
  return true;
}

/**
 * Handler principal du webhook
 */
export async function POST(request: Request) {
  console.log('🔔 [WEBHOOK] Réception webhook GIPS');
  
  try {
    // 1. Récupérer le payload
    const rawBody = await request.text();
    const payload: PaiementWebhookPayload = JSON.parse(rawBody);
    
    // 2. Vérifier la signature
    const signature = request.headers.get('x-webhook-signature');
    if (!verifierSignature(rawBody, signature)) {
      console.error('❌ Signature invalide');
      return new Response(
        JSON.stringify({ error: 'Signature invalide' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Traiter selon l'événement
    switch (payload.evenement) {
      case 'paiement.confirmed':
        // Enregistrer le paiement
        await enregistrerPaiement(payload);
        
        // Mettre à jour le statut de l'élève
        const success = await mettreAJourStatutEleve(payload.matricule);
        
        if (success) {
          console.log(`✅ Paiement confirmé pour ${payload.matricule}`);
        }
        break;
        
      case 'paiement.failed':
        console.log(`⚠️ Paiement échoué pour ${payload.matricule}: ${payload.motif_echec}`);
        break;
        
      case 'facture.expiree':
        console.log(`⏰ Facture expirée: ${payload.numero_facture}`);
        break;
        
      default:
        console.log(`ℹ️ Événement non géré: ${payload.evenement}`);
    }
    
    // 4. Répondre à GIPS
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook reçu avec succès',
        received_at: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erreur traitement webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Support OPTIONS pour CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-webhook-signature',
    },
  });
}