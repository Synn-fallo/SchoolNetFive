// /home/project/utils/classSelectionLogic.ts
// Logique structurée de sélection des classes selon le type d'établissement

export type EnseignementType = 'general' | 'technique' | 'mixte';
export type Cycle = 'premier' | 'second';

export interface EtablissementStructure {
  id: string;
  nom: string;
  type_enseignement: EnseignementType;
  cycles_proposes: Cycle[];
  classes_general?: {
    premier: string[];
    second: string[];
  };
  classes_technique?: {
    premier: string[];
    second: string[];
  };
  series_par_classe_general?: Record<string, string[]>;
  series_par_classe_technique?: Record<string, string[]>;
  options_par_serie?: Record<string, string[]>;
}

export interface SelectionClasse {
  cycle: Cycle | null;
  enseignementType?: 'general' | 'technique';
  classe: string | null;
  serie: string | null;
  option: string | null;
}

// Valeurs par défaut - Général
const DEFAULT_CLASSES_GENERAL = {
  premier: ['6ème', '5ème', '4ème', '3ème'],
  second: ['2nde', '1ère', 'Terminale'],
};

const DEFAULT_SERIES_GENERAL = {
  '2nde': ['2nde A', '2nde C', '2nde D', '2nde E'],
  '1ère': ['A', 'C', 'D', 'E'],
  'Terminale': ['A', 'C', 'D', 'E'],
};

const DEFAULT_OPTIONS_GENERAL = {
  'A': ['A1 (Lettres classiques)', 'A2 (Lettres modernes)', 'A3 (Lettres + Langues vivantes)'],
  'C': [],
  'D': [],
  'E': ['E1 (Électrotechnique)', 'E2 (Électronique)', 'E3 (Construction mécanique)'],
};

// Valeurs par défaut - Technique
const DEFAULT_CLASSES_TECHNIQUE = {
  premier: ['1ère Année', '2ème Année', '3ème Année'],
  second: ['4ème Année', '5ème Année'],
};

const DEFAULT_OPTIONS_TECHNIQUE_PREMIER = [
  'MG (Mécanique Générale)',
  'MA (Métiers de l\'Administration)',
  'GC (Génie Civil)',
  'EL (Électrotechnique)',
  'INF (Informatique)',
  'HÔT (Hôtellerie)',
  'EST (Esthétique / Coiffure)',
  'AGRO (Agroalimentaire)',
];

const DEFAULT_SERIES_TECHNIQUE_SECOND = {
  '4ème Année': ['F (Génie Civil)', 'G (Gestion)', 'H (Hôtellerie)', 'I (Informatique)'],
  '5ème Année': ['F (Génie Civil)', 'G (Gestion)', 'H (Hôtellerie)', 'I (Informatique)'],
};

const DEFAULT_OPTIONS_TECHNIQUE_SECOND = {
  'F': ['F1 (Bâtiment)', 'F2 (Travaux publics)', 'F3 (Topographie)'],
  'G': ['G1 (Comptabilité)', 'G2 (Marketing)', 'G3 (Transport)'],
  'H': ['H1 (Cuisine)', 'H2 (Service en salle)', 'H3 (Réception)'],
  'I': ['I1 (Développement)', 'I2 (Réseaux)', 'I3 (Multimédia)'],
};

/**
 * Obtenir les cycles proposés par l'établissement
 */
export function getCycles(etablissement: EtablissementStructure): Cycle[] {
  return etablissement.cycles_proposes;
}

/**
 * Obtenir la liste des classes selon le cycle et le type d'enseignement
 */
export function getClasses(
  etablissement: EtablissementStructure,
  cycle: Cycle,
  enseignementType?: 'general' | 'technique'
): string[] {
  // Déterminer le type à utiliser
  let type = etablissement.type_enseignement;
  if (type === 'mixte' && enseignementType) {
    type = enseignementType;
  }
  
  if (type === 'technique') {
    const classesTech = etablissement.classes_technique || DEFAULT_CLASSES_TECHNIQUE;
    return classesTech[cycle] || [];
  }
  
  // general ou mixte avec général
  const classesGen = etablissement.classes_general || DEFAULT_CLASSES_GENERAL;
  return classesGen[cycle] || [];
}

/**
 * Obtenir la liste des séries selon la classe
 */
