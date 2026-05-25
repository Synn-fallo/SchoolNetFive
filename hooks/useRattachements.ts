import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RattachementClasse {
  id: string;
  classe_id: string;
  classe_nom: string;
  classe_niveau: string;
  role: 'responsable' | 'intervenant' | 'principal';
}

export interface RattachementMatiere {
  id: string;
  matiere_id: string;
  matiere_nom: string;
  matiere_code: string;
  classe_id?: string;
  classe_nom?: string;
}

export interface RattachementGroupe {
  id: string;
  groupe_id: string;
  groupe_nom: string;
  matiere_id: string;
  matiere_nom: string;
  role: 'responsable' | 'intervenant';
  classe_nom: string;
  eleves_count: number;
}

export function useRattachements(enseignantId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<RattachementClasse[]>([]);
  const [matieres, setMatieres] = useState<RattachementMatiere[]>([]);
  const [groupes, setGroupes] = useState<RattachementGroupe[]>([]);

  const loadClasses = useCallback(async () => {
    if (!enseignantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enseignant_classes')
        .select(`
          id,
          role,
          classe:classe_id(id, nom, niveau)
        `)
        .eq('enseignant_id', enseignantId);

      if (error) throw error;

      const formatted: RattachementClasse[] = (data || []).map(item => ({
        id: item.id,
        classe_id: item.classe.id,
        classe_nom: item.classe.nom,
        classe_niveau: item.classe.niveau,
        role: item.role,
      }));

      setClasses(formatted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des classes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enseignantId]);

  const loadMatieres = useCallback(async () => {
    if (!enseignantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enseignant_matieres')
        .select(`
          id,
          matiere:matiere_id(id, nom, code),
          classe_id
        `)
        .eq('enseignant_id', enseignantId);

      if (error) throw error;

      const formatted: RattachementMatiere[] = await Promise.all(
        (data || []).map(async item => {
          let classe_nom: string | undefined;
          if (item.classe_id) {
            const { data: classe } = await supabase
              .from('classes')
              .select('nom')
              .eq('id', item.classe_id)
              .single();
            classe_nom = classe?.nom;
          }

          return {
            id: item.id,
            matiere_id: item.matiere.id,
            matiere_nom: item.matiere.nom,
            matiere_code: item.matiere.code,
            classe_id: item.classe_id,
            classe_nom,
          };
        })
      );

      setMatieres(formatted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des matières';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enseignantId]);

  const loadGroupes = useCallback(async () => {
    if (!enseignantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enseignant_groupes')
        .select(`
          id,
          role,
          groupe:groupe_id(id, nom),
          matiere:matiere_id(id, nom)
        `)
        .eq('enseignant_id', enseignantId);

      if (error) throw error;

      const formatted: RattachementGroupe[] = await Promise.all(
        (data || []).map(async item => {
          // Récupérer la classe du groupe
          const { data: groupeDetail } = await supabase
            .from('groupes_eleves')
            .select('classe:classe_id(nom)')
            .eq('id', item.groupe.id)
            .single();

          // Compter les élèves dans le groupe
          const { count } = await supabase
            .from('eleve_groupes')
            .select('*', { count: 'exact', head: true })
            .eq('groupe_id', item.groupe.id);

          return {
            id: item.id,
            groupe_id: item.groupe.id,
            groupe_nom: item.groupe.nom,
            matiere_id: item.matiere.id,
            matiere_nom: item.matiere.nom,
            role: item.role,
            classe_nom: groupeDetail?.classe?.nom || '',
            eleves_count: count || 0,
          };
        })
      );

      setGroupes(formatted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des groupes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enseignantId]);

  const addClasse = useCallback(async (classeId: string, role: 'responsable' | 'intervenant'): Promise<boolean> => {
    if (!enseignantId) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('enseignant_classes')
        .insert({
          enseignant_id: enseignantId,
          classe_id: classeId,
          role,
        });

      if (error) throw error;
      await loadClasses();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
      return false;
    } finally {
      setLoading(false);
    }
  }, [enseignantId, loadClasses]);

  const removeClasse = useCallback(async (rattachementId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('enseignant_classes')
        .delete()
        .eq('id', rattachementId);

      if (error) throw error;
      await loadClasses();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadClasses]);

  const addMatiere = useCallback(async (matiereId: string, classeId?: string): Promise<boolean> => {
    if (!enseignantId) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('enseignant_matieres')
        .insert({
          enseignant_id: enseignantId,
          matiere_id: matiereId,
          classe_id: classeId || null,
        });

      if (error) throw error;
      await loadMatieres();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
      return false;
    } finally {
      setLoading(false);
    }
  }, [enseignantId, loadMatieres]);

  const removeMatiere = useCallback(async (rattachementId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('enseignant_matieres')
        .delete()
        .eq('id', rattachementId);

      if (error) throw error;
      await loadMatieres();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadMatieres]);

  const addGroupe = useCallback(async (groupeId: string, matiereId: string, role: 'responsable' | 'intervenant'): Promise<boolean> => {
    if (!enseignantId) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('enseignant_groupes')
        .insert({
          enseignant_id: enseignantId,
          groupe_id: groupeId,
          matiere_id: matiereId,
          role,
        });

      if (error) throw error;
      await loadGroupes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
      return false;
    } finally {
      setLoading(false);
    }
  }, [enseignantId, loadGroupes]);

  const removeGroupe = useCallback(async (rattachementId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('enseignant_groupes')
        .delete()
        .eq('id', rattachementId);

      if (error) throw error;
      await loadGroupes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadGroupes]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadClasses(), loadMatieres(), loadGroupes()]);
  }, [loadClasses, loadMatieres, loadGroupes]);

  return {
    loading,
    error,
    classes,
    matieres,
    groupes,
    loadClasses,
    loadMatieres,
    loadGroupes,
    loadAll,
    addClasse,
    removeClasse,
    addMatiere,
    removeMatiere,
    addGroupe,
    removeGroupe,
  };
}