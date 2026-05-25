/**
 * Utilitaires pour la validation et manipulation de l'EducMaster
 * 
 * Format: numéro national unique attribué par le ministère
 * Formats supportés:
 * - 12 chiffres (standard): 1234 5678 9012
 * - 13 chiffres (étendu): 1234 5678 9012 3
 * 
 * Les 2 premiers: code établissement?
 * Les 2 suivants: année de naissance?
 * Les suivants: numéro séquentiel unique
 */

// =====================================================
// CONSTANTES
// =====================================================

export const EDUCMASTER_MIN_LENGTH = 12;  // Minimum: 12 chiffres (standard)
export const EDUCMASTER_MAX_LENGTH = 13;  // Maximum: 13 chiffres (étendu)
export const EDUCMASTER_EXACT_LENGTH = 12; // Format standard: 12 chiffres
export const EDUCMASTER_EXTENDED_LENGTH = 13; // Format étendu: 13 chiffres

// =====================================================
// VALIDATION
// =====================================================

/**
 * Vérifier si une chaîne est un EducMaster valide (uniquement des chiffres)
 * Accepte 12 ou 13 chiffres
 * @param educmaster - La chaîne à vérifier
 * @returns true si valide
 */
export function isValidEducMasterFormat(educmaster: string): boolean {
  if (!educmaster || educmaster.trim() === '') return false;
  const cleaned = educmaster.replace(/\s/g, '');
  // Uniquement des chiffres
  if (!/^\d+$/.test(cleaned)) return false;
  // Longueur 12 ou 13 chiffres
  return cleaned.length === EDUCMASTER_EXACT_LENGTH || cleaned.length === EDUCMASTER_EXTENDED_LENGTH;
}

/**
 * Vérifier si l'EducMaster a le format standard (12 chiffres)
 * @param educmaster - La chaîne à vérifier
 * @returns true si exactement 12 chiffres
 */
export function isExactFormat(educmaster: string): boolean {
  if (!educmaster) return false;
  const cleaned = educmaster.replace(/\s/g, '');
  return /^\d{12}$/.test(cleaned);
}

/**
 * Vérifier si l'EducMaster a le format étendu (13 chiffres)
 * @param educmaster - La chaîne à vérifier
 * @returns true si exactement 13 chiffres
 */
export function isExtendedFormat(educmaster: string): boolean {
  if (!educmaster) return false;
  const cleaned = educmaster.replace(/\s/g, '');
  return /^\d{13}$/.test(cleaned);
}

/**
 * Obtenir le message d'erreur approprié pour un EducMaster invalide
 * @param educmaster - L'EducMaster à valider
 * @returns Message d'erreur ou null si valide
 */
export function getEducMasterErrorMessage(educmaster: string): string | null {
  if (!educmaster || educmaster.trim() === '') {
    return 'L\'EducMaster est obligatoire';
  }
  
  const cleaned = educmaster.replace(/\s/g, '');
  
  if (!/^\d+$/.test(cleaned)) {
    return 'L\'EducMaster doit contenir uniquement des chiffres';
  }
  
  if (cleaned.length !== EDUCMASTER_EXACT_LENGTH && cleaned.length !== EDUCMASTER_EXTENDED_LENGTH) {
    return `L\'EducMaster doit contenir 12 ou 13 chiffres (actuellement ${cleaned.length} chiffres)`;
  }
  
  return null;
}

// =====================================================
// NORMALISATION
// =====================================================

/**
 * Normaliser un EducMaster (supprime espaces, tirets)
 * @param educmaster - L'EducMaster à normaliser
 * @returns EducMaster normalisé (uniquement chiffres)
 */
export function normalizeEducMaster(educmaster: string): string {
  if (!educmaster) return '';
  return educmaster.replace(/\s/g, '').replace(/-/g, '');
}

/**
 * Formater un EducMaster pour l'affichage
 * Gère les formats 12 et 13 chiffres
 * @param educmaster - L'EducMaster à formater
 * @param separator - 'space' ou 'dash'
 * @returns EducMaster formaté
 */
