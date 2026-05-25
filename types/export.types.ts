// /home/project/types/export.types.ts
// Types pour les exports enrichis (PDF/Excel)

import { Periode } from './notes.types';

/**
 * Sections exportables
 */
export type ExportSection = 
  | 'header'           // En-tête établissement (logo, nom, année, période)
  | 'stats'            // Statistiques générales (moyenne établissement, taux réussite)
  | 'classesTable'     // Moyennes par classe (tableau)
  | 'matieresTable'    // Détail par matière (tableau)
  | 'elevesList'       // Liste des élèves (relevé individuel)
  | 'tableauHonneur'   // Tableau d'honneur (top élèves)
  | 'graphiques'       // Graphiques (comparatifs, évolutions)
  | 'signatures'       // Espaces pour signatures
  | 'footer';          // Pied de page (SchoolNet, date, QR code)

/**
 * Format d'export
 */
export type ExportFormat = 'pdf' | 'excel';

/**
 * Orientation du document
 */
export type ExportOrientation = 'portrait' | 'landscape';

/**
 * Options d'export
 */
export interface ExportOptions {
  // Sections à inclure
  sections: ExportSection[];
  
  // Format et orientation
  format: ExportFormat;
  orientation: ExportOrientation;
  
  // Période et filtres
  periode: Periode;
  classeId?: string;
  classeNom?: string;
  matiereId?: string;
  matiereNom?: string;
  
  // Métadonnées
  etablissementId: string;
  etablissementNom: string;
  anneeScolaireLibelle: string;
  dateGeneration: string;
  
  // Options avancées (nécessitent abonnement)
  includeGraphiques: boolean;      // Graphiques (Premium/Prestige)
  includeTableauHonneur: boolean;  // Tableau d'honneur (Premium/Prestige)
  includeSignaturesNumeriques: boolean; // Signatures numériques (Prestige)
}

/**
 * Valeurs par défaut des options d'export
 */
export const DEFAULT_EXPORT_OPTIONS: Partial<ExportOptions> = {
  sections: ['header', 'stats', 'classesTable', 'matieresTable', 'signatures', 'footer'],
  format: 'excel',
  orientation: 'portrait',
  includeGraphiques: false,
  includeTableauHonneur: false,
  includeSignaturesNumeriques: false,
};

/**
 * Sections disponibles avec leur label et niveau d'abonnement requis
 */
export interface ExportSectionConfig {
  id: ExportSection;
  label: string;
  description: string;
  defaultEnabled: boolean;
  requiredPlan?: 'essentiel' | 'premium' | 'prestige'; // Plan d'abonnement requis
}

export const EXPORT_SECTIONS: ExportSectionConfig[] = [
  {
    id: 'header',
    label: 'En-tête établissement',
    description: 'Logo, nom de l\'établissement, année scolaire, période',
    defaultEnabled: true,
    requiredPlan: 'essentiel',
  },
  {
    id: 'stats',
    label: 'Statistiques générales',
    description: 'Moyenne établissement, taux de réussite, meilleure/plus faible classe',
    defaultEnabled: true,
    requiredPlan: 'essentiel',
  },
  {
    id: 'classesTable',
    label: 'Moyennes par classe',
    description: 'Tableau des moyennes, rangs, effectifs, taux de réussite par classe',
    defaultEnabled: true,
    requiredPlan: 'essentiel',
  },
  {
    id: 'matieresTable',
    label: 'Détail par matière',
    description: 'Tableau des moyennes, meilleures/plus faibles notes par matière',
    defaultEnabled: true,
    requiredPlan: 'essentiel',
  },
  {
    id: 'elevesList',
    label: 'Liste des élèves',
    description: 'Relevé individuel des notes par élève',
    defaultEnabled: false,
    requiredPlan: 'essentiel',
  },
  {
    id: 'tableauHonneur',
    label: 'Tableau d\'honneur',
    description: 'Liste des meilleurs élèves avec mentions',
    defaultEnabled: false,
    requiredPlan: 'premium',
  },
  {
    id: 'graphiques',
    label: 'Graphiques',
    description: 'Graphiques comparatifs et d\'évolution',
    defaultEnabled: false,
    requiredPlan: 'premium',
  },
  {
    id: 'signatures',
    label: 'Signatures',
    description: 'Espaces pour signatures (PP, Chef, Élève, Parents)',
    defaultEnabled: true,
    requiredPlan: 'essentiel',
  },
  {
    id: 'footer',
    label: 'Pied de page',
    description: 'SchoolNet, date de génération, QR code',
    defaultEnabled: true,
    requiredPlan: 'essentiel',
  },
];

/**
 * Interface pour les données d'export par classe
 */
export interface ExportClasseData {
  classe: {
    id: string;
    nom: string;
    effectif: number;
  };
  periode: Periode;
  anneeScolaire: string;
  etablissementNom: string;
  statsGenerales: {
    moyenneClasse: number;
    tauxReussite: number;
    meilleureMoyenne: number;
    meilleurEleve?: string;
    plusFaibleMoyenne: number;
    plusFaibleEleve?: string;
  };
  matieres: Array<{
    nom: string;
    coefficient: number;
    moyenne: number;
    meilleureNote: number;
    plusFaibleNote: number;
    notesCount: number;
  }>;
  eleves: Array<{
    rang: number;
    nom: string;
    prenom: string;
    matricule: string;
    moyenne: number;
    appreciation: string;
    notesCount: number;
    detailsParMatiere?: Array<{
      matiere: string;
      note: number;
      rang: number;
    }>;
  }>;
}

/**
 * Interface pour les données d'export par matière
 */
export interface ExportMatiereData {
  matiere: {
    id: string;
    nom: string;
    coefficient: number;
  };
  classe: {
    id: string;
    nom: string;
    effectif: number;
  };
  periode: Periode;
  anneeScolaire: string;
  etablissementNom: string;
  stats: {
    moyenneClasse: number;
    ecartType: number;
    meilleureNote: number;
    meilleurEleve?: string;
    plusFaibleNote: number;
    plusFaibleEleve?: string;
    tauxReussite: number;
  };
  eleves: Array<{
    rang: number;
    nom: string;
    prenom: string;
    matricule: string;
    note: number;
    appreciation: string;
  }>;
}

/**
 * Interface pour les données d'export par période (rapport complet)
 */
export interface ExportPeriodeData {
  etablissement: {
    id: string;
    nom: string;
    regime: 'semestre' | 'trimestre';
  };
  periode: Periode;
  anneeScolaire: string;
  dateGeneration: string;
  statsGlobales: {
    totalEleves: number;
    moyenneGenerale: number;
    tauxReussite: number;
    meilleureClasse: { nom: string; moyenne: number };
    plusFaibleClasse: { nom: string; moyenne: number };
  };
  classesStats: Array<{
    nom: string;
    effectif: number;
    moyenneGenerale: number;
    rang: number;
    tauxReussite: number;
    meilleureMoyenne: number;
    plusFaibleMoyenne: number;
  }>;
  matieresStats: Array<{
    nom: string;
    coefficient: number;
    moyenneEtablissement: number;
    meilleureClasse: string;
    plusFaibleClasse: string;
  }>;
  tableauHonneur?: Array<{
    rang: number;
    classe: string;
    nom: string;
    prenom: string;
    moyenne: number;
    mention: 'felicitations' | 'encouragement' | 'tableau_honneur';
  }>;
}