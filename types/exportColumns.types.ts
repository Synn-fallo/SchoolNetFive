// /home/project/types/exportColumns.types.ts
// Types pour la sélection des colonnes dans les exports

export type ExportColumn = 
  | 'rang'
  | 'matricule'
  | 'nom'
  | 'prenom'
  | 'moyenne'
  | 'appreciation'
  | 'detailsParMatiere'
  | 'rangMatiere';

export interface ExportColumnsConfig {
  classe: ExportColumn[];
  matiere: ExportColumn[];
}

// Colonnes par défaut pour l'export classe (relevé de notes)
export const DEFAULT_CLASSE_COLUMNS: ExportColumn[] = [
  'rang',
  'matricule',
  'nom',
  'prenom',
  'moyenne',
  'appreciation',
];

// Colonnes par défaut pour l'export matière (analyse de matière)
export const DEFAULT_MATIERE_COLUMNS: ExportColumn[] = [
  'rang',
  'matricule',
  'nom',
  'prenom',
  'moyenne',
  'appreciation',
];

// Colonnes disponibles pour l'export classe
export const AVAILABLE_CLASSE_COLUMNS: { id: ExportColumn; label: string; description: string }[] = [
  { id: 'rang', label: 'Rang', description: 'Position dans la classe' },
  { id: 'matricule', label: 'Matricule', description: 'Numéro d\'identification' },
  { id: 'nom', label: 'Nom', description: 'Nom de l\'élève' },
  { id: 'prenom', label: 'Prénom', description: 'Prénom de l\'élève' },
  { id: 'moyenne', label: 'Moyenne', description: 'Moyenne générale' },
  { id: 'appreciation', label: 'Appréciation', description: 'Appréciation générale' },
  { id: 'detailsParMatiere', label: 'Détail par matière', description: 'Notes détaillées par matière', requiresPremium: true },
  { id: 'rangMatiere', label: 'Rang par matière', description: 'Position dans chaque matière', requiresPremium: true },
];

// Colonnes disponibles pour l'export matière
export const AVAILABLE_MATIERE_COLUMNS: { id: ExportColumn; label: string; description: string }[] = [
  { id: 'rang', label: 'Rang', description: 'Position dans la matière' },
  { id: 'matricule', label: 'Matricule', description: 'Numéro d\'identification' },
  { id: 'nom', label: 'Nom', description: 'Nom de l\'élève' },
  { id: 'prenom', label: 'Prénom', description: 'Prénom de l\'élève' },
  { id: 'moyenne', label: 'Note', description: 'Note dans la matière' },
  { id: 'appreciation', label: 'Appréciation', description: 'Appréciation spécifique à la matière' },
];

// Clé pour le stockage des préférences
export const EXPORT_COLUMNS_PREF_KEY = 'export_columns_preferences';