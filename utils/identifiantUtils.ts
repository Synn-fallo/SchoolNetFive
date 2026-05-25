/**
 * Utilitaires pour la génération et gestion des identifiants de connexion des élèves
 * 
 * Format: nom.4derniersChiffresEducMaster
 * Exemple: gando.6789
 * 
 * En cas de collision: nom.4derniersChiffres.1, .2, etc.
 */

import { educmasterUtils } from './educmasterUtils';

/**
 * Nettoyer un nom pour génération d'identifiant
 * - Convertit en minuscules
 - Supprime les accents
 - Supprime les caractères spéciaux
 */
export function cleanNomForIdentifiant(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Générer l'identifiant de base (sans vérification de collision)
 * @param nom - Nom de famille de l'élève
 * @param educmaster - EducMaster complet
 * @returns Identifiant de base (ex: "gando.6789")
 */
export function generateBaseIdentifiant(nom: string, educmaster: string): string {
  const cleanedNom = cleanNomForIdentifiant(nom);
  const last4Digits = educmasterUtils.extractLast4Digits(educmaster);
  return `${cleanedNom}.${last4Digits}`;
}

/**
 * Vérifier si un identifiant existe déjà (appel à la base de données)
 * Cette fonction est asynchrone et doit être utilisée avec await
 * @param identifiant - L'identifiant à vérifier
 * @param supabase - Instance du client Supabase
 * @param currentId - ID de l'élève courant (pour éviter l'auto-collision lors d'une modification)
 */
export async function checkIdentifiantExists(
  identifiant: string,
  supabase: any,
  currentId?: string
): Promise<boolean> {
  let query = supabase
    .from('eleves')
    .select('id')
    .eq('identifiant_connexion', identifiant);
  
  if (currentId) {
    query = query.neq('id', currentId);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error) {
    console.error('Error checking identifiant existence:', error);
    return false;
  }
  
  return !!data;
}

/**
 * Générer un identifiant unique avec gestion des collisions
 * @param nom - Nom de famille de l'élève
 * @param educmaster - EducMaster complet
 * @param supabase - Instance du client Supabase
 * @param currentId - ID de l'élève courant (pour modification)
 * @returns Identifiant unique (ex: "gando.6789" ou "gando.6789.1")
 */
export async function generateUniqueIdentifiant(
  nom: string,
  educmaster: string,
  supabase: any,
  currentId?: string
): Promise<{ identifiant: string; suffixe: number; isCollision: boolean }> {
  const baseIdentifiant = generateBaseIdentifiant(nom, educmaster);
  
  let suffixe = 0;
  let candidate = baseIdentifiant;
  let isCollision = false;
  
  while (await checkIdentifiantExists(candidate, supabase, currentId)) {
    suffixe++;
    candidate = `${baseIdentifiant}.${suffixe}`;
    isCollision = true;
    
    if (suffixe > 99) {
      throw new Error('Impossible de générer un identifiant unique après 99 tentatives');
    }
  }
  
  return { identifiant: candidate, suffixe, isCollision };
}

/**
 * Vérifier l'unicité d'un identifiant (sans générer de nouveau)
 * @param nom - Nom de famille de l'élève
 * @param educmaster - EducMaster complet
 * @param supabase - Instance du client Supabase
 * @returns Informations sur la collision
 */
export async function previewIdentifiantUniqueness(
  nom: string,
  educmaster: string,
  supabase: any
): Promise<{ base: string; candidate: string; suffixe: number; isCollision: boolean }> {
  const base = generateBaseIdentifiant(nom, educmaster);
  const exists = await checkIdentifiantExists(base, supabase);
  
  if (!exists) {
    return { base, candidate: base, suffixe: 0, isCollision: false };
  }
  
  return { base, candidate: `${base}.1`, suffixe: 1, isCollision: true };
}

/**
 * Formater un identifiant pour l'affichage
 * @param identifiant - Identifiant brut
 * @returns Identifiant formaté (inchangé mais sécurisé)
 */
export function formatIdentifiantForDisplay(identifiant: string): string {
  if (!identifiant) return '';
  return identifiant;
}

/**
 * Valider le format d'un identifiant
 * @param identifiant - Identifiant à valider
 * @returns true si le format est valide
 */
export function isValidIdentifiantFormat(identifiant: string): boolean {
  if (!identifiant) return false;
  // Format: lettres.chiffres ou lettres.chiffres.chiffres
  const regex = /^[a-z0-9]+\.[0-9]+(\.[0-9]+)?$/;
  return regex.test(identifiant);
}

export const identifiantUtils = {
  cleanNomForIdentifiant,
  generateBaseIdentifiant,
  checkIdentifiantExists,
  generateUniqueIdentifiant,
  previewIdentifiantUniqueness,
  formatIdentifiantForDisplay,
  isValidIdentifiantFormat,
};