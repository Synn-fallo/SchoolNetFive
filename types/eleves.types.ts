/**
 * Types pour la gestion des élèves
 * 
 * Ces types définissent la structure des données liées aux élèves,
 * parents et relations parent-élève dans l'application SchoolNet.
 */

// =====================================================
// TYPES ÉLÈVE
// =====================================================

export interface Eleve {
  id: string;
  user_id?: string;
  etablissement_id: string;
  educmaster?: string;
  identifiant_connexion?: string;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  classe_id?: string;
  classe_nom?: string;
  statut: 'actif' | 'inactif' | 'ACTIF_AVEC_CLASSE' | 'EN_ATTENTE_ACTIVATION';
  created_at: string;
  updated_at?: string;
  motDePasseTemp?: string;
  first_login?: boolean;
}

export interface CreateEleveData {
  etablissement_id: string;
  educmaster?: string;
  nom: string;
  prenom: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  classe_id?: string;
  matricule?: string;
  statut?: 'actif' | 'inactif' | 'ACTIF_AVEC_CLASSE';
}

export interface UpdateEleveData {
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  classe_id?: string;
  matricule?: string;
  statut?: 'actif' | 'inactif' | 'ACTIF_AVEC_CLASSE';
}

// =====================================================
// TYPES PARENT
// =====================================================

export interface Parent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  is_active?: boolean;
}

export interface CreateParentData {
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
}

// =====================================================
// TYPES LIEN PARENT-ÉLÈVE
// =====================================================

export type LienParente = 'pere' | 'mere' | 'tuteur' | 'autre';

export interface LienParental {
  id: string;
  parent_id: string;
  eleve_id: string;
  lien_parente: LienParente;
  est_principal: boolean;
  parent_nom: string;
  parent_prenom: string;
  parent_email: string;
  parent_telephone?: string;
  created_at?: string;
}

export interface CreateLienParentalData {
  parent_id: string;
  eleve_id: string;
  lien_parente: LienParente;
  est_principal?: boolean;
}

// =====================================================
// TYPES INVITATION ÉLÈVE
// =====================================================

export interface InvitationEleve {
  id: string;
  code: string;
  etablissement_id: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  educmaster?: string;
  expires_at: string;
  statut: 'en_attente' | 'acceptee' | 'expiree';
  created_at: string;
}

export interface CreateInvitationEleveData {
  eleve_id: string;
  etablissement_id: string;
}

// =====================================================
// TYPES FORMULAIRES
// =====================================================

export interface EleveFormData {
  educmaster?: string;
  nom: string;
  prenom: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  classe_id?: string;
  matricule?: string;
}

export interface ParentFormData {
  email?: string;
  nom: string;
  prenom: string;
  telephone?: string;
  lien_parente: LienParente;
}

// =====================================================
// TYPES RECHERCHE ET FILTRES
// =====================================================

export interface ElevesFiltres {
  classe_id?: string;
  statut?: 'actif' | 'inactif' | 'ACTIF_AVEC_CLASSE';
  search?: string;
  page?: number;
  limit?: number;
}

// =====================================================
// TYPES STATUTS
// =====================================================

export type StatutEleve = 'actif' | 'inactif' | 'ACTIF_AVEC_CLASSE' | 'EN_ATTENTE_ACTIVATION';
export type StatutInvitation = 'en_attente' | 'acceptee' | 'expiree';