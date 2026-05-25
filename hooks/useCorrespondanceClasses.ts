// /home/project/hooks/useCorrespondanceClasses.ts
// Hook pour la correspondance classe personnelle → classe officielle

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ClassePersonnelle {
  id: string;
  nom: string;
  description: string | null;
  matieres: any[];
  eleves: any[];
  created_at: string;
}

export interface ClasseOfficielle {
  id: string;
  nom: string;
  niveau: string;
  etablissement_id: string;
}

export interface CorrespondanceClasse {
  id: string;
  classe_personnelle_id: string;
  classe_officielle_id: string;
  statut: 'active' | 'historisee';
  created_at: string;
  updated_at: string;
}

interface UseCorrespondanceClassesProps {
  enseignantId: string;
}

export function useCorrespondanceClasses({ enseignantId }: UseCorrespondanceClassesProps) {
  const [loading, setLoading] = useState(false);
  const [classesPersonnelles, setClassesPersonnelles] = useState<ClassePersonnelle[]>([]);
  const [classesOfficielles, setClassesOfficielles] = useState<ClasseOfficielle[]>([]);
  const [correspondances, setCorrespondances] = useState<CorrespondanceClasse[]>([]);

  /**
   * Charge toutes les classes personnelles de l'enseignant
   */
  const chargerClassesPersonnelles = useCallback(async (): Promise<ClassePersonnelle[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes_personnelles')
        .select('*')
        .eq('enseignant_id', enseignantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClassesPersonnelles(data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading personal classes:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enseignantId]);

  /**
   * Charge les classes officielles d'un établissement
   */
  const chargerClassesOfficielles = useCallback(async (etablissementId: string): Promise<ClasseOfficielle[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, nom, niveau, etablissement_id')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true);

      if (error) throw error;
      setClassesOfficielles(data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading official classes:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Charge les correspondances existantes pour une classe personnelle
   */
  const chargerCorrespondances = useCallback(async (classePersonnelleId?: string): Promise<CorrespondanceClasse[]> => {
    try {
      let query = supabase
        .from('correspondance_classes')
        .select('*')
        .eq('enseignant_id', enseignantId);
      
      if (classePersonnelleId) {
        query = query.eq('classe_personnelle_id', classePersonnelleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setCorrespondances(data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading correspondences:', error);
      return [];
    }
  }, [enseignantId]);

  /**
   * Crée ou met à jour une correspondance entre une classe personnelle et une classe officielle
   */
  const sauvegarderCorrespondance = useCallback(async (
    classePersonnelleId: string,
    classeOfficielleId: string
  ): Promise<CorrespondanceClasse | null> => {
    setLoading(true);
    try {
      // Vérifier si une correspondance existe déjà
      const { data: existante, error: checkError } = await supabase
        .from('correspondance_classes')
        .select('id')
        .eq('classe_personnelle_id', classePersonnelleId)
        .eq('enseignant_id', enseignantId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      let result;
      
      if (existante) {
        // Mettre à jour l'existante
        const { data, error } = await supabase
          .from('correspondance_classes')
          .update({
            classe_officielle_id: classeOfficielleId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existante.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Créer une nouvelle correspondance
        const { data, error } = await supabase
          .from('correspondance_classes')
          .insert({
            classe_personnelle_id: classePersonnelleId,
            classe_officielle_id: classeOfficielleId,
            enseignant_id: enseignantId,
            statut: 'active'
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Mettre à jour l'état local
      setCorrespondances(prev => {
        const filtered = prev.filter(c => c.classe_personnelle_id !== classePersonnelleId);
        return [...filtered, result];
      });

      return result;
    } catch (error) {
      console.error('Error saving class correspondence:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enseignantId]);

  /**
   * Récupère la correspondance pour une classe personnelle donnée
   */
  const getCorrespondanceForClasse = useCallback((classePersonnelleId: string): CorrespondanceClasse | undefined => {
    return correspondances.find(c => c.classe_personnelle_id === classePersonnelleId);
  }, [correspondances]);

  /**
   * Supprime une correspondance (historisation)
   */
  const supprimerCorrespondance = useCallback(async (classePersonnelleId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('correspondance_classes')
        .update({ statut: 'historisee' })
        .eq('classe_personnelle_id', classePersonnelleId)
        .eq('enseignant_id', enseignantId);

      if (error) throw error;

      setCorrespondances(prev => prev.filter(c => c.classe_personnelle_id !== classePersonnelleId));
      return true;
    } catch (error) {
      console.error('Error deleting correspondence:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [enseignantId]);

  /**
   * Vérifie si une classe personnelle a déjà une correspondance
   */
  const hasCorrespondance = useCallback((classePersonnelleId: string): boolean => {
    return correspondances.some(c => c.classe_personnelle_id === classePersonnelleId);
  }, [correspondances]);

  /**
   * Récupère la classe officielle correspondant à une classe personnelle
   */
  const getClasseOfficielleCorrespondante = useCallback((classePersonnelleId: string): ClasseOfficielle | null => {
    const correspondance = correspondances.find(c => c.classe_personnelle_id === classePersonnelleId);
    if (!correspondance) return null;
    return classesOfficielles.find(c => c.id === correspondance.classe_officielle_id) || null;
  }, [correspondances, classesOfficielles]);

  return {
    loading,
    classesPersonnelles,
    classesOfficielles,
    correspondances,
    chargerClassesPersonnelles,
    chargerClassesOfficielles,
    chargerCorrespondances,
    sauvegarderCorrespondance,
    getCorrespondanceForClasse,
    supprimerCorrespondance,
    hasCorrespondance,
    getClasseOfficielleCorrespondante
  };
}