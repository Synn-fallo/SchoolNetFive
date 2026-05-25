// /home/project/hooks/useAcademicStructure.ts
// Hook pour la structure académique (cycles, niveaux, séries, options, etc.)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Types
export interface Cycle {
  id: string;
  nom: string;
  ordre: number;
  description?: string;
  is_active: boolean;
}

export interface Niveau {
  id: string;
  cycle_id: string;
  nom: string;
  ordre: number;
  code?: string;
  is_active: boolean;
}

export interface Serie {
  id: string;
  nom: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

export interface OptionSerie {
  id: string;
  serie_id: string;
  nom: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export interface Indice {
  id: string;
  valeur: string;
  type_indice: 'ALPHA' | 'NUMERIC';
  ordre: number;
  is_active: boolean;
}

export interface ModeleGroupe {
  id: string;
  nom: string;
  description?: string;
  type_suffixe: 'LETTRE' | 'CHIFFRE';
  valeurs: string[];
  is_active: boolean;
}

export interface AnneeScolaire {
  id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  is_active: boolean;
}

export interface ClasseFormData {
  cycle_id: string;
  niveau_id: string;
  serie_id?: string;
  option_serie_id?: string;
  indice_id?: string;
  modele_groupe_id?: string;
  capacite?: number;
  is_manuel?: boolean;
  nom_manuel?: string;
}

export interface ClasseSimple {
  id: string;
  nom: string;
  niveau: string;
  cycle_id?: string;
  niveau_id?: string;
}

export function useAcademicStructure(etablissementId?: string) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);  // ✅ CORRIGÉ : ajout du =
  const [series, setSeries] = useState<Serie[]>([]);
  const [options, setOptions] = useState<OptionSerie[]>([]);
  const [indices, setIndices] = useState<Indice[]>([]);
  const [modelesGroupes, setModelesGroupes] = useState<ModeleGroupe[]>([]);
  const [anneeScolaireActive, setAnneeScolaireActive] = useState<AnneeScolaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement de toutes les données
  const loadAll = useCallback(async (etabId?: string) => {
    const targetEtablissementId = etabId || etablissementId;
    console.log('[useAcademicStructure] loadAll appelé, etablissementId:', targetEtablissementId);
    setLoading(true);
    setError(null);
    
    try {
      const [
        cyclesRes,
        niveauxRes,
        seriesRes,
        optionsRes,
        indicesRes,
        modelesRes
      ] = await Promise.all([
        supabase.from('cycles').select('*').eq('is_active', true).order('ordre'),
        supabase.from('niveaux').select('*').eq('is_active', true).order('ordre'),
        supabase.from('series').select('*').eq('is_active', true),
        supabase.from('options_serie').select('*').eq('is_active', true),
        supabase.from('indices').select('*').eq('is_active', true).order('ordre'),
        supabase.from('modeles_groupes').select('*').eq('is_active', true)
      ]);

      console.log('[useAcademicStructure] cyclesRes:', cyclesRes.error ? 'ERREUR' : 'OK', cyclesRes.data?.length);
      console.log('[useAcademicStructure] niveauxRes:', niveauxRes.error ? 'ERREUR' : 'OK', niveauxRes.data?.length);
      console.log('[useAcademicStructure] seriesRes:', seriesRes.error ? 'ERREUR' : 'OK', seriesRes.data?.length);
      console.log('[useAcademicStructure] optionsRes:', optionsRes.error ? 'ERREUR' : 'OK', optionsRes.data?.length);
      console.log('[useAcademicStructure] indicesRes:', indicesRes.error ? 'ERREUR' : 'OK', indicesRes.data?.length);
      console.log('[useAcademicStructure] modelesRes:', modelesRes.error ? 'ERREUR' : 'OK', modelesRes.data?.length);

      if (cyclesRes.error) throw cyclesRes.error;
      if (niveauxRes.error) throw niveauxRes.error;
      if (seriesRes.error) throw seriesRes.error;
      if (optionsRes.error) throw optionsRes.error;
      if (indicesRes.error) throw indicesRes.error;
      if (modelesRes.error) throw modelesRes.error;

      setCycles(cyclesRes.data || []);
      setNiveaux(niveauxRes.data || []);
      setSeries(seriesRes.data || []);
      setOptions(optionsRes.data || []);
      setIndices(indicesRes.data || []);
      setModelesGroupes(modelesRes.data || []);

      // Charger l'année scolaire active de l'établissement
      if (targetEtablissementId) {
        const { data: anneeData, error: anneeError } = await supabase
          .from('annees_scolaires')
          .select('*')
          .eq('etablissement_id', targetEtablissementId)
          .eq('is_active', true)
          .maybeSingle();

        if (anneeError) throw anneeError;
        console.log('[useAcademicStructure] Année scolaire active:', anneeData?.libelle);
        setAnneeScolaireActive(anneeData || null);
      } else {
        console.log('[useAcademicStructure] Pas d\'etablissementId, année scolaire non chargée');
        setAnneeScolaireActive(null);
      }
    } catch (err) {
      console.error('Error loading academic structure:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      console.log('[useAcademicStructure] loadAll terminé, loading = false');
      setLoading(false);
    }
  }, [etablissementId]);

  // Filtrer les niveaux par cycle
  const getNiveauxByCycle = useCallback((cycleId: string) => {
    return niveaux.filter(n => n.cycle_id === cycleId);
  }, [niveaux]);

  // Filtrer les options par série
  const getOptionsBySerie = useCallback((serieId: string) => {
    return options.filter(o => o.serie_id === serieId);
  }, [options]);

  // Récupérer les classes d'un établissement filtrées par cycle
  const getClassesByCycle = useCallback(async (etabId: string, cycleId: string): Promise<ClasseSimple[]> => {
    try {
      const niveauxDuCycle = niveaux.filter(n => n.cycle_id === cycleId);
      const niveauIds = niveauxDuCycle.map(n => n.id);
      
      if (niveauIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('classes')
        .select('id, nom, niveau, cycle_id, niveau_id')
        .eq('etablissement_id', etabId)
        .eq('is_active', true)
        .in('niveau_id', niveauIds)
        .order('nom', { ascending: true });

      if (error) throw error;

      return (data || []).map(classe => ({
        id: classe.id,
        nom: classe.nom,
        niveau: classe.niveau || '',
        cycle_id: classe.cycle_id,
        niveau_id: classe.niveau_id,
      }));
    } catch (err) {
      console.error('Error getting classes by cycle:', err);
      return [];
    }
  }, [niveaux]);

  // Générer le nom complet d'une classe
  const generateClassName = useCallback((data: ClasseFormData): string => {
    if (data.is_manuel && data.nom_manuel) {
      return data.nom_manuel;
    }

    const niveau = niveaux.find(n => n.id === data.niveau_id);
    const serie = series.find(s => s.id === data.serie_id);
    const option = options.find(o => o.id === data.option_serie_id);
    const indice = indices.find(i => i.id === data.indice_id);

    let name = niveau?.nom || '';
    
    if (serie) {
      name += ` ${serie.nom}`;
    }
    
    if (option) {
      name += ` ${option.code}`;
    }
    
    if (indice) {
      name += `/${indice.valeur}`;
    }
    
    return name;
  }, [niveaux, series, options, indices]);

  // Créer une classe
  const createClasse = useCallback(async (etabId: string, anneeScolaireId: string, data: ClasseFormData) => {
    try {
      const niveau = niveaux.find(n => n.id === data.niveau_id);
      const serie = series.find(s => s.id === data.serie_id);
      const option = options.find(o => o.id === data.option_serie_id);
      const indice = indices.find(i => i.id === data.indice_id);
      
      let nomComplet = '';
      let niveauText = '';
      
      if (data.is_manuel && data.nom_manuel) {
        nomComplet = data.nom_manuel;
        niveauText = '';
      } else {
        niveauText = niveau?.nom || '';
        nomComplet = niveauText;
        if (serie) nomComplet += ` ${serie.nom}`;
        if (option) nomComplet += ` ${option.code}`;
        if (indice && data.indice_id) nomComplet += `/${indice.valeur}`;
      }

      const classeData = {
        etablissement_id: etabId,
        annee_scolaire_id: anneeScolaireId,
        nom: nomComplet,
        niveau: niveauText,
        capacite: data.capacite || null,
        is_active: true,
        cycle_id: data.cycle_id || null,
        niveau_id: data.niveau_id || null,
        serie_id: data.serie_id || null,
        option_serie_id: data.option_serie_id || null,
        indice_id: data.indice_id || null,
        modele_groupe_id: data.modele_groupe_id || null,
        nom_generique: !data.is_manuel ? nomComplet : null,
        is_manuel: data.is_manuel || false
      };

      const { data: result, error } = await supabase
        .from('classes')
        .insert(classeData)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: result };
    } catch (err) {
      console.error('Error creating class:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de création' };
    }
  }, [niveaux, series, options, indices]);

  const refresh = useCallback((etabId?: string) => {
    return loadAll(etabId);
  }, [loadAll]);

  // Charger les données au montage du hook si etablissementId est fourni
  useEffect(() => {
    if (etablissementId) {
      loadAll(etablissementId);
    } else {
      setLoading(false);
    }
  }, [etablissementId, loadAll]);

  return {
    cycles,
    niveaux,
    series,
    options,
    indices,
    modelesGroupes,
    anneeScolaireActive,
    loading,
    error,
    getNiveauxByCycle,
    getOptionsBySerie,
    getClassesByCycle,
    generateClassName,
    createClasse,
    refresh,
    loadAll
  };
}