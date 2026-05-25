import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Bulletin {
  id: string;
  periode: string;
  moyenne_generale: number;
  rang: number;
  effectif: number;
  appreciation_generale?: string;
  bulletin_url?: string;
  annee_scolaire_id?: string;
  created_at: string;
}

export function useBulletinsParent(enfantId: string) {
  const { user } = useAuth();
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chargerBulletins = useCallback(async () => {
    if (!user || !enfantId) {
      setBulletins([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier que l'enfant appartient bien au parent
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentError || !parentData) {
        setBulletins([]);
        setLoading(false);
        return;
      }

      const { data: lien, error: lienError } = await supabase
        .from('parent_eleve')
        .select('id')
        .eq('parent_id', parentData.id)
        .eq('eleve_id', enfantId)
        .maybeSingle();

      if (lienError || !lien) {
        setError('Accès non autorisé à cet enfant');
        setBulletins([]);
        setLoading(false);
        return;
      }

      // Récupérer les bulletins
      const { data, error: bulletinsError } = await supabase
        .from('bulletins')
        .select('*')
        .eq('eleve_id', enfantId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (bulletinsError) throw bulletinsError;

      setBulletins(data || []);
    } catch (err) {
      console.error('Erreur chargement bulletins:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setBulletins([]);
    } finally {
      setLoading(false);
    }
  }, [user, enfantId]);

  useEffect(() => {
    chargerBulletins();
  }, [chargerBulletins]);

  return {
    bulletins,
    loading,
    error,
    refetch: chargerBulletins,
  };
}