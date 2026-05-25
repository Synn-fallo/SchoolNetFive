// /home/project/services/gipsService.ts
// Service pour interagir avec les tables GIPS (même base de données)
// Version adaptée à la structure réelle des tables

import { supabase } from '@/lib/supabase';
import { FactureInscriptionRequest, Facture, FactureStatut } from '@/types/gips.types';

/**
 * Créer une facture d'inscription
 * La facture est créée en base, GIPS la traitera pour générer le lien de paiement
 */
export async function creerFactureInscription(
  data: FactureInscriptionRequest
): Promise<Facture | null> {
  console.log('📄 [GIPS] Création facture pour:', data.matricule);
  
  // Générer un numéro de facture unique
  const now = new Date();
  const annee = now.getFullYear();
  const mois = String(now.getMonth() + 1).padStart(2, '0');
  
  // Compter les factures du mois pour le numéro séquentiel
  const debutMois = new Date(annee, now.getMonth(), 1).toISOString();
  const finMois = new Date(annee, now.getMonth() + 1, 1).toISOString();
  
  const { count, error: countError } = await supabase
    .from('factures')
    .select('id', { count: 'exact', head: true })
    .gte('date_creation', debutMois)
    .lt('date_creation', finMois);
  
  if (countError) {
    console.error('❌ [GIPS] Erreur comptage factures:', countError);
  }
  
  const sequentiel = String((count || 0) + 1).padStart(4, '0');
  const numeroFacture = `FAC-${annee}${mois}-${sequentiel}`;
  
  // Date d'échéance : 30 jours
  const dateEcheance = new Date();
  dateEcheance.setDate(dateEcheance.getDate() + 30);
  
  // Insérer la facture
  const { data: facture, error } = await supabase
    .from('factures')
    .insert({
      numero_facture: numeroFacture,
      matricule: data.matricule,
      eleve_id: data.eleve_id,
      etablissement_id: data.etablissement_id,
      niveau_id: data.niveau_id,
      serie_id: data.serie_id,
      option_id: data.option_id || null,
      montant_total: 25000, // TODO: calculer selon niveau/série
      statut: 'en_attente',
      date_creation: new Date().toISOString(),
      date_echeance: dateEcheance.toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ [GIPS] Erreur création facture:', error);
    return null;
  }
  
  console.log('✅ [GIPS] Facture créée:', numeroFacture);
  
  // Déclencher la notification à l'élève (via Edge Function)
  const { error: notifError } = await supabase.functions.invoke('send-notification', {
    body: {
      type: 'facture_creee',
      destinataires: { 
        email: data.email, 
        telephone: data.telephone 
      },
      variables: {
        eleve_nom: data.nom,
        eleve_prenom: data.prenom,
        numero_facture: numeroFacture,
        montant: 25000,
        lien_paiement: `/paiement/facture/${facture.id}`,
      },
    },
  });
  
  if (notifError) {
    console.error('❌ [GIPS] Erreur envoi notification:', notifError);
  }
  
  return facture;
}

/**
 * Vérifier le statut d'une facture
 */
export async function verifierStatutFacture(factureId: string): Promise<FactureStatut | null> {
  const { data: facture, error } = await supabase
    .from('factures')
    .select('id, numero_facture, montant_total, statut, date_paiement')
    .eq('id', factureId)
    .single();
  
  if (error) {
    console.error('❌ [GIPS] Erreur vérification:', error);
    return null;
  }
  
  // Calculer le montant payé à partir de la table paiements existante
  const { data: paiements, error: paiementsError } = await supabase
    .from('paiements')
    .select('montant')
    .eq('facture_id', factureId)
    .eq('statut', 'confirmed');
  
  if (paiementsError) {
    console.error('❌ [GIPS] Erreur récupération paiements:', paiementsError);
  }
  
  const montantPaye = paiements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;
  
  return {
    facture_id: facture.id,
    numero_facture: facture.numero_facture,
    montant_total: facture.montant_total,
    montant_paye: montantPaye,
    statut: facture.statut,
    est_reglee: montantPaye >= facture.montant_total,
  };
}

/**
 * Récupérer les factures impayées d'un élève
 */
export async function getFacturesImpayees(matricule: string): Promise<Facture[]> {
  const { data, error } = await supabase
    .from('factures')
    .select('*')
    .eq('matricule', matricule)
    .eq('statut', 'en_attente')
    .order('date_echeance', { ascending: true });
  
  if (error) {
    console.error('❌ [GIPS] Erreur récupération factures:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Récupérer une facture par son ID
 */
export async function getFactureById(factureId: string): Promise<Facture | null> {
  const { data, error } = await supabase
    .from('factures')
    .select('*')
    .eq('id', factureId)
    .single();
  
  if (error) {
    console.error('❌ [GIPS] Erreur récupération facture:', error);
    return null;
  }
  
  return data;
}

/**
 * Récupérer la facture associée à une demande d'inscription
 */
export async function getFactureByDemandeId(demandeId: string): Promise<Facture | null> {
  // Récupérer d'abord la demande pour avoir l'eleve_id
  const { data: demande, error: demandeError } = await supabase
    .from('demandes_auto_inscription')
    .select('eleve_id')
    .eq('id', demandeId)
    .single();
  
  if (demandeError || !demande?.eleve_id) {
    console.error('❌ [GIPS] Demande non trouvée:', demandeError);
    return null;
  }
  
  const { data: facture, error } = await supabase
    .from('factures')
    .select('*')
    .eq('eleve_id', demande.eleve_id)
    .order('date_creation', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('❌ [GIPS] Erreur récupération facture:', error);
    return null;
  }
  
  return facture;
}