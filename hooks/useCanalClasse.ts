import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Message {
  id: string;
  expediteur_id: string;
  expediteur_nom: string;
  expediteur_prenom: string;
  contenu: string;
  is_pinned: boolean;
  created_at: string;
}

export interface CanalInfo {
  id: string;
  nom: string;
  mode: 'moderation' | 'libre' | 'ferme';
  est_archive: boolean;
  animateur_id: string;
  classe_id: string;
}

export function useCanalClasse(classeId?: string) {
  const { user } = useAuth();
  const [canal, setCanal] = useState<CanalInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [membres, setMembres] = useState<{ user_id: string; nom: string; prenom: string; est_actif: boolean }[]>([]);
  const [peutEcrire, setPeutEcrire] = useState(false);
  const [estAnimateur, setEstAnimateur] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chargerCanal = useCallback(async () => {
    if (!user || !classeId) {
      setCanal(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer le canal de la classe
      const { data: canalData, error: canalError } = await supabase
        .from('canaux_classe')
        .select('*')
        .eq('classe_id', classeId)
        .eq('est_archive', false)
        .maybeSingle();

      if (canalError) throw canalError;

      if (!canalData) {
        setCanal(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      setCanal(canalData);

      // 2. Récupérer les messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages_canal')
        .select(`
          id,
          expediteur_id,
          contenu,
          is_pinned,
          created_at,
          expediteur:expediteur_id (nom, prenom)
        `)
        .eq('canal_id', canalData.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const formattedMessages: Message[] = (messagesData || []).map(m => ({
        id: m.id,
        expediteur_id: m.expediteur_id,
        expediteur_nom: (m.expediteur as any)?.nom || '',
        expediteur_prenom: (m.expediteur as any)?.prenom || '',
        contenu: m.contenu,
        is_pinned: m.is_pinned,
        created_at: m.created_at,
      }));

      setMessages(formattedMessages);

      // 3. Récupérer les membres et vérifier les droits de l'utilisateur
      const { data: membresData, error: membresError } = await supabase
        .from('membres_canal')
        .select(`
          user_id,
          est_actif,
          peut_ecrire,
          role,
          user:user_id (nom, prenom)
        `)
        .eq('canal_id', canalData.id);

      if (membresError) throw membresError;

      const membreActuel = (membresData || []).find(m => m.user_id === user.id);
      const estAnimateurFlag = membreActuel?.role === 'animateur';
      const peutEcrireFlag = estAnimateurFlag || (membreActuel?.est_actif && membreActuel?.peut_ecrire && canalData.mode === 'libre');

      setEstAnimateur(estAnimateurFlag);
      setPeutEcrire(peutEcrireFlag);

      const membresFormatted = (membresData || [])
        .filter(m => m.user_id !== canalData.animateur_id)
        .map(m => ({
          user_id: m.user_id,
          nom: (m.user as any)?.nom || '',
          prenom: (m.user as any)?.prenom || '',
          est_actif: m.est_actif,
        }));

      setMembres(membresFormatted);
    } catch (err) {
      console.error('Erreur chargement canal:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user, classeId]);

  const envoyerMessage = useCallback(async (contenu: string): Promise<boolean> => {
    if (!canal || !peutEcrire || !contenu.trim()) return false;

    setSending(true);

    try {
      const { error } = await supabase
        .from('messages_canal')
        .insert({
          canal_id: canal.id,
          expediteur_id: user?.id,
          contenu: contenu.trim(),
        });

      if (error) throw error;

      await chargerCanal();
      return true;
    } catch (err) {
      console.error('Erreur envoi message:', err);
      setError(err instanceof Error ? err.message : 'Erreur envoi');
      return false;
    } finally {
      setSending(false);
    }
  }, [canal, peutEcrire, user, chargerCanal]);

  const changerMode = useCallback(async (mode: 'moderation' | 'libre' | 'ferme'): Promise<boolean> => {
    if (!canal || !estAnimateur) return false;

    try {
      const { data, error } = await supabase.functions.invoke('canaux', {
        body: { action: 'changer_mode', canal_id: canal.id, mode },
      });

      if (error || !data?.success) throw new Error(data?.error || 'Erreur');

      await chargerCanal();
      return true;
    } catch (err) {
      console.error('Erreur changement mode:', err);
      setError(err instanceof Error ? err.message : 'Erreur');
      return false;
    }
  }, [canal, estAnimateur, chargerCanal]);

  const exclureMembre = useCallback(async (userId: string): Promise<boolean> => {
    if (!canal || !estAnimateur) return false;

    try {
      const { data, error } = await supabase.functions.invoke('canaux', {
        body: { action: 'exclure_membre', canal_id: canal.id, user_id: userId },
      });

      if (error || !data?.success) throw new Error(data?.error || 'Erreur');

      await chargerCanal();
      return true;
    } catch (err) {
      console.error('Erreur exclusion:', err);
      return false;
    }
  }, [canal, estAnimateur, chargerCanal]);

  const reintegrerMembre = useCallback(async (userId: string): Promise<boolean> => {
    if (!canal || !estAnimateur) return false;

    try {
      const { data, error } = await supabase.functions.invoke('canaux', {
        body: { action: 'reintegrer_membre', canal_id: canal.id, user_id: userId },
      });

      if (error || !data?.success) throw new Error(data?.error || 'Erreur');

      await chargerCanal();
      return true;
    } catch (err) {
      console.error('Erreur réintégration:', err);
      return false;
    }
  }, [canal, estAnimateur, chargerCanal]);

  const pingerMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!canal || !estAnimateur) return false;

    try {
      const { data, error } = await supabase.functions.invoke('canaux', {
        body: { action: 'pinger_message', message_id: messageId },
      });

      if (error || !data?.success) throw new Error(data?.error || 'Erreur');

      await chargerCanal();
      return true;
    } catch (err) {
      console.error('Erreur épinglage:', err);
      return false;
    }
  }, [canal, estAnimateur, chargerCanal]);

  useEffect(() => {
    chargerCanal();
  }, [chargerCanal]);

  return {
    canal,
    messages,
    membres,
    peutEcrire,
    estAnimateur,
    loading,
    sending,
    error,
    envoyerMessage,
    changerMode,
    exclureMembre,
    reintegrerMembre,
    pingerMessage,
    refetch: chargerCanal,
  };
}