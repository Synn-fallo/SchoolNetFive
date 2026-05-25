// /home/project/types/migration.types.ts
// Types pour la migration (indépendant → affilié)
// Correspondances, transfert, rapport
// ENRICHIE : Ajout des types pour les classes personnelles

// ============================================================
// TYPES DE BASE
// ============================================================

/**
 * Statut d'une correspondance
 */
export type CorrespondanceStatut = 'active' | 'historisee' | 'ignoree' | 'pending';

/**
 * Statut d'une évaluation lors du transfert
 */
export type EvaluationStatut = 'success' | 'partial' | 'failed';

/**
 * Type d'évaluation scolaire
 */
export type EvaluationType = 'interrogation' | 'devoir' | 'examen_blanc';

/**
 * Source d'une note ou d'un devoir
 */
export type SourceType = 'manuel' | 'transfert_independant' | 'import_csv';

// ============================================================
// ÉLÈVES
// ============================================================

/**
 * Élève dans l'espace personnel (indépendant)
 * Stocké dans classes_personnelles.eleves (JSONB)
 */
export interface ElevePersonnel {
  nom: string;
  prenom: string;
  matricule?: string;
  date_naissance?: string;
  notes?: Record<string, number>; // Évaluation ID → note
}

/**
 * Élève dans l'espace officiel (établissement)
 */
export interface EleveOfficiel {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  date_naissance?: string;
  classe_id: string;
  etablissement_id: string;
}

/**
 * Correspondance entre un élève personnel et un élève officiel
 */
export interface CorrespondanceEleve {
  id: string;
  classe_personnelle_id: string;
  eleve_personnel_nom: string;
  eleve_personnel_prenom: string;
  eleve_personnel_matricule?: string;
  eleve_officiel_id: string | null;
  enseignant_id: string;
  statut: CorrespondanceStatut;
  score?: number; // Score de correspondance (0-100) pour l'auto-match
  created_at: string;
  updated_at: string;
}

/**
 * Résultat de recherche de correspondance pour un élève
 */
export interface ResultatRechercheEleve {
  elevePersonnel: ElevePersonnel;
  correspondance: CorrespondanceEleve | null;
  suggestions: EleveOfficiel[];
  score: number;
}

// ============================================================
// CLASSES
// ============================================================

/**
 * Classe dans l'espace personnel (indépendant)
 * Alias vers ClassePersonnelle du fichier dédié
 */
export interface ClassePersonnelle {
  id: string;
  enseignant_id: string;
  nom: string;
  description: string | null;
  matieres: MatierePersonnelle[];
  eleves: ElevePersonnel[];
  created_at: string;
  updated_at: string;
}

/**
 * Matière dans l'espace personnel
 */
export interface MatierePersonnelle {
  nom: string;
  coefficient: number;
}

/**
 * Classe dans l'espace officiel (établissement)
 */
export interface ClasseOfficielle {
  id: string;
  nom: string;
  niveau: string;
  etablissement_id: string;
  annee_scolaire_id: string;
  is_active: boolean;
}

/**
 * Correspondance entre une classe personnelle et une classe officielle
 */
export interface CorrespondanceClasse {
  id: string;
  classe_personnelle_id: string;
  classe_officielle_id: string;
  enseignant_id: string;
  statut: CorrespondanceStatut;
  created_at: string;
  updated_at: string;
}

// ============================================================
// MATIÈRES
// ============================================================

/**
 * Matière dans l'espace officiel
 */
export interface MatiereOfficielle {
  id: string;
  nom: string;
  coefficient: number;
  etablissement_id: string;
  description?: string;
}

// ============================================================
// ÉVALUATIONS ET NOTES
// ============================================================

/**
 * Évaluation à transférer
 */
export interface EvaluationToTransfer {
  id: string;
  type: EvaluationType;
  titre: string;
  date: string;
  note_sur: number;
  coefficient: number;
  selected?: boolean;
}

/**
 * Note en cours de transfert
 */
export interface NoteTransfer {
  eleve_personnel_nom: string;
  eleve_personnel_prenom: string;
  eleve_officiel_id: string;
  note: number;
  appreciation?: string;
}

/**
 * Devoir officiel créé lors du transfert
 */
export interface DevoirTransfert {
  id: string;
  titre: string;
  type: EvaluationType;
  date_devoir: string;
  note_sur: number;
  coefficient: number;
  classe_id: string;
  matiere_id: string;
  enseignant_id: string;
  source: SourceType;
}

// ============================================================
// RAPPORT DE TRANSFERT
// ============================================================

/**
 * Détail du transfert pour une évaluation
 */
export interface RapportDetail {
  evaluation: string;
  statut: EvaluationStatut;
  message?: string;
  notes_count?: number;
  errors?: string[];
}

/**
 * Rapport complet de migration
 */
export interface MigrationRapport {
  success: boolean;
  evaluations_transferees: number;
  notes_transferees: number;
  notes_ecrasees: number;
  notes_ignorees: number;
  details: RapportDetail[];
  timestamp?: string;
}

