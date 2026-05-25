// /home/project/types/classePersonnelle.types.ts
// Types spécifiques pour les classes personnelles des enseignants indépendants

// ============================================================
// TYPES DE BASE
// ============================================================

/**
 * Statut d'une classe personnelle
 */
export type ClassePersonnelleStatut = 'active' | 'archivee';

/**
 * Type d'opération sur une classe personnelle
 */
export type ClassePersonnelleOperation = 'create' | 'update' | 'delete' | 'export';

// ============================================================
// CLASSES PERSONNELLES
// ============================================================

/**
 * Matière dans une classe personnelle
 */
export interface MatierePersonnelle {
  nom: string;
  coefficient: number;
}

/**
 * Élève dans une classe personnelle
 */
export interface ElevePersonnel {
  nom: string;
  prenom: string;
  matricule?: string;
  date_naissance?: string;
  notes?: Record<string, number>; // Devoir ID → note
}

/**
 * Classe personnelle (indépendant)
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
  statut?: ClassePersonnelleStatut;
}

/**
 * Formulaire de création / modification d'une classe personnelle
 */
export interface ClassePersonnelleFormData {
  nom: string;
  description?: string;
}

// ============================================================
// STATISTIQUES
// ============================================================

/**
 * Statistiques d'une classe personnelle
 */
export interface ClassePersonnelleStats {
  id: string;
  nom: string;
  nbEleves: number;
  nbMatieres: number;
  dateCreation: string;
  derniereModification: string;
}

// ============================================================
// EXPORT
// ============================================================

/**
 * Format d'export d'une classe personnelle
 */
export interface ClassePersonnelleExport {
  classe: {
    id: string;
    nom: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  };
  matieres: MatierePersonnelle[];
  eleves: ElevePersonnel[];
}

/**
 * Options d'export
 */
export interface ExportOptions {
  format: 'csv' | 'json';
  includeMatieres: boolean;
  includeEleves: boolean;
  includeStats: boolean;
}

// ============================================================
// ÉVÉNEMENTS
// ============================================================

/**
 * Événement lié à une classe personnelle (pour logs)
 */
export interface ClassePersonnelleEvent {
  id: string;
  classe_id: string;
  enseignant_id: string;
  operation: ClassePersonnelleOperation;
  details: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

/**
 * Calcule le nombre total d'élèves dans une classe
 */
export function getNbEleves(classe: ClassePersonnelle): number {
  return classe.eleves?.length || 0;
}

/**
 * Calcule le nombre total de matières dans une classe
 */
export function getNbMatieres(classe: ClassePersonnelle): number {
  return classe.matieres?.length || 0;
}

/**
 * Vérifie si une classe personnelle a des données (élèves ou matières)
 */
export function hasData(classe: ClassePersonnelle): boolean {
  return getNbEleves(classe) > 0 || getNbMatieres(classe) > 0;
}

/**
 * Formate une classe personnelle pour l'export CSV
 */
export function formatForExport(classe: ClassePersonnelle): ClassePersonnelleExport {
  return {
    classe: {
      id: classe.id,
      nom: classe.nom,
      description: classe.description,
      created_at: classe.created_at,
      updated_at: classe.updated_at
    },
    matieres: classe.matieres || [],
    eleves: classe.eleves || []
  };
}

/**
 * Obtient le libellé d'un statut de classe personnelle
 */
export function getStatutClassePersonnelleLabel(statut: ClassePersonnelleStatut): string {
  switch (statut) {
    case 'active': return 'Active';
    case 'archivee': return 'Archivée';
    default: return 'Inconnu';
  }
}