// /home/project/hooks/useEvaluations.ts
// Hook pour la gestion des évaluations (CRUD + chargement)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Evaluation, EvaluationType } from '@/types/notes.types';

export interface EvaluationWithDetails extends Evaluation {
  classe_nom?: string;
  classe_type?: 'officielle' | 'personnelle';
  matiere_nom?: string;
}

interface UseEvaluationsReturn {
  evaluations: EvaluationWithDetails[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createEvaluation: (data: {
    type: EvaluationType;
    titre: string;
    description?: string;
    date_evaluation: string;
    note_sur: number;
    coefficient: number;
    classe_id?: string;
    classe_personnelle_id?: string;
    matiere_id: string;
  }) => Promise<boolean>;
  updateEvaluation: (id: string, data: Partial<{
    type: EvaluationType;
    titre: string;
    description: string;
    date_evaluation: string;
    note_sur: number;
    coefficient: number;
  }>) => Promise<boolean>;
  deleteEvaluation: (id: string) => Promise<boolean>;
  getEvaluationById: (id: string) => Promise<EvaluationWithDetails | null>;
}

export function useEvaluations(): UseEvaluationsReturn {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<EvaluationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvaluations = useCallback(async () => {
    if (!user) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Récupérer les évaluations des classes officielles
      const { data: officiels, error: err1 } = await supabase
        .from('devoirs')
        .select(`
          id,
          type,
          titre,
          description,
          date_devoir,
          note_sur,
          coefficient,
          is_published,
          classe_id,
          classe_personnelle_id,
          matiere_id,
          created_at,
          updated_at,
          classe:classe_id(id, nom),
          classe_personnelle:classe_personnelle_id(id, nom),
          matiere:matiere_id(id, nom)
        `)
        .eq('enseignant_id', user.id)
        .order('date_devoir', { ascending: false });

      if (err1) throw err1;

      const formattedEvaluations: EvaluationWithDetails[] = (officiels || []).map((item: any) => {
        const isOfficielle = !!item.classe_id;
        return {
          id: item.id,
          type: item.type || 'devoir',
          titre: item.titre,
          description: item.description,
          date_evaluation: item.date_devoir,
          note_sur: item.note_sur,
          coefficient: item.coefficient,
          is_published: item.is_published,
          classe_id: item.classe_id,
          classe_personnelle_id: item.classe_personnelle_id,
          matiere_id: item.matiere_id,
          enseignant_id: user.id,
          periode_id: null,
          annee_scolaire_id: null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          classe_nom: isOfficielle ? item.classe?.nom : item.classe_personnelle?.nom,
          classe_type: isOfficielle ? 'officielle' : 'personnelle',
          matiere_nom: item.matiere?.nom
        };
      });

      setEvaluations(formattedEvaluations);
    } catch (err) {
      console.error('Error loading evaluations:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createEvaluation = useCallback(async (data: {
    type: EvaluationType;
    titre: string;
    description?: string;
    date_evaluation: string;
    note_sur: number;
    coefficient: number;
    classe_id?: string;
    classe_personnelle_id?: string;
    matiere_id: string;
  }): Promise<boolean> => {
    if (!user) return false;

    try {
      const insertData: any = {
        enseignant_id: user.id,
        type: data.type,
        titre: data.titre,
        description: data.description || null,
        date_devoir: data.date_evaluation,
        note_sur: data.note_sur,
        coefficient: data.coefficient,
        matiere_id: data.matiere_id,
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (data.classe_id) {
        insertData.classe_id = data.classe_id;
        // Récupérer l'établissement_id
        const { data: classeData } = await supabase
          .from('classes')
          .select('etablissement_id')
          .eq('id', data.classe_id)
          .single();
        if (classeData) {
          insertData.etablissement_id = classeData.etablissement_id;
        }
      } else if (data.classe_personnelle_id) {
        insertData.classe_personnelle_id = data.classe_personnelle_id;
        insertData.etablissement_id = null;
      } else {
        throw new Error('Classe non spécifiée');
      }

      const { error } = await supabase.from('devoirs').insert(insertData);
      if (error) throw error;

      await loadEvaluations();
      return true;
    } catch (err) {
      console.error('Error creating evaluation:', err);
      setError(err instanceof Error ? err.message : 'Erreur de création');
      return false;
    }
  }, [user, loadEvaluations]);

  const updateEvaluation = useCallback(async (id: string, data: Partial<{
    type: EvaluationType;
    titre: string;
    description: string;
    date_evaluation: string;
    note_sur: number;
    coefficient: number;
  }>): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      if (data.type !== undefined) updateData.type = data.type;
      if (data.titre !== undefined) updateData.titre = data.titre;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.date_evaluation !== undefined) updateData.date_devoir = data.date_evaluation;
      if (data.note_sur !== undefined) updateData.note_sur = data.note_sur;
      if (data.coefficient !== undefined) updateData.coefficient = data.coefficient;

      const { error } = await supabase
        .from('devoirs')
        .update(updateData)
        .eq('id', id)
        .eq('enseignant_id', user.id);

      if (error) throw error;

      await loadEvaluations();
      return true;
    } catch (err) {
      console.error('Error updating evaluation:', err);
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
      return false;
    }
  }, [user, loadEvaluations]);

  const deleteEvaluation = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('devoirs')
        .delete()
        .eq('id', id)
        .eq('enseignant_id', user.id);

      if (error) throw error;

      await loadEvaluations();
      return true;
    } catch (err) {
      console.error('Error deleting evaluation:', err);
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
      return false;
    }
  }, [user, loadEvaluations]);

  const getEvaluationById = useCallback(async (id: string): Promise<EvaluationWithDetails | null> => {
    try {
      const { data, error } = await supabase
        .from('devoirs')
        .select(`
          id,
          type,
          titre,
          description,
          date_devoir,
          note_sur,
          coefficient,
          is_published,
          classe_id,
          classe_personnelle_id,
          matiere_id,
          created_at,
          updated_at,
          classe:classe_id(id, nom),
          classe_personnelle:classe_personnelle_id(id, nom),
          matiere:matiere_id(id, nom)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const isOfficielle = !!data.classe_id;
      return {
        id: data.id,
        type: data.type || 'devoir',
        titre: data.titre,
        description: data.description,
        date_evaluation: data.date_devoir,
        note_sur: data.note_sur,
        coefficient: data.coefficient,
        is_published: data.is_published,
        classe_id: data.classe_id,
        classe_personnelle_id: data.classe_personnelle_id,
        matiere_id: data.matiere_id,
        enseignant_id: user?.id || '',
        periode_id: null,
        annee_scolaire_id: null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        classe_nom: isOfficielle ? data.classe?.nom : data.classe_personnelle?.nom,
        classe_type: isOfficielle ? 'officielle' : 'personnelle',
        matiere_nom: data.matiere?.nom
      };
    } catch (err) {
      console.error('Error getting evaluation:', err);
      return null;
    }
  }, [user]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  return {
    evaluations,
    loading,
    error,
    refresh: loadEvaluations,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    getEvaluationById
  };
}