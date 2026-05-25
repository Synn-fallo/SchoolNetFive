import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EtablissementInfo {
  id: string;
  nom: string;
  slug: string;
  ville?: string;
  statut: string;
}

export function useActiveEtablissement() {
  const { user, activeRole } = useAuth();
  const [activeEtablissement, setActiveEtablissement] = useState<EtablissementInfo | null>(null);
  const [allEtablissements, setAllEtablissements] = useState<EtablissementInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer tous les établissements du chef OU les établissements partenaires
  const fetchAllEtablissements = useCallback(async () => {
    if (!user) return [];

    try {
      // Cas 1 : Chef d'établissement
      if (activeRole === 'chef_etablissement') {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('etablissement_id')
          .eq('user_id', user.id)
          .eq('role', 'chef_etablissement')
          .eq('is_active', true)
          .not('etablissement_id', 'is', null);

        if (rolesError) throw rolesError;

        if (!rolesData || rolesData.length === 0) return [];

        const etablissementIds = rolesData.map(r => r.etablissement_id);
        
        const { data: etabsData, error: etabsError } = await supabase
          .from('etablissements')
          .select('id, nom, slug, ville, statut')
          .in('id', etablissementIds)
          .order('created_at', { ascending: true });

        if (etabsError) throw etabsError;
        
        return etabsData || [];
      }
      
      // Cas 2 : Partenaire (récupérer les établissements via partenariats_etablissements)
      if (activeRole === 'partenaire') {
        const { data: partenariats, error: partError } = await supabase
          .from('partenariats_etablissements')
          .select('etablissement_id')
          .eq('partenaire_id', user.id)
          .eq('statut', 'actif');

        if (partError) throw partError;

        if (!partenariats || partenariats.length === 0) return [];

        const etablissementIds = partenariats.map(p => p.etablissement_id);
        
        const { data: etabsData, error: etabsError } = await supabase
          .from('etablissements')
          .select('id, nom, slug, ville, statut')
          .in('id', etablissementIds)
          .order('created_at', { ascending: true });

        if (etabsError) throw etabsError;
        
        return etabsData || [];
      }
      
      // Cas 3 : Autorité (pas d'établissement unique, retourne tableau vide)
      if (activeRole === 'autorite') {
        return [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching etablissements:', error);
      return [];
    }
  }, [user, activeRole]);

  // Charger l'établissement actif depuis user_preferences
  const loadActiveEtablissement = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Récupérer tous les établissements
      const etablissements = await fetchAllEtablissements();
      setAllEtablissements(etablissements);

      if (etablissements.length === 0) {
        setActiveEtablissement(null);
        setLoading(false);
        return;
      }

      // Récupérer la préférence
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      const savedId = prefs?.preferences?.active_etablissement_id;
      
      // Chercher l'établissement sauvegardé ou prendre le premier
      let active = etablissements.find(e => e.id === savedId);
      if (!active && etablissements.length > 0) {
        active = etablissements[0];
        // Sauvegarder le premier comme actif par défaut
        await saveActiveEtablissement(active.id);
      }
      
      setActiveEtablissement(active || null);
    } catch (error) {
      console.error('Error loading active etablissement:', error);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user, fetchAllEtablissements]);

  // Sauvegarder l'établissement actif
  const saveActiveEtablissement = useCallback(async (etablissementId: string) => {
    if (!user) return false;

    try {
      const { data: existingPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('id, preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      const newPreferences = {
        ...(existingPrefs?.preferences || {}),
        active_etablissement_id: etablissementId,
      };

      if (existingPrefs) {
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({ preferences: newPreferences })
          .eq('id', existingPrefs.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            preferences: newPreferences,
          });
        if (insertError) throw insertError;
      }

      // Mettre à jour l'état local
      const newActive = allEtablissements.find(e => e.id === etablissementId);
      if (newActive) {
        setActiveEtablissement(newActive);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving active etablissement:', error);
      return false;
    }
  }, [user, allEtablissements]);

  // Changer d'établissement actif
  const switchToEtablissement = useCallback(async (etablissementId: string) => {
    const etablissement = allEtablissements.find(e => e.id === etablissementId);
    if (!etablissement) return false;
    
    const success = await saveActiveEtablissement(etablissementId);
    if (success) {
      setActiveEtablissement(etablissement);
    }
    return success;
  }, [allEtablissements, saveActiveEtablissement]);

  // Rafraîchir la liste
  const refresh = useCallback(async () => {
    await loadActiveEtablissement();
  }, [loadActiveEtablissement]);

  useEffect(() => {
    loadActiveEtablissement();
  }, [loadActiveEtablissement]);

  return {
    activeEtablissement,
    allEtablissements,
    loading,
    error,
    switchToEtablissement,
    refresh,
    hasMultipleEtablissements: allEtablissements.length > 1,
    count: allEtablissements.length,
  };
}