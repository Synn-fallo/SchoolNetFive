// /home/project/types/notes.types.ts
// Types partagés entre Workflow Enseignant et Vue Chef d'établissement
// ENRICHIE : Ajout des types pour évaluations et gestion des statuts

// ============================================================
// NOTE TERMINOLOGIQUE
// - "Évaluation" = terme métier (interface utilisateur)
// - "Devoir" = terme technique (table, code, API)
// - Les deux sont interchangeables dans le code
// ============================================================

// ============================================================
// TYPES DE BASE
// ============================================================

export type NoteStatus = 
  | 'en_attente' 
  | 'validee' 
  | 'publiee' 
  | 'livree' 
  | 'revisee' 
  | 'annulee';

export type Regime = 'semestre' | 'trimestre';

// export type Periode = 'S1' | 'S2' | 'T1' | 'T2' | 'T3';
export type PeriodeId = string;

export type EvaluationType = 'interrogation' | 'devoir' | 'examen_blanc';

export type DecisionConseil = 
  | 'passe_classe_superieure'
  | 'redouble_franchement'
  | 'redouble_cas_echec'
  | 'exclu_fin_cycle'
  | 'felicitations'
  | 'encouragement'
  | 'tableau_honneur';

export type AppreciationNote = 
  | 'exceptionnel'
  | 'saisissant'
  | 'assez_bien'
  | 'assidument'
  | 'indispensable'
  | 'faible'
  | 'insuffisant';

export type PlanAbonnement = 'essentiel' | 'premium' | 'prestige';

// ============================================================
// TYPES POUR ÉVALUATIONS (renommage de Devoir)
// ============================================================

export interface Evaluation {
  id: string;
  etablissement_id: string | null;
  classe_id: string | null;
  classe_personnelle_id: string | null;
  matiere_id: string;
  enseignant_id: string;
  type: EvaluationType;
  titre: string;
  description?: string;
  date_evaluation: string;
  note_sur: number;
  coefficient: number;
  periode_id: string;
  annee_scolaire_id: string;
  is_published: boolean;
  corrige_url?: string;
  created_at: string;
  updated_at: string;
}

// Garder Devoir pour compatibilité
export type Devoir = Evaluation;

// ============================================================
// INTERFACES PRINCIPALES
// ============================================================