// ============================================================
// HISTORIQUE
// ============================================================

/**
 * Historique des modifications de correspondances
 */
export interface HistoriqueCorrespondance {
  id: string;
  type: 'classe' | 'eleve' | 'matiere';
  reference_id?: string;
  ancienne_valeur: Record<string, unknown>;
  nouvelle_valeur: Record<string, unknown>;
  action: 'create' | 'update' | 'delete' | 'overwrite' | 'ignore';
  user_id: string;
  raison?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// CONFIGURATION DE MIGRATION
// ============================================================

/**
 * Configuration pour une session de migration
 */
export interface MigrationConfig {
  classe_personnelle_id: string;
  classe_officielle_id: string;
  matiere_officielle_id: string;
  evaluations_ids: string[];
}

/**
 * État d'une session de migration (pour UI)
 */
export interface MigrationSession {
  step: 'selection_classe' | 'correspondance_eleves' | 'selection_evaluations' | 'transfert' | 'rapport';
  config: Partial<MigrationConfig>;
  correspondances: CorrespondanceEleve[];
  evaluations: EvaluationToTransfer[];
  rapport: MigrationRapport | null;
  loading: boolean;
  error: string | null;
}

// ============================================================
// PARAMÈTRES DE FILTRAGE
// ============================================================

/**
 * Filtres pour la recherche de correspondance
 */
export interface CorrespondanceFilters {
  statut?: CorrespondanceStatut;
  recherche?: string;
  seulementNonCorrespondus?: boolean;
}

/**
 * Options pour la recherche automatique
 */
export interface AutoMatchOptions {
  seuilScore?: number; // Score minimum pour auto-validation (défaut: 85)
  ignorerMatricule?: boolean;
  ignorerDateNaissance?: boolean;
}

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

/**
 * Calcule le score de similarité entre deux chaînes
 * @param a - Première chaîne
 * @param b - Deuxième chaîne
 * @returns Score entre 0 et 100
 */
export function calculerSimilarite(a: string, b: string): number {
  const s1 = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const s2 = b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;
  
  // Distance de Levenshtein simplifiée
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Normalise une chaîne pour la comparaison
 */
export function normaliserChaine(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Vérifie si deux élèves correspondent (critères stricts)
 */
export function elevesCorrespondent(
  eleve1: ElevePersonnel,
  eleve2: EleveOfficiel
): boolean {
  // Critère 1 : Matricule identique
  if (eleve1.matricule && eleve2.matricule && eleve1.matricule === eleve2.matricule) {
    return true;
  }
  
  // Critère 2 : Nom + Prénom identiques (normalisés)
  if (normaliserChaine(eleve1.nom) === normaliserChaine(eleve2.nom) &&
      normaliserChaine(eleve1.prenom) === normaliserChaine(eleve2.prenom)) {
    return true;
  }
  
  // Critère 3 : Date de naissance identique
  if (eleve1.date_naissance && eleve2.date_naissance && 
      eleve1.date_naissance === eleve2.date_naissance) {
    return true;
  }
  
  return false;
}

/**
 * Formate un élève pour l'affichage
 */
export function formatEleve(eleve: ElevePersonnel | EleveOfficiel): string {
  if ('prenom' in eleve) {
    return `${eleve.prenom} ${eleve.nom}`;
  }
  return `${eleve.prenom} ${eleve.nom}`;
}

/**
 * Obtient le libellé d'un statut de correspondance
 */
export function getStatutCorrespondanceLabel(statut: CorrespondanceStatut): string {
  switch (statut) {
    case 'active': return 'Active';
    case 'historisee': return 'Historique';
    case 'ignoree': return 'Ignorée';
    case 'pending': return 'En attente';
    default: return 'Inconnu';
  }
}

/**
 * Obtient la couleur d'un statut de correspondance
 */
export function getStatutCorrespondanceColor(statut: CorrespondanceStatut): string {
  switch (statut) {
    case 'active': return '#10B981'; // Vert
    case 'historisee': return '#6B7280'; // Gris
    case 'ignoree': return '#EF4444'; // Rouge
    case 'pending': return '#F59E0B'; // Orange
    default: return '#6B7280';
  }
}

/**
 * Obtient le libellé d'un statut d'évaluation
 */
export function getEvaluationStatutLabel(statut: EvaluationStatut): string {
  switch (statut) {
    case 'success': return 'Succès';
    case 'partial': return 'Partiel';
    case 'failed': return 'Échec';
    default: return 'Inconnu';
  }
}

/**
 * Obtient la couleur d'un statut d'évaluation
 */
export function getEvaluationStatutColor(statut: EvaluationStatut): string {
  switch (statut) {
    case 'success': return '#10B981';
    case 'partial': return '#F59E0B';
    case 'failed': return '#EF4444';
    default: return '#6B7280';
  }
}