// ============================================================
// TYPES: Parents et ParentEleve (multi-parents)
// Date: 2026-04-10
// ============================================================

/**
 * Type de lien parenté
 */
export type TypeLienParente = 'pere' | 'mere' | 'tuteur' | 'autre';

/**
 * Interface Parent (table parents)
 */
export interface Parent {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email_snet: string;
  email_personnel?: string | null;
  mot_de_passe_temp?: string | null;
  premiere_connexion: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Interface ParentEleve (table parent_eleve)
 */
export interface ParentEleve {
  id: string;
  parent_id: string;
  eleve_id: string;
  type_lien: TypeLienParente;
  est_principal: boolean;
  est_contact_urgence: boolean;
  autorisations?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Interface pour la création d'un parent
 */
export interface CreateParentData {
  nom: string;
  prenom: string;
  telephone: string;
  email_personnel?: string | null;
  type_lien: TypeLienParente;
  est_principal?: boolean;
  est_contact_urgence?: boolean;
}

/**
 * Interface pour la liaison parent-élève
 */
export interface LinkParentEleveData {
  parent_id: string;
  eleve_id: string;
  type_lien: TypeLienParente;
  est_principal?: boolean;
  est_contact_urgence?: boolean;
}

/**
 * Interface pour un parent avec ses informations étendues (pour affichage)
 */
export interface ParentWithDetails extends Parent {
  type_lien?: TypeLienParente;
  est_principal?: boolean;
  est_contact_urgence?: boolean;
  enfants?: Array<{
    eleve_id: string;
    nom: string;
    prenom: string;
    classe_nom?: string;
    etablissement_nom?: string;
  }>;
}

/**
 * Interface pour la vérification parent par prénom d'enfant
 */
export interface ParentVerificationResult {
  success: boolean;
  parent_id?: string;
  message?: string;
  tentatives_restantes?: number;
}

/**
 * Interface pour les initiales d'enfants (affichage confirmation)
 */
export interface EnfantInitiales {
  id: string;
  prenom: string;
  initiale_3_lettres: string;
  nom_initial: string;
  affichage: string; // ex: "Jea. G."
}

/**
 * Interface pour le résultat de vérification d'existence parent
 */
export interface ParentExistsResult {
  exists: boolean;
  parent?: ParentWithDetails;
  enfants_initiales?: EnfantInitiales[];
  nb_enfants?: number;
}