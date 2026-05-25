// /home/project/services/eligibiliteService.ts
// Service pour la vérification de l'éligibilité des élèves

import { supabase } from '@/lib/supabase';
import { getParametreBlocageBulletins } from './parametresService';
import { StatutEligibilite, StatutEligibiliteBatch } from '@/types/eligibilite.types';

/**
 * Vérifie si un élève est éligible pour la génération de son bulletin
 */
export async function isEleveEligibleBulletin(
  eleveId: string,
  anneeScolaireId: string
): Promise<StatutEligibilite> {
  try {
    // Appeler la fonction PostgreSQL créée dans la migration
    const { data, error } = await supabase
      .rpc('is_eleve_eligible_bulletin', {
        p_eleve_id: eleveId,
        p_annee_scolaire_id: anneeScolaireId,
      });

    if (error) {
      console.error('Erreur vérification éligibilité:', error);
      return { eligible: true, motifs: [] };
    }

    if (!data) {
      return { eligible: true, motifs: [] };
    }

    return {
      eligible: data.eligible,
      motifs: data.motifs || [],
    };
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return { eligible: true, motifs: [] };
  }
}

/**
 * Vérifie l'éligibilité de plusieurs élèves en une seule requête
 */
export async function isEleveEligibleBatch(
  eleveIds: string[],
  anneeScolaireId: string
): Promise<StatutEligibiliteBatch> {
  const result: StatutEligibiliteBatch = {};

  if (eleveIds.length === 0) {
    return result;
  }

  try {
    // Vérifier d'abord si le paramètre de blocage est actif pour l'établissement
    // Récupérer l'établissement du premier élève (tous devraient avoir le même)
    const { data: etablissementData } = await supabase
      .from('eleves')
      .select('etablissement_id')
      .eq('id', eleveIds[0])
      .single();

    if (etablissementData) {
      const params = await getParametreBlocageBulletins(etablissementData.etablissement_id);
      
      // Si le blocage est désactivé, tous sont éligibles
      if (!params.actif) {
        for (const eleveId of eleveIds) {
          result[eleveId] = { eligible: true, motifs: [] };
        }
        return result;
      }
    }

    // Si le blocage est activé, vérifier chaque élève individuellement
    // Note: On pourrait optimiser avec une requête SQL groupée
    for (const eleveId of eleveIds) {
      const statut = await isEleveEligibleBulletin(eleveId, anneeScolaireId);
      result[eleveId] = statut;
    }

    return result;
  } catch (error) {
    console.error('Erreur vérification batch:', error);
    // En cas d'erreur, considérer tous comme éligibles
    for (const eleveId of eleveIds) {
      result[eleveId] = { eligible: true, motifs: [] };
    }
    return result;
  }
}

/**
 * Récupère les motifs d'inéligibilité formatés pour affichage
 */
export function formatMotifsIneligibilite(motifs: string[]): string {
  if (motifs.length === 0) return '';
  
  if (motifs.length === 1) {
    return motifs[0];
  }
  
  return motifs.map((m, i) => `${i + 1}. ${m}`).join('\n');
}

/**
 * Vérifie si un élève est éligible et retourne un message d'alerte approprié
 */
export async function checkAndGetAlertMessage(
  eleveId: string,
  anneeScolaireId: string,
  nomEleve: string
): Promise<{ eligible: boolean; message: string | null }> {
  const { eligible, motifs } = await isEleveEligibleBulletin(eleveId, anneeScolaireId);
  
  if (eligible) {
    return { eligible: true, message: null };
  }
  
  const motifsFormatted = formatMotifsIneligibilite(motifs);
  
  return {
    eligible: false,
    message: `${nomEleve} n'est pas éligible à la génération du bulletin.\n\nMotif(s) :\n${motifsFormatted}\n\nVeuillez régulariser sa situation avant de générer le bulletin.`,
  };
}