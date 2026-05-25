import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ClassePersonnelle {
  id: string;
  nom: string;
  niveau: string;
  statut: 'personnel' | 'officiel' | 'archive';
  etablissement_id?: string;
  etablissement_nom?: string;
  capacite?: number;
  effectif: number;
  created_at: string;
}

export interface ElevePersonnel {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  email_parent?: string;
  telephone_parent?: string;
  statut: 'personnel' | 'officiel';
  classe_id: string;
  classe_nom: string;
  created_at: string;
}

export interface NotePersonnelle {
  id: string;
  note: number;
  note_sur: number;
  appreciation?: string;
  statut: 'personnel' | 'officiel' | 'livre';
  devoir_id: string;
  devoir_titre: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  created_at: string;
}

export function useTeacherCahier() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer toutes les classes de l'enseignant
  const getClasses = useCallback(async (): Promise<ClassePersonnelle[]> => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          nom,
          niveau,
          statut,
          capacite,
          etablissement_id,
          created_at,
          etablissements:etablissement_id (nom)
        `)
        .eq('enseignant_id', user.id)
        .eq('is_active', true)
        .neq('statut', 'archive')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Compter les élèves par classe
      const classesWithCount = await Promise.all(
        (data || []).map(async (classe: any) => {
          const { count, error: countError } = await supabase
            .from('eleves')
            .select('*', { count: 'exact', head: true })
            .eq('classe_id', classe.id);

          return {
            id: classe.id,
            nom: classe.nom,
            niveau: classe.niveau || '',
            statut: classe.statut || 'personnel',
            etablissement_id: classe.etablissement_id,
            etablissement_nom: classe.etablissements?.nom,
            capacite: classe.capacite,
            effectif: countError ? 0 : (count || 0),
            created_at: classe.created_at,
          };
        })
      );

      return classesWithCount;
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Récupérer les élèves d'une classe
  const getElevesByClasse = useCallback(async (classeId: string): Promise<ElevePersonnel[]> => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('*')
        .eq('classe_id', classeId)
        .eq('statut', 'actif')
        .order('nom', { ascending: true });

      if (error) throw error;

      return (data || []).map(e => ({
        id: e.id,
        nom: e.nom,
        prenom: e.prenom,
        matricule: e.matricule,
        email_parent: e.email_parent,
        telephone_parent: e.telephone_parent,
        statut: e.statut_personnel || 'personnel',
        classe_id: classeId,
        classe_nom: '',
        created_at: e.created_at,
      }));
    } catch (err) {
      console.error('Error fetching eleves:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Créer une classe personnelle
  const createClasse = useCallback(async (
    nom: string,
    niveau: string,
    etablissementId?: string
  ): Promise<{ success: boolean; data?: ClassePersonnelle; error?: string }> => {
    if (!user) return { success: false, error: 'Utilisateur non connecté' };

    setLoading(true);
    setError(null);

    try {
      const classeData: any = {
        nom,
        niveau,
        enseignant_id: user.id,
        statut: etablissementId ? 'officiel' : 'personnel',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      if (etablissementId) {
        classeData.etablissement_id = etablissementId;
      }

      const { data, error } = await supabase
        .from('classes')
        .insert(classeData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          nom: data.nom,
          niveau: data.niveau || '',
          statut: data.statut,
          etablissement_id: data.etablissement_id,
          effectif: 0,
          created_at: data.created_at,
        },
      };
    } catch (err) {
      console.error('Error creating class:', err);
      setError(err instanceof Error ? err.message : 'Erreur de création');
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de création' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Ajouter un élève à une classe
  const addEleve = useCallback(async (
    classeId: string,
    nom: string,
    prenom: string,
    emailParent?: string,
    telephoneParent?: string
  ): Promise<{ success: boolean; data?: ElevePersonnel; error?: string }> => {
    if (!user) return { success: false, error: 'Utilisateur non connecté' };

    setLoading(true);
    setError(null);

    try {
      // Récupérer la classe pour savoir si elle est rattachée à un établissement
      const { data: classe, error: classeError } = await supabase
        .from('classes')
        .select('etablissement_id, statut')
        .eq('id', classeId)
        .single();

      if (classeError) throw classeError;

      const eleveData: any = {
        classe_id: classeId,
        nom: nom.toUpperCase(),
        prenom,
        matricule: `EL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        statut: 'actif',
        enseignant_id: user.id,
        statut_personnel: classe.etablissement_id ? 'officiel' : 'personnel',
        created_at: new Date().toISOString(),
      };

      if (emailParent) eleveData.email_parent = emailParent;
      if (telephoneParent) eleveData.telephone_parent = telephoneParent;
      if (classe.etablissement_id) eleveData.etablissement_id = classe.etablissement_id;

      const { data, error } = await supabase
        .from('eleves')
        .insert(eleveData)
        .select()
        .single();

      if (error) throw error;

      // Si email parent fourni, envoyer une invitation
      if (emailParent) {
        try {
          await supabase.functions.invoke('send-parent-invitation', {
            body: {
              email: emailParent,
              eleve_id: data.id,
              eleve_nom: `${prenom} ${nom}`,
              enseignant_nom: user.user_metadata?.full_name || 'Un enseignant',
            },
          });
        } catch (inviteError) {
          console.error('Error sending parent invitation:', inviteError);
        }
      }

      return {
        success: true,
        data: {
          id: data.id,
          nom: data.nom,
          prenom: data.prenom,
          matricule: data.matricule,
          email_parent: data.email_parent,
          telephone_parent: data.telephone_parent,
          statut: data.statut_personnel || 'personnel',
          classe_id: classeId,
          classe_nom: '',
          created_at: data.created_at,
        },
      };
    } catch (err) {
      console.error('Error adding student:', err);
      setError(err instanceof Error ? err.message : 'Erreur d\'ajout');
      return { success: false, error: err instanceof Error ? err.message : 'Erreur d\'ajout' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Vérifier la limite de classes
  const checkClassesLimit = useCallback(async (): Promise<{ canCreate: boolean; currentCount: number; maxLimit: number }> => {
    if (!user) return { canCreate: false, currentCount: 0, maxLimit: 3 };

    try {
      const { count, error } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('enseignant_id', user.id)
        .eq('is_active', true)
        .neq('statut', 'archive');

      if (error) throw error;

      const maxLimit = 3; // Limite gratuite
      return {
        canCreate: (count || 0) < maxLimit,
        currentCount: count || 0,
        maxLimit,
      };
    } catch (err) {
      console.error('Error checking classes limit:', err);
      return { canCreate: true, currentCount: 0, maxLimit: 3 };
    }
  }, [user]);

  return {
    loading,
    error,
    getClasses,
    getElevesByClasse,
    createClasse,
    addEleve,
    checkClassesLimit,
  };
}