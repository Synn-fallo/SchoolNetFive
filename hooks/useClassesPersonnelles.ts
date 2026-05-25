// /home/project/hooks/useClassesPersonnelles.ts
// Hook pour la gestion des classes personnelles (lecture + écriture)
// MIS À JOUR : Ajout des champs etablissement_nom et etablissement_id

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ClassePersonnelle {
  id: string;
  enseignant_id: string;
  nom: string;
  description: string | null;
  matieres: Array<{ nom: string; coefficient: number }>;
  eleves: Array<{ nom: string; prenom: string; matricule?: string }>;
  rattachee_a: string | null;
  etablissement_nom: string | null;
  etablissement_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UseClassesPersonnellesReturn {
  classes: ClassePersonnelle[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createClasse: (nom: string, description?: string, etablissementNom?: string, etablissementId?: string | null) => Promise<ClassePersonnelle | null>;
  updateClasse: (id: string, data: Partial<Omit<ClassePersonnelle, 'id' | 'enseignant_id' | 'created_at' | 'updated_at'>>) => Promise<boolean>;
  deleteClasse: (id: string) => Promise<boolean>;
}

export function useClassesPersonnelles(): UseClassesPersonnellesReturn {
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
        rattachee_a: item.rattachee_a || null,
        etablissement_nom: item.etablissement_nom || null,
        etablissement_id: item.etablissement_id || null,
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

  const createClasse = async (
    nom: string, 
    description?: string, 
    etablissementNom?: string, 
    etablissementId?: string | null
  ): Promise<ClassePersonnelle | null> => {
    if (!user) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('classes_personnelles')
        .insert({
          enseignant_id: user.id,
          nom,
          description: description || null,
          matieres: [],
          eleves: [],
          etablissement_nom: etablissementNom || null,
          etablissement_id: etablissementId || null
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

  const updateClasse = async (
    id: string,
    data: Partial<Omit<ClassePersonnelle, 'id' | 'enseignant_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    try {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('classes_personnelles')
        .update(updateData)
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
    deleteClasse
  };
}