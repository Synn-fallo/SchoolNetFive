// /home/project/utils/notesUtils.ts
// Utilitaires pour la gestion des notes et évaluations

import { NoteStatus, EvaluationType, getNoteStatusLabel, getEvaluationTypeLabel } from '@/types/notes.types';

// ============================================================
// FONCTIONS DE CALCUL
// ============================================================

/**
 * Calcule la moyenne d'une liste de notes
 * @param notes - Liste des notes
 * @returns Moyenne arrondie à 2 décimales
 */
export function calculerMoyenne(notes: number[]): number {
  if (notes.length === 0) return 0;
  const somme = notes.reduce((acc, note) => acc + note, 0);
  return Math.round((somme / notes.length) * 100) / 100;
}

/**
 * Calcule la moyenne pondérée (avec coefficients)
 * @param notes - Liste des notes
 * @param coefficients - Liste des coefficients correspondants
 * @returns Moyenne pondérée arrondie à 2 décimales
 */
export function calculerMoyennePonderée(notes: number[], coefficients: number[]): number {
  if (notes.length === 0 || notes.length !== coefficients.length) return 0;
  
  let sommeNotes = 0;
  let sommeCoeffs = 0;
  
  for (let i = 0; i < notes.length; i++) {
    sommeNotes += notes[i] * coefficients[i];
    sommeCoeffs += coefficients[i];
  }
  
  if (sommeCoeffs === 0) return 0;
  return Math.round((sommeNotes / sommeCoeffs) * 100) / 100;
}

/**
 * Calcule la moyenne des interrogations
 * @param notesInterrogations - Liste des notes d'interrogations
 * @returns Moyenne des interrogations
 */
export function calculerMoyenneInterrogations(notesInterrogations: number[]): number {
  return calculerMoyenne(notesInterrogations);
}

/**
 * Calcule la moyenne d'une matière selon la formule
 * Moyenne matière = (Moyenne_interrogations + Somme_des_devoirs) / (1 + Nombre_de_devoirs)
 * @param moyenneInterrogations - Moyenne des interrogations
 * @param notesDevoirs - Liste des notes de devoirs
 * @returns Moyenne de la matière
 */
export function calculerMoyenneMatiere(moyenneInterrogations: number, notesDevoirs: number[]): number {
  if (notesDevoirs.length === 0) return moyenneInterrogations;
  
  const sommeDevoirs = notesDevoirs.reduce((acc, note) => acc + note, 0);
  const result = (moyenneInterrogations + sommeDevoirs) / (1 + notesDevoirs.length);
  return Math.round(result * 100) / 100;
}

/**
 * Calcule la moyenne d'une période
 * @param moyennesCoefficientees - Liste des moyennes coefficientées par matière
 * @param totalCoefficients - Somme des coefficients
 * @returns Moyenne de la période
 */
export function calculerMoyennePeriode(moyennesCoefficientees: number[], totalCoefficients: number): number {
  if (totalCoefficients === 0 || moyennesCoefficientees.length === 0) return 0;
  const somme = moyennesCoefficientees.reduce((acc, val) => acc + val, 0);
  return Math.round((somme / totalCoefficients) * 100) / 100;
}

// ============================================================
// FONCTIONS DE STATUT
// ============================================================

/**
 * Vérifie si une transition de statut est autorisée
 * @param currentStatus - Statut actuel
 * @param newStatus - Nouveau statut souhaité
 * @param isAffiliated - L'enseignant est-il affilié ?
 * @returns true si la transition est autorisée
 */
