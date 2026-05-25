// utils/matriculeUtils.ts
// Utilitaires pour la génération des matricules SNET

import { supabase } from '@/lib/supabase';

/**
 * Génère un matricule séquentiel pour un élève
 * Format: SNET-AAAA-NNNNN
 * Exemple: SNET-2024-00001
 * 
 * @param annee - Année scolaire (ex: 2024)
 * @returns Matricule unique au format SNET-AAAA-NNNNN
 */
export async function genererMatriculeSnetSequentiel(annee: number): Promise<string> {
  try {
    // Récupérer le dernier numéro séquentiel pour l'année
    const { data: lastEleve, error } = await supabase
      .from('eleves')
      .select('matricule')
      .ilike('matricule', `SNET-${annee}-%`)
      .order('matricule', { ascending: false })
      .limit(1);
    
    let nextNumero = 1;
    
    if (!error && lastEleve && lastEleve.length > 0 && lastEleve[0].matricule) {
      const match = lastEleve[0].matricule.match(/SNET-\d+-(\d+)/);
      if (match && match[1]) {
        nextNumero = parseInt(match[1], 10) + 1;
      }
    }
    
    return `SNET-${annee}-${String(nextNumero).padStart(5, '0')}`;
  } catch (error) {
    console.error('Erreur génération matricule:', error);
    // Fallback avec timestamp
    const timestamp = Date.now().toString().slice(-8);
    return `SNET-${annee}-${timestamp}`;
  }
}

/**
 * Valide un matricule SNET
 * @param matricule - Matricule à valider
 * @returns true si le format est valide
 */
export function validerMatriculeSnet(matricule: string): boolean {
  const regex = /^SNET-\d{4}-\d{5}$/;
  return regex.test(matricule);
}