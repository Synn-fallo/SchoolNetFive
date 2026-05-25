// /home/project/services/parametresService.ts
// Service pour la gestion des paramètres de l'établissement

import { supabase } from '@/lib/supabase';
import { ParametreBlocageBulletins, ParametreBlocageCertificats, ConditionsEligibilite } from '@/types/eligibilite.types';

const DEFAULT_BLOCAGE_BULLETINS: ParametreBlocageBulletins = {
  actif: false,
  conditions: {
    frais_scolarite: true,
    inscription_validee: true,
    documents_administratifs: false,
  },
};

const DEFAULT_BLOCAGE_CERTIFICATS: ParametreBlocageCertificats = {
  actif: false,
  utiliser_memes_conditions: true,
};

/**
 * Récupère les paramètres de blocage des bulletins pour un établissement
 */
export async function getParametreBlocageBulletins(
  etablissementId: string
): Promise<ParametreBlocageBulletins> {
  try {
    const { data, error } = await supabase
      .from('parametres_etablissement')
      .select('valeur')
      .eq('etablissement_id', etablissementId)
      .eq('clef', 'blocage_bulletins')
      .single();

    if (error) {
      console.error('Erreur récupération paramètre blocage_bulletins:', error);
      return DEFAULT_BLOCAGE_BULLETINS;
    }

    if (!data) {
      return DEFAULT_BLOCAGE_BULLETINS;
    }

    return data.valeur as ParametreBlocageBulletins;
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return DEFAULT_BLOCAGE_BULLETINS;
  }
}

/**
 * Récupère les paramètres de blocage des certificats de scolarité
 */
export async function getParametreBlocageCertificats(
  etablissementId: string
): Promise<ParametreBlocageCertificats> {
  try {
    const { data, error } = await supabase
      .from('parametres_etablissement')
      .select('valeur')
      .eq('etablissement_id', etablissementId)
      .eq('clef', 'blocage_certificats_scolarite')
      .single();

    if (error) {
      console.error('Erreur récupération paramètre blocage_certificats_scolarite:', error);
      return DEFAULT_BLOCAGE_CERTIFICATS;
    }

    if (!data) {
      return DEFAULT_BLOCAGE_CERTIFICATS;
    }

    return data.valeur as ParametreBlocageCertificats;
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return DEFAULT_BLOCAGE_CERTIFICATS;
  }
}

/**
 * Met à jour les paramètres de blocage des bulletins
 */
export async function updateParametreBlocageBulletins(
  etablissementId: string,
  params: ParametreBlocageBulletins
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('parametres_etablissement')
      .upsert({
        etablissement_id: etablissementId,
        clef: 'blocage_bulletins',
        valeur: params,
      }, {
        onConflict: 'etablissement_id,clef',
      });

    if (error) {
      console.error('Erreur mise à jour paramètre blocage_bulletins:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return false;
  }
}

/**
 * Met à jour les conditions d'éligibilité
 */
export async function updateConditionsEligibilite(
  etablissementId: string,
  conditions: Partial<ConditionsEligibilite>
): Promise<boolean> {
  try {
    const currentParams = await getParametreBlocageBulletins(etablissementId);
    
    const updatedParams: ParametreBlocageBulletins = {
      ...currentParams,
      conditions: {
        ...currentParams.conditions,
        ...conditions,
      },
    };

    return await updateParametreBlocageBulletins(etablissementId, updatedParams);
  } catch (error) {
    console.error('Erreur mise à jour conditions:', error);
    return false;
  }
}

/**
 * Active ou désactive le blocage des bulletins
 */
export async function setBlocageBulletinsActif(
  etablissementId: string,
  actif: boolean
): Promise<boolean> {
  try {
    const currentParams = await getParametreBlocageBulletins(etablissementId);
    
    const updatedParams: ParametreBlocageBulletins = {
      ...currentParams,
      actif,
    };

    return await updateParametreBlocageBulletins(etablissementId, updatedParams);
  } catch (error) {
    console.error('Erreur activation/désactivation blocage:', error);
    return false;
  }
}