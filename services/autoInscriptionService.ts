/**
 * Service AutoInscription - Mode B
 * 
 * Gère les appels API pour les Edge Functions liées à l'auto-inscription
 * et la validation des demandes par l'admin
 */

import { supabase } from '@/lib/supabase';

// ============================================================
// TYPES
// ============================================================

export interface DemandeListe {
  id: string;
  educmaster: string;
  eleve_nom: string;
  eleve_prenom: string;
  eleve_sexe: 'M' | 'F' | null;
  eleve_date_naissance: string | null;
  classe_souhaitee: string | null;
  parent_nom: string;
  parent_prenom: string;
  parent_telephone: string;
  parent_email: string | null;
  parent_type_lien: string | null;
  code_etablissement: string;
  etablissement_id: string;
  etablissement_nom?: string;
  statut: 'pending' | 'accepted' | 'rejected';
  motif_refus: string | null;
  date_soumission: string;
  date_traitement: string | null;
  traite_par: string | null;
}

export interface ValiderDemandeData {
  demande_id: string;
  action: 'accept' | 'reject';
  motif?: string;
  classe_id?: string;
}

export interface ValiderDemandeResult {
  success: boolean;
  message?: string;
  error?: string;
  eleve_id?: string;
  identifiant_connexion?: string;
  mot_de_passe_temp?: string;
}

// ============================================================
// SERVICE
// ============================================================

/**
 * Récupérer toutes les demandes d'auto-inscription avec filtres
 */
export async function getDemandesAutoInscription(
  options?: {
    etablissement_id?: string;
    statut?: 'pending' | 'accepted' | 'rejected';
    limit?: number;
  }
): Promise<DemandeListe[]> {
  try {
    let query = supabase
      .from('demandes_auto_inscription')
      .select(`
        *,
        etablissements:etablissement_id (nom)
      `)
      .order('date_soumission', { ascending: false });
    
    if (options?.etablissement_id) {
      query = query.eq('etablissement_id', options.etablissement_id);
    }
    
    if (options?.statut) {
      query = query.eq('statut', options.statut);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      etablissement_nom: (item.etablissements as any)?.nom,
    })) as DemandeListe[];
  } catch (error) {
    console.error('Erreur getDemandesAutoInscription:', error);
    return [];
  }
}

/**
 * Récupérer une demande d'auto-inscription par son ID
 */
export async function getDemandeAutoInscriptionById(
  demandeId: string
): Promise<DemandeListe | null> {
  try {
    const { data, error } = await supabase
      .from('demandes_auto_inscription')
      .select(`
        *,
        etablissements:etablissement_id (id, nom)
      `)
      .eq('id', demandeId)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      etablissement_nom: (data.etablissements as any)?.nom,
    } as DemandeListe;
  } catch (error) {
    console.error('Erreur getDemandeAutoInscriptionById:', error);
    return null;
  }
}

/**
 * Valider (accepter ou refuser) une demande d'auto-inscription
 * Appel direct à l'Edge Function (sécurisé avec JWT)
 */
export async function validerDemandeAutoInscription(
  data: ValiderDemandeData
): Promise<ValiderDemandeResult> {
  try {
    // Récupérer la session pour le token JWT
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    
    if (!accessToken) {
      return { success: false, error: 'Non authentifié', message: 'Vous devez être connecté' };
    }
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                         process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         'https://dohqohgnnysbvykyruwy.supabase.co';
    
    const functionUrl = `${supabaseUrl}/functions/v1/validate-auto-inscription`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        demande_id: data.demande_id,
        action: data.action,
        motif: data.motif || null,
        classe_id: data.classe_id || null,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      return { success: false, message: result.error || 'Erreur lors de la validation' };
    }
    
    return {
      success: true,
      message: result.action === 'accept' 
        ? 'Demande acceptée avec succès. L\'élève a été créé.' 
        : 'Demande refusée avec succès.',
      eleve_id: result.eleve_id,
      identifiant_connexion: result.identifiant_connexion,
      mot_de_passe_temp: result.mot_de_passe_temp,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la validation';
    console.error('Erreur validerDemandeAutoInscription:', error);
    return { success: false, error: message, message };
  }
}

/**
 * Compter les demandes en attente pour un établissement
 */
export async function countDemandesEnAttente(
  etablissementId?: string
): Promise<number> {
  try {
    let query = supabase
      .from('demandes_auto_inscription')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'pending');
    
    if (etablissementId) {
      query = query.eq('etablissement_id', etablissementId);
    }
    
    const { count, error } = await query;
    
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Erreur countDemandesEnAttente:', error);
    return 0;
  }
}

// ============================================================
// INTÉGRATION GIPS - GESTION DES FACTURES
// ============================================================

/**
 * Récupérer la facture associée à une demande d'auto-inscription
 */
export async function getFactureByDemandeAutoInscription(
  demandeId: string
): Promise<{ id: string; numero_facture: string; montant_total: number; statut: string } | null> {
  try {
    // D'abord récupérer la demande pour avoir l'eleve_id
    const { data: demande, error: demandeError } = await supabase
      .from('demandes_auto_inscription')
      .select('eleve_id')
      .eq('id', demandeId)
      .single();
    
    if (demandeError || !demande?.eleve_id) {
      console.error('Erreur récupération demande pour facture:', demandeError);
      return null;
    }
    
    // Puis récupérer la facture
    const { data: facture, error } = await supabase
      .from('factures')
      .select('id, numero_facture, montant_total, statut')
      .eq('eleve_id', demande.eleve_id)
      .order('date_creation', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Erreur récupération facture:', error);
      return null;
    }
    
    return facture;
  } catch (error) {
    console.error('Erreur getFactureByDemandeAutoInscription:', error);
    return null;
  }
}

/**
 * Vérifier si une demande d'inscription a une facture payée
 */
export async function isDemandePayee(demandeId: string): Promise<boolean> {
  const facture = await getFactureByDemandeAutoInscription(demandeId);
  return facture?.statut === 'paye';
}

/**
 * Récupérer le montant total d'une facture pour une demande
 */
export async function getMontantFactureByDemande(
  demandeId: string
): Promise<number | null> {
  const facture = await getFactureByDemandeAutoInscription(demandeId);
  return facture?.montant_total || null;
}