export function formatEducMasterForDisplay(educmaster: string, separator: 'space' | 'dash' = 'space'): string {
  const cleaned = normalizeEducMaster(educmaster);
  const sep = separator === 'space' ? ' ' : '-';
  
  // Format 12 chiffres: 1234 5678 9012
  if (cleaned.length === 12) {
    return `${cleaned.substring(0, 4)}${sep}${cleaned.substring(4, 8)}${sep}${cleaned.substring(8, 12)}`;
  }
  
  // Format 13 chiffres: 1234 5678 9012 3
  if (cleaned.length === 13) {
    return `${cleaned.substring(0, 4)}${sep}${cleaned.substring(4, 8)}${sep}${cleaned.substring(8, 12)}${sep}${cleaned.substring(12, 13)}`;
  }
  
  return cleaned;
}

// =====================================================
// EXTRACTION
// =====================================================

/**
 * Extraire les 4 derniers chiffres de l'EducMaster
 * @param educmaster - L'EducMaster complet
 * @returns Les 4 derniers chiffres
 */
export function extractLast4Digits(educmaster: string): string {
  const cleaned = normalizeEducMaster(educmaster);
  if (cleaned.length < 4) return cleaned;
  return cleaned.slice(-4);
}

/**
 * Extraire les 5 derniers chiffres de l'EducMaster (pour format 13 chiffres)
 * @param educmaster - L'EducMaster complet
 * @returns Les 5 derniers chiffres
 */
export function extractLast5Digits(educmaster: string): string {
  const cleaned = normalizeEducMaster(educmaster);
  if (cleaned.length < 5) return cleaned;
  return cleaned.slice(-5);
}

/**
 * Extraire l'année de naissance à partir de l'EducMaster
 * @param educmaster - L'EducMaster complet
 * @returns Année de naissance (ex: "1999") ou null
 */
export function extractBirthYear(educmaster: string): string | null {
  const cleaned = normalizeEducMaster(educmaster);
  if (cleaned.length < 12) return null;
  // Les positions 2-5 (0-index: 2 à 5) pour l'année
  const yearPart = cleaned.substring(2, 6);
  if (yearPart.length === 4 && /^\d{4}$/.test(yearPart)) {
    return yearPart;
  }
  return null;
}

// =====================================================
// VÉRIFICATION D'EXISTENCE (async, nécessite Supabase)
// =====================================================

/**
 * Vérifier si un EducMaster existe déjà dans la base
 * @param educmaster - L'EducMaster à vérifier
 * @param supabase - Instance du client Supabase
 * @param currentId - ID de l'élève courant (pour éviter l'auto-collision)
 * @returns true si l'EducMaster existe déjà
 */
export async function checkEducMasterExists(
  educmaster: string,
  supabase: any,
  currentId?: string
): Promise<{ exists: boolean; eleve?: { id: string; nom: string; prenom: string } }> {
  const cleaned = normalizeEducMaster(educmaster);
  
  let query = supabase
    .from('eleves')
    .select('id, nom, prenom')
    .eq('educmaster', cleaned);
  
  if (currentId) {
    query = query.neq('id', currentId);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error) {
    console.error('Error checking EducMaster existence:', error);
    return { exists: false };
  }
  
  if (data) {
    return { exists: true, eleve: data };
  }
  
  return { exists: false };
}

// =====================================================
// OBJET EXPORTÉ
// =====================================================

export const educmasterUtils = {
  // Constantes
  MIN_LENGTH: EDUCMASTER_MIN_LENGTH,
  MAX_LENGTH: EDUCMASTER_MAX_LENGTH,
  EXACT_LENGTH: EDUCMASTER_EXACT_LENGTH,
  EXTENDED_LENGTH: EDUCMASTER_EXTENDED_LENGTH,
  
  // Validation
  isValidFormat: isValidEducMasterFormat,
  isExactFormat,
  isExtendedFormat,
  getErrorMessage: getEducMasterErrorMessage,
  
  // Normalisation
  normalize: normalizeEducMaster,
  formatForDisplay: formatEducMasterForDisplay,
  
  // Extraction
  extractLast4Digits,
  extractLast5Digits,
  extractBirthYear,
  
  // Vérification
  checkExists: checkEducMasterExists,
};

export default educmasterUtils;
