import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Groupe {
  id: string;
  classe_id: string;
  nom: string;
  description?: string;
  modele_groupe_id?: string;
  ordre?: number;
  eleves_count?: number;
  enseignant?: { id: string; nom: string; prenom: string; matiere_nom: string };
}

export interface ModeleGroupe {
  id: string;
  nom: string;
  type_suffixe: string;
  valeurs: string[];
}

export function useGroupes(classeId?: string) {
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroupes = useCallback(async () => {
    if (!classeId) {
      setGroupes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('groupes_eleves')
        .select('*')
        .eq('classe_id', classeId)
        .order('ordre', { ascending: true, nullsLast: true });

      if (error) throw error;

      const groupesWithCount = await Promise.all(
        (data || []).map(async (groupe) => {
          // Compter les élèves
          const { count, error: countError } = await supabase
            .from('eleve_groupes')
            .select('*', { count: 'exact', head: true })
            .eq('groupe_id', groupe.id);

          // Récupérer l'enseignant assigné
          const { data: enseignantData, error: enseignantError } = await supabase
            .from('enseignant_groupes')
            .select('enseignant_id, matiere_id, profiles:enseignant_id(nom, prenom), matieres:matiere_id(nom)')
            .eq('groupe_id', groupe.id)
            .maybeSingle();

          let enseignant = undefined;
          if (enseignantData && !enseignantError) {
            enseignant = {
              id: enseignantData.enseignant_id,
              nom: enseignantData.profiles?.nom || '',
              prenom: enseignantData.profiles?.prenom || '',
              matiere_nom: enseignantData.matieres?.nom || '',
            };
          }

          return {
            ...groupe,
            eleves_count: countError ? 0 : (count || 0),
            enseignant,
          };
        })
      );

      setGroupes(groupesWithCount);
    } catch (err) {
      console.error('Error loading groupes:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [classeId]);

  const createGroupe = useCallback(async (nom: string, description?: string, modeleGroupeId?: string, ordre?: number) => {
    if (!classeId) return { success: false, error: 'Aucune classe sélectionnée' };

    try {
      const { data, error } = await supabase
        .from('groupes_eleves')
        .insert({
          classe_id: classeId,
          nom,
          description: description || null,
          modele_groupe_id: modeleGroupeId || null,
          ordre: ordre || null,
        })
        .select()
        .single();

      if (error) throw error;

      await loadGroupes();
      return { success: true, data };
    } catch (err) {
      console.error('Error creating groupe:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de création' };
    }
  }, [classeId, loadGroupes]);

  const updateGroupe = useCallback(async (groupeId: string, updates: { nom?: string; description?: string }) => {
    try {
      const { error } = await supabase
        .from('groupes_eleves')
        .update(updates)
        .eq('id', groupeId);

      if (error) throw error;

      await loadGroupes();
      return { success: true };
    } catch (err) {
      console.error('Error updating groupe:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de mise à jour' };
    }
  }, [loadGroupes]);

  const deleteGroupe = useCallback(async (groupeId: string) => {
    try {
      await supabase
        .from('eleve_groupes')
        .delete()
        .eq('groupe_id', groupeId);

      const { error } = await supabase
        .from('groupes_eleves')
        .delete()
        .eq('id', groupeId);

      if (error) throw error;

      await loadGroupes();
      return { success: true };
    } catch (err) {
      console.error('Error deleting groupe:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de suppression' };
    }
  }, [loadGroupes]);

  const generateGroupesFromModele = useCallback(async (modele: ModeleGroupe) => {
    if (!classeId) return { success: false, error: 'Aucune classe sélectionnée' };

    try {
      const { data: existingGroupes } = await supabase
        .from('groupes_eleves')
        .select('id')
        .eq('classe_id', classeId);

      if (existingGroupes && existingGroupes.length > 0) {
        const groupeIds = existingGroupes.map(g => g.id);
        await supabase
          .from('eleve_groupes')
          .delete()
          .in('groupe_id', groupeIds);
        
        await supabase
          .from('groupes_eleves')
          .delete()
          .eq('classe_id', classeId);
      }

      const groupesData = modele.valeurs.map((valeur, index) => ({
        classe_id: classeId,
        nom: valeur,
        modele_groupe_id: modele.id,
        ordre: index + 1,
      }));

      const { error } = await supabase
        .from('groupes_eleves')
        .insert(groupesData);

      if (error) throw error;

      await loadGroupes();
      return { success: true };
    } catch (err) {
      console.error('Error generating groupes from modele:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de génération' };
    }
  }, [classeId, loadGroupes]);

  const addElevesToGroupe = useCallback(async (groupeId: string, eleveIds: string[]) => {
    try {
      const { error } = await supabase
        .from('eleve_groupes')
        .insert(eleveIds.map(eleveId => ({ eleve_id: eleveId, groupe_id: groupeId })));

      if (error) throw error;

      await loadGroupes();
      return { success: true };
    } catch (err) {
      console.error('Error adding eleves to groupe:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur d\'ajout' };
    }
  }, [loadGroupes]);

  const removeEleveFromGroupe = useCallback(async (eleveId: string, groupeId: string) => {
    try {
      const { error } = await supabase
        .from('eleve_groupes')
        .delete()
        .eq('eleve_id', eleveId)
        .eq('groupe_id', groupeId);

      if (error) throw error;

      await loadGroupes();
      return { success: true };
    } catch (err) {
      console.error('Error removing eleve from groupe:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de suppression' };
    }
  }, [loadGroupes]);

  const getElevesByGroupe = useCallback(async (groupeId: string) => {
    try {
      const { data, error } = await supabase
        .from('eleve_groupes')
        .select('eleve_id, eleves:eleve_id(matricule, user:user_id(prenom, nom))')
        .eq('groupe_id', groupeId);

      if (error) throw error;

      return data?.map(item => ({
        id: item.eleve_id,
        matricule: item.eleves?.matricule,
        prenom: item.eleves?.user?.prenom,
        nom: item.eleves?.user?.nom,
      })) || [];
    } catch (err) {
      console.error('Error getting eleves by groupe:', err);
      return [];
    }
  }, []);

  const assignEnseignantToGroupe = useCallback(async (groupeId: string, enseignantId: string, matiereId: string) => {
    try {
      const { error } = await supabase
        .from('enseignant_groupes')
        .upsert({
          groupe_id: groupeId,
          enseignant_id: enseignantId,
          matiere_id: matiereId,
          role: 'professeur',
        }, { onConflict: 'groupe_id' });

      if (error) throw error;

      await loadGroupes();
      return { success: true };
    } catch (err) {
      console.error('Error assigning enseignant to groupe:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur d\'assignation' };
    }
  }, [loadGroupes]);

  const removeEnseignantFromGroupe = useCallback(async (groupeId: string) => {
    try {
      const { error } = await supabase
        .from('enseignant_groupes')
        .delete()
        .eq('groupe_id', groupeId);

      if (error) throw error;

      await loadGroupes();
      return { success: true };
    } catch (err) {
      console.error('Error removing enseignant from groupe:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de suppression' };
    }
  }, [loadGroupes]);

  const getEnseignantByGroupe = useCallback(async (groupeId: string) => {
    try {
      const { data, error } = await supabase
        .from('enseignant_groupes')
        .select('enseignant_id, matiere_id, profiles:enseignant_id(nom, prenom), matieres:matiere_id(nom)')
        .eq('groupe_id', groupeId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          id: data.enseignant_id,
          nom: data.profiles?.nom || '',
          prenom: data.profiles?.prenom || '',
          matiere_nom: data.matieres?.nom || '',
        };
      }
      return null;
    } catch (err) {
      console.error('Error getting enseignant by groupe:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    loadGroupes();
  }, [loadGroupes]);

  return {
    groupes,
    loading,
    error,
    createGroupe,
    updateGroupe,
    deleteGroupe,
    generateGroupesFromModele,
    addElevesToGroupe,
    removeEleveFromGroupe,
    getElevesByGroupe,
    assignEnseignantToGroupe,
    removeEnseignantFromGroupe,
    getEnseignantByGroupe,
    refresh: loadGroupes,
  };
}