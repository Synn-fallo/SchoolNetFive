// ============================================================
// PHASE 3 – WORKFLOW ENSEIGNANT
// Hook : useEnseignantClassesPersonnelles
// Objectif : Gérer les classes personnelles (CRUD) pour enseignants indépendants
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface MatierePersonnalisee {
  nom: string;
  coefficient: number;
}

export interface ElevePersonnalise {
  nom: string;
  prenom: string;
  matricule?: string;
}

export interface ClassePersonnelle {
  id: string;
  enseignant_id: string;
  nom: string;
  description: string | null;
  matieres: MatierePersonnalisee[];
  eleves: ElevePersonnalise[];
  created_at: string;
  updated_at: string;
}

interface UseEnseignantClassesPersonnellesReturn {
  classes: ClassePersonnelle[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createClasse: (nom: string, description?: string) => Promise<ClassePersonnelle | null>;
  updateClasse: (id: string, data: Partial<Omit<ClassePersonnelle, 'id' | 'enseignant_id' | 'created_at' | 'updated_at'>>) => Promise<boolean>;
  deleteClasse: (id: string) => Promise<boolean>;
  addMatiere: (classeId: string, matiere: MatierePersonnalisee) => Promise<boolean>;
  removeMatiere: (classeId: string, matiereNom: string) => Promise<boolean>;
  addEleve: (classeId: string, eleve: ElevePersonnalise) => Promise<boolean>;
  removeEleve: (classeId: string, eleveIndex: number) => Promise<boolean>;
}

export function useEnseignantClassesPersonnelles(): UseEnseignantClassesPersonnellesReturn {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassePersonnelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!user) {
      setClasses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('classes_personnelles')
        .select('*')
        .eq('enseignant_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedClasses: ClassePersonnelle[] = (data || []).map(item => ({
        id: item.id,
        enseignant_id: item.enseignant_id,
        nom: item.nom,
        description: item.description,
        matieres: item.matieres || [],
        eleves: item.eleves || [],
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      setClasses(formattedClasses);
    } catch (err) {
      console.error('Error fetching personal classes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createClasse = async (nom: string, description?: string): Promise<ClassePersonnelle | null> => {
    if (!user) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('classes_personnelles')
        .insert({
          enseignant_id: user.id,
          nom,
          description: description || null,
          matieres: [],
          eleves: []
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchClasses();
      return data as ClassePersonnelle;
    } catch (err) {
      console.error('Error creating personal class:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    }
  };

  const updateClasse = async (id: string, data: Partial<Omit<ClassePersonnelle, 'id' | 'enseignant_id' | 'created_at' | 'updated_at'>>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('classes_personnelles')
        .update(data)
        .eq('id', id)
        .eq('enseignant_id', user?.id);

      if (updateError) throw updateError;

      await fetchClasses();
      return true;
    } catch (err) {
      console.error('Error updating personal class:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return false;
    }
  };

  const deleteClasse = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('classes_personnelles')
        .delete()
        .eq('id', id)
        .eq('enseignant_id', user?.id);

      if (deleteError) throw deleteError;

      await fetchClasses();
      return true;
    } catch (err) {
      console.error('Error deleting personal class:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  };

  const addMatiere = async (classeId: string, matiere: MatierePersonnalisee): Promise<boolean> => {
    const classe = classes.find(c => c.id === classeId);
    if (!classe) return false;

    const newMatieres = [...classe.matieres, matiere];
    return updateClasse(classeId, { matieres: newMatieres });
  };

  const removeMatiere = async (classeId: string, matiereNom: string): Promise<boolean> => {
    const classe = classes.find(c => c.id === classeId);
    if (!classe) return false;

    const newMatieres = classe.matieres.filter(m => m.nom !== matiereNom);
    return updateClasse(classeId, { matieres: newMatieres });
  };

  const addEleve = async (classeId: string, eleve: ElevePersonnalise): Promise<boolean> => {
    const classe = classes.find(c => c.id === classeId);
    if (!classe) return false;

    const newEleves = [...classe.eleves, eleve];
    return updateClasse(classeId, { eleves: newEleves });
  };

  const removeEleve = async (classeId: string, eleveIndex: number): Promise<boolean> => {
    const classe = classes.find(c => c.id === classeId);
    if (!classe) return false;

    const newEleves = classe.eleves.filter((_, i) => i !== eleveIndex);
    return updateClasse(classeId, { eleves: newEleves });
  };

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return {
    classes,
    loading,
    error,
    refresh: fetchClasses,
    createClasse,
    updateClasse,
    deleteClasse,
    addMatiere,
    removeMatiere,
    addEleve,
    removeEleve
  };
}