export function getSeries(
  etablissement: EtablissementStructure,
  classe: string,
  enseignementType?: 'general' | 'technique'
): string[] {
  // Déterminer le type à utiliser
  let type = etablissement.type_enseignement;
  if (type === 'mixte' && enseignementType) {
    type = enseignementType;
  }
  
  if (type === 'technique') {
    const seriesTech = etablissement.series_par_classe_technique || DEFAULT_SERIES_TECHNIQUE_SECOND;
    return seriesTech[classe] || [];
  }
  
  const seriesGen = etablissement.series_par_classe_general || DEFAULT_SERIES_GENERAL;
  
  // Pour 2nde, retourner les séries de 2nde
  if (classe === '2nde') {
    return seriesGen['2nde'] || [];
  }
  
  // Pour 1ère et Terminale
  if (classe === '1ère' || classe === 'Terminale') {
    return seriesGen[classe] || [];
  }
  
  return [];
}

/**
 * Obtenir la liste des options selon la série
 */
export function getOptions(
  etablissement: EtablissementStructure,
  serie: string,
  classe?: string,
  enseignementType?: 'general' | 'technique'
): string[] {
  // Déterminer le type à utiliser
  let type = etablissement.type_enseignement;
  if (type === 'mixte' && enseignementType) {
    type = enseignementType;
  }
  
  // Technique - 1er cycle
  if (type === 'technique' && classe && ['1ère Année', '2ème Année', '3ème Année'].includes(classe)) {
    return DEFAULT_OPTIONS_TECHNIQUE_PREMIER;
  }
  
  // Technique - 2nd cycle
  if (type === 'technique') {
    const optionsTech = etablissement.options_par_serie || DEFAULT_OPTIONS_TECHNIQUE_SECOND;
    // Extraire le code série (ex: 'F (Génie Civil)' -> 'F')
    const serieCode = serie.split(' ')[0];
    return optionsTech[serieCode] || [];
  }
  
  // Général
  const optionsGen = etablissement.options_par_serie || DEFAULT_OPTIONS_GENERAL;
  const serieCode = serie.replace('Série ', '').replace('2nde ', '');
  return optionsGen[serieCode] || [];
}

/**
 * Vérifier si une classe nécessite le choix d'une série
 */
export function requiresSerie(classe: string, enseignementType?: 'general' | 'technique'): boolean {
  if (enseignementType === 'technique') {
    return classe === '4ème Année' || classe === '5ème Année';
  }
  return classe === '2nde' || classe === '1ère' || classe === 'Terminale';
}

/**
 * Vérifier si une série nécessite le choix d'une option
 */
export function requiresOption(serie: string, classe?: string, enseignementType?: 'general' | 'technique'): boolean {
  if (enseignementType === 'technique') {
    // Technique 1er cycle
    if (classe && ['1ère Année', '2ème Année', '3ème Année'].includes(classe)) {
      return true;
    }
    // Technique 2nd cycle - certaines séries ont des options
    const serieCode = serie.split(' ')[0];
    return ['F', 'G', 'H', 'I'].includes(serieCode);
  }
  
  // Général
  const serieCode = serie.replace('Série ', '').replace('2nde ', '');
  return serieCode === 'A' || serieCode === 'E';
}

/**
 * Générer le libellé complet de la sélection
 */
export function getFullLabel(
  selection: SelectionClasse,
  etablissement: EtablissementStructure
): string {
  if (!selection.classe) return '';
  
  let parts = [selection.classe];
  
  if (selection.serie && selection.serie !== 'Aucune') {
    parts.push(selection.serie);
  }
  
  if (selection.option && selection.option !== 'Aucune') {
    parts.push(`(${selection.option})`);
  }
  
  return parts.join(' - ');
}

/**
 * Valider la cohérence de la sélection
 */
export function validateSelection(
  selection: SelectionClasse,
  etablissement: EtablissementStructure
): { valid: boolean; error?: string } {
  if (!selection.classe) {
    return { valid: false, error: 'Veuillez sélectionner une classe' };
  }
  
  const availableClasses = getClasses(etablissement, selection.cycle!, selection.enseignementType);
  if (!availableClasses.includes(selection.classe)) {
    return { valid: false, error: 'Cette classe n\'est pas disponible' };
  }
  
  if (selection.serie && !requiresSerie(selection.classe, selection.enseignementType)) {
    return { valid: false, error: 'Cette classe ne nécessite pas de série' };
  }
  
  if (selection.serie && selection.serie !== 'Aucune') {
    const availableSeries = getSeries(etablissement, selection.classe, selection.enseignementType);
    if (availableSeries.length > 0 && !availableSeries.includes(selection.serie)) {
      return { valid: false, error: 'Cette série n\'est pas disponible' };
    }
  }
  
  return { valid: true };
}

/**
 * Obtenir le cycle par défaut (si un seul)
 */
export function getDefaultCycle(etablissement: EtablissementStructure): Cycle | null {
  const cycles = getCycles(etablissement);
  if (cycles.length === 1) {
    return cycles[0];
  }
  return null;
}