export interface Subscription {
  id: string;
  etablissement_id: string;
  plan: PlanAbonnement;
  is_active: boolean;
  date_debut: string;
  telephone?: string;
  operateur?: 'mtn' | 'moov' | 'celtis';
  montant?: number;
  cycle?: 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  evaluation_id: string;
  eleve_id: string;
  etablissement_id: string;
  note: number;
  appreciation?: string;
  statut: NoteStatus;
  date_saisie: string;
  date_validation?: string;
  date_publication?: string;
  date_livraison?: string;
  created_by?: string;
  validated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteHistory {
  id: string;
  note_id: string;
  action: 'create' | 'update' | 'status_change' | 'validate' | 'deliver' | 'revise' | 'cancel';
  old_value?: number;
  new_value?: number;
  old_status?: NoteStatus;
  new_status?: NoteStatus;
  reason?: string;
  user_id: string;
  user_name: string;
  user_role: string;
  created_at: string;
}

export interface Matiere {
  id: string;
  etablissement_id: string;
  nom: string;
  code: string;
  coefficient: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Classe {
  id: string;
  etablissement_id: string;
  annee_scolaire_id?: string;
  nom: string;
  niveau: string;
  capacite: number;
  enseignant_principal_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassePersonnelle {
  id: string;
  enseignant_id: string;
  nom: string;
  description: string | null;
  matieres: Array<{ nom: string; coefficient: number }>;
  eleves: Array<{ nom: string; prenom: string; matricule?: string }>;
  created_at: string;
  updated_at: string;
}

export interface Eleve {
  id: string;
  user_id: string;
  etablissement_id: string;
  matricule: string;
  matricule_snet?: string;
  classe_id?: string;
  parent_id?: string;
  statut: 'actif' | 'inactif' | 'exclu' | 'diplome';
  created_at: string;
  updated_at: string;
}

// ============================================================
// STATISTIQUES ET AGGRÉGATIONS
// ============================================================

export interface ClasseStats {
  id: string;
  nom: string;
  niveau: string;
  effectif: number;
  moyenneGenerale: number;
  rang: number;
  tauxReussite: number;
  meilleureMoyenne: number;
  meilleureMoyenneEleve?: string;
  plusFaibleMoyenne: number;
  plusFaibleMoyenneEleve?: string;
}

export interface MatiereStats {
  id: string;
  nom: string;
  coefficient: number;
  moyenne: number;
  meilleureNote: number;
  meilleureNoteEleve?: string;
  plusFaibleNote: number;
  plusFaibleNoteEleve?: string;
  notesCount: number;
  tauxReussite: number;
}

export interface EleveWithMoyenne {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  matricule_snet?: string;
  moyenne: number;
  rang: number;
  appreciation: 'Excellent' | 'Bien' | 'Assez bien' | 'Passable' | 'Insuffisant';
  decisions?: DecisionConseil[];
  notesCount: number;
}

export interface NoteDetail {
  matiere: string;
  matiere_id: string;
  coefficient: number;
  moyenneInterrogations: number;
  devoir1: number;
  devoir2: number;
  moyenne: number;
  rang: number;
  appreciation: string;
  signatureProf: boolean;
}

// ============================================================
// PÉRIODES ET VALIDATION
// ============================================================

export interface PeriodeValidation {
  id: string;
  etablissement_id: string;
  annee_scolaire_id: string;
  periode: string;
  is_open: boolean;
  is_validated: boolean;
  validated_at?: string;
  validated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PeriodStatus {
  [key: string]: {
    isOpen: boolean;
    isValidated: boolean;
  };
}

// ============================================================
// ANNÉE SCOLAIRE
// ============================================================

export interface AnneeScolaire {
  id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ÉTABLISSEMENT (configuration notes)
// ============================================================

export interface EtablissementNotesConfig {
  id: string;
  nom: string;
  regime: Regime;
  is_subscribed: boolean;
  annee_scolaire_active_id: string;
  annee_scolaire_active_libelle?: string;
  subscription?: Subscription;
}

// ============================================================
// BULLETIN
// ============================================================

export interface BulletinData {
  id: string;
  eleveId: string;
  eleveNom: string;
  elevePrenom: string;
  matriculeEtablissement: string;
  matriculeSNET: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  sexe?: 'M' | 'F';
  classe: string;
  anneeScolaire: string;
  periode: string;
  regime: Regime;
  notes: NoteDetail[];
  moyenneGenerale: number;
  rang: number;
  plusForteMoyenne: { valeur: number; eleve: string };
  plusFaibleMoyenne: { valeur: number; eleve: string };
  decisions: DecisionConseil[];
  appreciationChef: string;
  appreciationPP?: string;
  dateEdition: string;
  qrCodeUrl: string;
  signatures: {
    professeurPrincipal?: boolean;
    chefEtablissement?: boolean;
    eleve?: boolean;
    parents?: boolean;
  };
}

// ============================================================
// ALERTES
// ============================================================

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  lien?: string;
  date: string;
}

// ============================================================
// PARAMÈTRES DE FILTRAGE
// ============================================================

export interface NotesFilters {
  annee_scolaire_id: string;
  periode_id: string;
  classe_id?: string;
  matiere_id?: string;
  statut?: NoteStatus;
  eleve_id?: string;
}

// ============================================================
// CONSTANTES UTILES
// ============================================================

export const VISIBLE_STATUSES_FOR_CHEF: NoteStatus[] = ['publiee', 'livree', 'revisee'];
export const CALCULABLE_STATUSES: NoteStatus[] = ['livree'];
export const ALL_STATUSES: NoteStatus[] = ['en_attente', 'validee', 'publiee', 'livree', 'revisee', 'annulee'];

export const getAppreciationFromNote = (note: number): AppreciationNote => {
  if (note >= 16) return 'exceptionnel';
  if (note >= 14) return 'saisissant';
  if (note >= 12) return 'assez_bien';
  if (note >= 10) return 'assidument';
  if (note >= 9.5) return 'indispensable';
  if (note >= 7.5) return 'faible';
  return 'insuffisant';
};

export const getMentionFromMoyenne = (moyenne: number): string => {
  if (moyenne >= 16) return 'Félicitations';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
};

export const getPlanLabel = (plan: PlanAbonnement): string => {
  switch (plan) {
    case 'essentiel': return 'Essentiel';
    case 'premium': return 'Premium';
    case 'prestige': return 'Prestige';
    default: return 'Inconnu';
  }
};

export const getEvaluationTypeLabel = (type: EvaluationType): string => {
  switch (type) {
    case 'interrogation': return 'Interrogation';
    case 'devoir': return 'Devoir';
    case 'examen_blanc': return 'Examen blanc';
    default: return type;
  }
};

export const getNoteStatusLabel = (status: NoteStatus): string => {
  switch (status) {
    case 'en_attente': return 'En attente';
    case 'validee': return 'Validée';
    case 'publiee': return 'Publiée';
    case 'livree': return 'Livrée';
    case 'revisee': return 'Révisée';
    case 'annulee': return 'Annulée';
    default: return status;
  }
};

export const getNoteStatusColor = (status: NoteStatus): string => {
  switch (status) {
    case 'en_attente': return '#F59E0B';
    case 'validee': return '#3B82F6';
    case 'publiee': return '#10B981';
    case 'livree': return '#059669';
    case 'revisee': return '#8B5CF6';
    case 'annulee': return '#EF4444';
    default: return '#6B7280';
  }
};