export function isStatusTransitionAllowed(
  currentStatus: NoteStatus,
  newStatus: NoteStatus,
  isAffiliated: boolean
): boolean {
  // Seul un enseignant affilié peut livrer une note
  if (newStatus === 'livree' && !isAffiliated) {
    return false;
  }

  const allowedTransitions: Record<NoteStatus, NoteStatus[]> = {
    'en_attente': ['validee', 'annulee'],
    'validee': ['publiee', 'annulee'],
    'publiee': ['livree', 'revisee', 'annulee'],
    'livree': [],
    'revisee': ['publiee', 'livree', 'annulee'],
    'annulee': []
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Vérifie si une note peut être modifiée
 * @param status - Statut de la note
 * @returns true si modifiable
 */
export function isNoteModifiable(status: NoteStatus): boolean {
  return status !== 'livree' && status !== 'annulee';
}

/**
 * Vérifie si une note peut être supprimée
 * @param status - Statut de la note
 * @returns true si supprimable
 */
export function isNoteDeletable(status: NoteStatus): boolean {
  return status === 'en_attente' || status === 'validee';
}

// ============================================================
// FONCTIONS DE VALIDATION
// ============================================================

/**
 * Valide une note
 * @param note - Note à valider
 * @param noteSur - Note maximale possible
 * @returns true si la note est valide
 */
export function isValidNote(note: number, noteSur: number): boolean {
  return !isNaN(note) && note >= 0 && note <= noteSur;
}

/**
 * Valide un coefficient
 * @param coefficient - Coefficient à valider
 * @returns true si le coefficient est valide
 */
export function isValidCoefficient(coefficient: number): boolean {
  return !isNaN(coefficient) && coefficient >= 0.5 && coefficient <= 10;
}

/**
 * Valide une date d'évaluation
 * @param date - Date à valider
 * @returns true si la date est valide
 */
export function isValidDate(date: string): boolean {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

// ============================================================
// FONCTIONS DE FORMATAGE
// ============================================================

/**
 * Formate une note pour l'affichage
 * @param note - Note à formater
 * @param noteSur - Note maximale (optionnel)
 * @returns Chaîne formatée
 */
export function formatNote(note: number, noteSur?: number): string {
  if (note === null || note === undefined || isNaN(note)) return '-';
  if (noteSur) {
    return `${note}/${noteSur}`;
  }
  return note.toString();
}

/**
 * Formate une date pour l'affichage
 * @param date - Date ISO
 * @returns Date formatée (DD/MM/YYYY)
 */
export function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
}

/**
 * Formate une heure pour l'affichage
 * @param date - Date ISO
 * @returns Heure formatée (HH:MM)
 */
export function formatTime(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// FONCTIONS D'APPRÉCIATION
// ============================================================

/**
 * Obtient l'appréciation textuelle d'une note
 * @param note - Note
 * @param noteSur - Note maximale (défaut: 20)
 * @returns Appréciation
 */
export function getAppreciationFromNote(note: number, noteSur: number = 20): string {
  const pourcentage = (note / noteSur) * 100;
  
  if (pourcentage >= 80) return 'Excellent';
  if (pourcentage >= 70) return 'Très bien';
  if (pourcentage >= 60) return 'Bien';
  if (pourcentage >= 50) return 'Assez bien';
  if (pourcentage >= 40) return 'Passable';
  if (pourcentage >= 30) return 'Insuffisant';
  return 'Très insuffisant';
}

/**
 * Obtient la mention correspondant à une moyenne
 * @param moyenne - Moyenne
 * @returns Mention
 */
export function getMentionFromMoyenne(moyenne: number): string {
  if (moyenne >= 16) return 'Très bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

// ============================================================
// FONCTIONS DE STATISTIQUES
// ============================================================

/**
 * Calcule les statistiques d'une liste de notes
 * @param notes - Liste des notes
 * @returns Statistiques (min, max, moyenne, écart-type)
 */
export function calculerStatsNotes(notes: number[]): {
  min: number;
  max: number;
  moyenne: number;
  ecartType: number;
  effectif: number;
} {
  if (notes.length === 0) {
    return { min: 0, max: 0, moyenne: 0, ecartType: 0, effectif: 0 };
  }

  const min = Math.min(...notes);
  const max = Math.max(...notes);
  const moyenne = calculerMoyenne(notes);
  
  // Écart-type
  const variance = notes.reduce((acc, note) => acc + Math.pow(note - moyenne, 2), 0) / notes.length;
  const ecartType = Math.sqrt(variance);
  
  return {
    min,
    max,
    moyenne,
    ecartType: Math.round(ecartType * 100) / 100,
    effectif: notes.length
  };
}

/**
 * Calcule la répartition des notes par tranche
 * @param notes - Liste des notes
 * @param noteSur - Note maximale
 * @returns Répartition par tranche de 5 points
 */
export function calculerRepartitionNotes(notes: number[], noteSur: number = 20): Record<string, number> {
  const tranches: Record<string, number> = {
    '0-5': 0,
    '5-10': 0,
    '10-15': 0,
    '15-20': 0
  };
  
  const seuil = noteSur / 4;
  
  notes.forEach(note => {
    if (note < seuil) tranches['0-5']++;
    else if (note < seuil * 2) tranches['5-10']++;
    else if (note < seuil * 3) tranches['10-15']++;
    else tranches['15-20']++;
  });
  
  return tranches;
}