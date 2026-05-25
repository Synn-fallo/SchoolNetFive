// /home/project/services/transfertService.ts
// Service pour la gestion des transferts d'élèves

import { supabase } from '@/lib/supabase';

export interface DemandeTransfert {
  id: string;
  eleve_id: string;
  eleve_nom?: string;
  eleve_prenom?: string;
  educmaster?: string;
  etablissement_origine_id: string;
  etablissement_cible_id: string;
  etablissement_origine_nom?: string;
  etablissement_cible_nom?: string;
  statut: 'pending_origine' | 'accepte_origine' | 'refuse_origine' | 'complete';
  demande_par: string;
  date_demande: string;
  date_validation_origine?: string;
  date_completion?: string;
  traite_par?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransfertResult {
  success: boolean;
  transfert_id?: string;
  message?: string;
  error?: string;
  requires_invitation?: boolean;
  etablissement_nom?: string;
}

/**
 * Demander le transfert d'un élève vers un autre établissement
 */
export async function demanderTransfert(
  eleveId: string,
  etablissementCibleId: string
): Promise<TransfertResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    
    if (!accessToken) {
      return { success: false, error: 'Non authentifié' };
    }
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                         process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         'https://dohqohgnnysbvykyruwy.supabase.co';
    
    const functionUrl = `${supabaseUrl}/functions/v1/transfert-eleve`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'request',
        eleve_id: eleveId,
        etablissement_cible_id: etablissementCibleId,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Erreur lors de la demande' };
    }
    
    return result;
  } catch (error) {
    console.error('Erreur demanderTransfert:', error);
    return { success: false, error: 'Erreur réseau' };
  }
}

/**
 * Valider le transfert par l'établissement d'origine
 */
export async function validerTransfertOrigine(
  transfertId: string,
  accepte: boolean
): Promise<TransfertResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    
    if (!accessToken) {
      return { success: false, error: 'Non authentifié' };
    }
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                         process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         'https://dohqohgnnysbvykyruwy.supabase.co';
    
    const functionUrl = `${supabaseUrl}/functions/v1/transfert-eleve`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'validate_origine',
        transfert_id: transfertId,
        accepte: accepte,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Erreur lors de la validation' };
    }
    
    return result;
  } catch (error) {
    console.error('Erreur validerTransfertOrigine:', error);
    return { success: false, error: 'Erreur réseau' };
  }
}

/**
 * Confirmer le transfert par l'établissement d'accueil
 */
export async function confirmerTransfertCible(
  transfertId: string
): Promise<TransfertResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    
    if (!accessToken) {
      return { success: false, error: 'Non authentifié' };
    }
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                         process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         'https://dohqohgnnysbvykyruwy.supabase.co';
    
    const functionUrl = `${supabaseUrl}/functions/v1/transfert-eleve`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'confirm_cible',
        transfert_id: transfertId,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Erreur lors de la confirmation' };
    }
    
    return result;
  } catch (error) {
    console.error('Erreur confirmerTransfertCible:', error);
    return { success: false, error: 'Erreur réseau' };
  }
}

/**
 * Récupérer les demandes de transfert pour un établissement
 */
export async function getDemandesTransfert(
  etablissementId: string,
  roleType: 'origine' | 'cible'
): Promise<DemandeTransfert[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    
    if (!accessToken) {
      return [];
    }
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                         process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         'https://dohqohgnnysbvykyruwy.supabase.co';
    
    const functionUrl = `${supabaseUrl}/functions/v1/transfert-eleve`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'list',
        etablissement_id: etablissementId,
        role_type: roleType,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      return [];
    }
    
    return result.transferts || [];
  } catch (error) {
    console.error('Erreur getDemandesTransfert:', error);
    return [];
  }
}

/**
 * Vérifier si un élève a une demande de transfert en cours
 */
export async function hasTransfertEnCours(eleveId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('demandes_transfert')
      .select('id')
      .eq('eleve_id', eleveId)
      .in('statut', ['pending_origine', 'accepte_origine'])
      .maybeSingle();
    
    if (error) {
      console.error('Erreur vérification transfert:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Erreur hasTransfertEnCours:', error);
    return false;
  }
}

/**
 * Récupérer l'historique des transferts d'un élève
 */
export async function getHistoriqueTransferts(eleveId: string): Promise<DemandeTransfert[]> {
  try {
    const { data, error } = await supabase
      .from('demandes_transfert')
      .select('*')
      .eq('eleve_id', eleveId)
      .order('date_demande', { ascending: false });
    
    if (error) {
      console.error('Erreur récupération historique:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erreur getHistoriqueTransferts:', error);
    return [];
  }
}