import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Enfant {
  id: string;
  nom: string;
  prenom: string;
  identifiant_connexion: string;
  educmaster?: string;
  classe_id?: string;
  classe_nom?: string;
  etablissement_id: string;
  etablissement_nom: string;
  type_lien: string;
  est_principal: boolean;
}

export function useEnfants() {
  const { user } = useAuth();
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chargerEnfants = useCallback(async () => {
    if (!user) {
      console.log('useEnfants: Pas d\'utilisateur');
      setEnfants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer le parent_id
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentError || !parentData) {
        console.log('useEnfants: Parent non trouvé');
        setEnfants([]);
        setLoading(false);
        return;
      }

      console.log('useEnfants: Parent ID:', parentData.id);

      // 2. Récupérer les liens parent_eleve
      const { data: liens, error: liensError } = await supabase
        .from('parent_eleve')
        .select('eleve_id, type_lien, est_principal')
        .eq('parent_id', parentData.id);

      if (liensError) {
        console.error('useEnfants: Erreur liens:', liensError);
        throw liensError;
      }

      if (!liens || liens.length === 0) {
        console.log('useEnfants: Aucun lien');
        setEnfants([]);
        setLoading(false);
        return;
      }

      console.log('useEnfants: Liens trouvés:', liens.length);

      const eleveIds = liens.map(l => l.eleve_id);

      // 3. Récupérer les élèves
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('id, user_id, identifiant_connexion, educmaster, classe_id, etablissement_id')
        .in('id', eleveIds);

      if (elevesError) {
        console.error('useEnfants: Erreur élèves:', elevesError);
        throw elevesError;
      }

      if (!elevesData || elevesData.length === 0) {
        console.log('useEnfants: Aucun élève trouvé');
        setEnfants([]);
        setLoading(false);
        return;
      }

      console.log('useEnfants: Élèves trouvés:', elevesData.length);

      // 4. Récupérer les profils (nom, prénom) pour chaque élève
      const userIds = elevesData.map(e => e.user_id).filter(Boolean);
      let profilesMap: Record<string, { nom: string; prenom: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { nom: p.nom || '', prenom: p.prenom || '' };
            return acc;
          }, {} as Record<string, { nom: string; prenom: string }>);
        }
      }

      // 5. Récupérer les noms des classes
      const classeIds = elevesData.map(e => e.classe_id).filter(Boolean);
      let classesMap: Record<string, { nom: string }> = {};

      if (classeIds.length > 0) {
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id, nom')
          .in('id', classeIds);

        if (!classesError && classes) {
          classesMap = classes.reduce((acc, c) => {
            acc[c.id] = { nom: c.nom };
            return acc;
          }, {} as Record<string, { nom: string }>);
        }
      }

      // 6. Récupérer les noms des établissements
      const etablissementIds = [...new Set(elevesData.map(e => e.etablissement_id))];
      let etablissementsMap: Record<string, { nom: string }> = {};

      if (etablissementIds.length > 0) {
        const { data: etablissements, error: etabError } = await supabase
          .from('etablissements')
          .select('id, nom')
          .in('id', etablissementIds);

        if (!etabError && etablissements) {
          etablissementsMap = etablissements.reduce((acc, e) => {
            acc[e.id] = { nom: e.nom };
            return acc;
          }, {} as Record<string, { nom: string }>);
        }
      }

      // 7. Assembler les résultats
      const enfantsFormatted: Enfant[] = [];

      for (const eleve of elevesData) {
        const lien = liens.find(l => l.eleve_id === eleve.id);
        const profile = profilesMap[eleve.user_id || ''] || { nom: '', prenom: '' };

        enfantsFormatted.push({
          id: eleve.id,
          nom: profile.nom,
          prenom: profile.prenom,
          identifiant_connexion: eleve.identifiant_connexion || '',
          educmaster: eleve.educmaster,
          classe_id: eleve.classe_id,
          classe_nom: classesMap[eleve.classe_id || '']?.nom,
          etablissement_id: eleve.etablissement_id,
          etablissement_nom: etablissementsMap[eleve.etablissement_id]?.nom || 'Établissement inconnu',
          type_lien: lien?.type_lien || 'autre',
          est_principal: lien?.est_principal || false,
        });
      }

      console.log('useEnfants: Enfants formatés:', enfantsFormatted.length);
      setEnfants(enfantsFormatted);
    } catch (err) {
      console.error('useEnfants: Erreur générale:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setEnfants([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    chargerEnfants();
  }, [chargerEnfants]);

  return {
    enfants,
    loading,
    error,
    refetch: chargerEnfants,
  };
}