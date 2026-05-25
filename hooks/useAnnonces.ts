import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Annonce {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  visibilite: string;
  etablissement_id: string;
  classe_id?: string;
  publie_par_id: string;
  est_publiee: boolean;
  est_epingle: boolean;
  commentaires_actifs: boolean;
  visibilite_commentaires: 'masques' | 'visibles';
  afficher_accuse_lecture: boolean;
  date_desactivation?: string;
  date_debut?: string;
  date_fin?: string;
  created_at: string;
  publie_par_nom?: string;
  publie_par_prenom?: string;
}

export interface ReactionCounts {
  like: number;
  participe: number;
  question: number;
  notify: number;
}

export function useAnnonces() {
  const { user, activeRole } = useAuth();
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chargerAnnonces = useCallback(async () => {
    if (!user) {
      setAnnonces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('annonces_institutionnelles')
        .select(`
          *,
          publie_par:publie_par_id (nom, prenom)
        `)
        .eq('est_publiee', true)
        .order('est_epingle', { ascending: false })
        .order('created_at', { ascending: false });

      // Filtrer selon le rôle
      if (activeRole === 'parent') {
        const { data: parentData } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (parentData) {
          const { data: enfants } = await supabase
            .from('parent_eleve')
            .select('eleve:eleve_id (classe_id, etablissement_id)')
            .eq('parent_id', parentData.id);

          const classeIds: string[] = [];
          const etablissementIds: string[] = [];

          for (const item of enfants || []) {
            const eleve = item.eleve as any;
            if (eleve?.classe_id) classeIds.push(eleve.classe_id);
            if (eleve?.etablissement_id) etablissementIds.push(eleve.etablissement_id);
          }

          if (classeIds.length > 0 || etablissementIds.length > 0) {
            const filters: string[] = [];
            if (classeIds.length > 0) filters.push(`classe_id.in.(${classeIds.join(',')})`);
            if (etablissementIds.length > 0) filters.push(`etablissement_id.in.(${etablissementIds.join(',')})`);
            filters.push(`visibilite.eq.tous`);
            query = query.or(filters.join(','));
          }
        }
      } else if (activeRole === 'eleve') {
        const { data: eleve } = await supabase
          .from('eleves')
          .select('classe_id, etablissement_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (eleve) {
          query = query.or(`classe_id.eq.${eleve.classe_id},etablissement_id.eq.${eleve.etablissement_id},visibilite.eq.tous`);
        }
      } else if (activeRole === 'enseignant') {
        const { data: classes } = await supabase
          .from('enseignant_classes')
          .select('classe_id')
          .eq('enseignant_id', user.id);

        const classeIds = classes?.map(c => c.classe_id) || [];
        if (classeIds.length > 0) {
          query = query.or(`classe_id.in.(${classeIds.join(',')}),visibilite.eq.tous`);
        }
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        publie_par_nom: item.publie_par?.nom,
        publie_par_prenom: item.publie_par?.prenom,
      }));

      setAnnonces(formatted);
    } catch (err) {
      console.error('Erreur chargement annonces:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user, activeRole]);

  // Ajouter un commentaire
  const commenter = useCallback(async (annonceId: string, contenu: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.functions.invoke('commenter-annonce', {
        body: { annonce_id: annonceId, contenu },
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erreur commentaire:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, []);

  // Ajouter/supprimer une réaction
  const reagir = useCallback(async (
    annonceId: string,
    reaction: 'like' | 'participe' | 'question' | 'notify',
    action: 'add' | 'remove'
  ): Promise<{ success: boolean; reactionCounts?: ReactionCounts; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('reagir-annonce', {
        body: { annonce_id: annonceId, reaction, action },
      });
      if (error) throw error;
      return { success: true, reactionCounts: data.reactionCounts };
    } catch (err) {
      console.error('Erreur réaction:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, []);

  // Confirmer présence
  const confirmerPresence = useCallback(async (
    annonceId: string,
    confirme: boolean
  ): Promise<{ success: boolean; totalConfirmations?: number; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('confirmer-presence', {
        body: { annonce_id: annonceId, confirme },
      });
      if (error) throw error;
      return { success: true, totalConfirmations: data.totalConfirmations };
    } catch (err) {
      console.error('Erreur confirmation:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, []);

  // Marquer comme lu
  const marquerLu = useCallback(async (annonceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.functions.invoke('marquer-lu', {
        body: { annonce_id: annonceId },
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erreur marquer lu:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, []);

  useEffect(() => {
    chargerAnnonces();
  }, [chargerAnnonces]);

  return {
    annonces,
    loading,
    error,
    commenter,
    reagir,
    confirmerPresence,
    marquerLu,
    refetch: chargerAnnonces,
  };
}