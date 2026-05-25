// /home/project/types/gips.types.ts
// Types partagés entre auto-inscription et GIPS (même base de données)

/**
 * Demande de création de facture (appel interne)
 */
export interface FactureInscriptionRequest {
  eleve_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  niveau_id: string;
  niveau_nom: string;
  serie_id: string;
  serie_nom: string;
  option_id?: string;
  option_nom?: string;
  email: string;
  telephone: string;
  etablissement_id: string;
  etablissement_nom: string;
  date_inscription: string;
}

/**
 * Facture (structure table)
 */
export interface Facture {
  id: string;
  numero_facture: string;
  matricule: string;
  eleve_id: string;
  etablissement_id: string;
  niveau_id: string;
  serie_id: string;
  option_id?: string;
  montant_total: number;
  statut: 'en_attente' | 'paye' | 'expire' | 'annule';
  lien_paiement?: string;
  date_creation: string;
  date_echeance: string;
  date_paiement?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Paiement (structure table)
 */
export interface Paiement {
  id: string;
  facture_id: string;
  numero_facture: string;
  matricule: string;
  montant: number;
  mode_paiement: 'mobile_money' | 'especes' | 'cheque' | 'virement';
  operateur?: 'MTN' | 'Moov';
  reference_transaction: string;
  date_paiement: string;
  statut: 'confirmed' | 'failed' | 'pending';
  created_at: string;
}

/**
 * Statut d'une facture
 */
export interface FactureStatut {
  facture_id: string;
  numero_facture: string;
  montant_total: number;
  montant_paye: number;
  statut: 'en_attente' | 'paye' | 'expire' | 'annule';
  est_reglee: boolean;
}