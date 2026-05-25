// /home/project/hooks/useClassePersonnelleCRUD.ts
// Hook pour les opérations CRUD spécifiques sur une classe personnelle (élèves, matières)

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ElevePersonnel {
  nom: string;
  prenom: string;
  matricule?: string;
}

export interface MatierePersonnelle {
  nom: string;
  coefficient: number;
}

interface UseClassePersonnelleCRUDReturn {
  loading: boolean;
  error: string | null;
  ajouterEleve: (classeId: string, eleve: ElevePersonnel) => Promise<boolean>;
  modifierEleve: (classeId: string, index: number, eleve: ElevePersonnel) => Promise<boolean>;
  supprimerEleve: (classeId: string, index: number) => Promise<boolean>;
  ajouterMatiere: (classeId: string, matiere: MatierePersonnelle) => Promise<boolean>;
  modifierMatiere: (classeId: string, index: number, matiere: MatierePersonnelle) => Promise<boolean>;
  supprimerMatiere: (classeId: string, index: number) => Promise<boolean>;
  getClasseData: (classeId: string) => Promise<{ eleves: ElevePersonnel[]; matieres: MatierePersonnelle[] } | null>;
}

export function useClassePersonnelleCRUD(): UseClassePersonnelleCRUDReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClasseData = useCallback(async (classeId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('classes_personnelles')
        .select('eleves, matieres')
        .eq('id', classeId)
        .eq('enseignant_id', user?.id)
        .single();

      if (fetchError) throw fetchError;

      return {
        eleves: data.eleves || [],
        matieres: data.matieres || []
      };
    } catch (err) {
      console.error('Error getting class data:', err);
      setError(err instanceof Error ? err.message : 'Erreur de récupération');
      return null;
    }
  }, [user]);

  const updateClasseField = useCallback(async (classeId: string, field: 'eleves' | 'matieres', newValue: any[]) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('classes_personnelles')
        .update({ [field]: newValue, updated_at: new Date().toISOString() })
        .eq('id', classeId)
        .eq('enseignant_id', user?.id);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const ajouterEleve = useCallback(async (classeId: string, eleve: ElevePersonnel) => {
    const data = await getClasseData(classeId);
    if (!data) return false;

    const newEleves = [...data.eleves, eleve];
    return updateClasseField(classeId, 'eleves', newEleves);
  }, [getClasseData, updateClasseField]);

  const modifierEleve = useCallback(async (classeId: string, index: number, eleve: ElevePersonnel) => {
    const data = await getClasseData(classeId);
    if (!data || index < 0 || index >= data.eleves.length) return false;

    const newEleves = [...data.eleves];
    newEleves[index] = eleve;
    return updateClasseField(classeId, 'eleves', newEleves);
  }, [getClasseData, updateClasseField]);

  const supprimerEleve = useCallback(async (classeId: string, index: number) => {
    const data = await getClasseData(classeId);
    if (!data || index < 0 || index >= data.eleves.length) return false;

    const newEleves = data.eleves.filter((_, i) => i !== index);
    return updateClasseField(classeId, 'eleves', newEleves);
  }, [getClasseData, updateClasseField]);

  const ajouterMatiere = useCallback(async (classeId: string, matiere: MatierePersonnelle) => {
    const data = await getClasseData(classeId);
    if (!data) return false;

    const newMatieres = [...data.matieres, matiere];
    return updateClasseField(classeId, 'matieres', newMatieres);
  }, [getClasseData, updateClasseField]);

  const modifierMatiere = useCallback(async (classeId: string, index: number, matiere: MatierePersonnelle) => {
    const data = await getClasseData(classeId);
    if (!data || index < 0 || index >= data.matieres.length) return false;

    const newMatieres = [...data.matieres];
    newMatieres[index] = matiere;
    return updateClasseField(classeId, 'matieres', newMatieres);
  }, [getClasseData, updateClasseField]);

  const supprimerMatiere = useCallback(async (classeId: string, index: number) => {
    const data = await getClasseData(classeId);
    if (!data || index < 0 || index >= data.matieres.length) return false;

    const newMatieres = data.matieres.filter((_, i) => i !== index);
    return updateClasseField(classeId, 'matieres', newMatieres);
  }, [getClasseData, updateClasseField]);

  return {
    loading,
    error,
    ajouterEleve,
    modifierEleve,
    supprimerEleve,
    ajouterMatiere,
    modifierMatiere,
    supprimerMatiere,
    getClasseData
  };
}