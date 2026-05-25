import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Message {
  id: string;
  expediteur_id: string;
  destinataire_id: string;
  contenu: string;
  is_read: boolean;
  created_at: string;
  expediteur_nom?: string;
  expediteur_prenom?: string;
  destinataire_nom?: string;
  destinataire_prenom?: string;
}

export interface EnseignantContact {
  id: string;
  nom: string;
  prenom: string;
  matiere?: string;
}

export function useMessagesParent(enfantId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [enseignants, setEnseignants] = useState<EnseignantContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les enseignants des enfants du parent
  const chargerEnseignants = useCallback(async () => {
    if (!user) return [];

    try {
      // Récupérer les parents
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!parentData) return [];

      // Récupérer les enfants
      let query = supabase
        .from('parent_eleve')
        .select('eleve_id')
        .eq('parent_id', parentData.id);

      if (enfantId) {
        query = query.eq('eleve_id', enfantId);
      }

      const { data: liens } = await query;
      if (!liens || liens.length === 0) return [];

      const eleveIds = liens.map(l => l.eleve_id);

      // Récupérer les classes des enfants
      const { data: eleves } = await supabase
        .from('eleves')
        .select('classe_id')
        .in('id', eleveIds);

      if (!eleves || eleves.length === 0) return [];

      const classeIds = [...new Set(eleves.map(e => e.classe_id).filter(Boolean))];

      // Récupérer les enseignants de ces classes
      const { data: enseignantsData } = await supabase
        .from('enseignant_classes')
        .select(`
          enseignant_id,
          matiere_id,
          profiles:enseignant_id (id, nom, prenom),
          matieres:matiere_id (nom)
        `)
        .in('classe_id', classeIds);

      if (!enseignantsData) return [];

      const uniqueEnseignants = new Map<string, EnseignantContact>();
      for (const e of enseignantsData) {
        const profile = e.profiles as any;
        if (profile && !uniqueEnseignants.has(profile.id)) {
          uniqueEnseignants.set(profile.id, {
            id: profile.id,
            nom: profile.nom || '',
            prenom: profile.prenom || '',
            matiere: (e.matieres as any)?.nom,
          });
        }
      }

      const enseignantsList = Array.from(uniqueEnseignants.values());
      setEnseignants(enseignantsList);
      return enseignantsList;
    } catch (err) {
      console.error('Erreur chargement enseignants:', err);
      return [];
    }
  }, [user, enfantId]);

  // Récupérer les messages
  const chargerMessages = useCallback(async () => {
    if (!user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Récupérer le parent
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!parentData) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Récupérer les messages reçus par le parent
      const { data: received, error: receivedError } = await supabase
        .from('messages')
        .select(`
          *,
          expediteur:expediteur_id (nom, prenom),
          destinataire:destinataire_id (nom, prenom)
        `)
        .eq('destinataire_id', user.id)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Récupérer les messages envoyés par le parent
      const { data: sent, error: sentError } = await supabase
        .from('messages')
        .select(`
          *,
          expediteur:expediteur_id (nom, prenom),
          destinataire:destinataire_id (nom, prenom)
        `)
        .eq('expediteur_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      const allMessages = [...(received || []), ...(sent || [])];
      allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const formattedMessages: Message[] = allMessages.map(m => ({
        id: m.id,
        expediteur_id: m.expediteur_id,
        destinataire_id: m.destinataire_id,
        contenu: m.contenu,
        is_read: m.is_read,
        created_at: m.created_at,
        expediteur_nom: (m.expediteur as any)?.prenom,
        expediteur_prenom: (m.expediteur as any)?.nom,
        destinataire_nom: (m.destinataire as any)?.prenom,
        destinataire_prenom: (m.destinataire as any)?.nom,
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Envoyer un message
  const envoyerMessage = useCallback(async (
    destinataireId: string,
    contenu: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !contenu.trim()) {
      return { success: false, error: 'Message vide ou utilisateur non connecté' };
    }

    setSending(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          expediteur_id: user.id,
          destinataire_id: destinataireId,
          contenu: contenu.trim(),
          is_read: false,
        });

      if (error) throw error;

      await chargerMessages();
      return { success: true };
    } catch (err) {
      console.error('Erreur envoi message:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setSending(false);
    }
  }, [user, chargerMessages]);

  // Marquer un message comme lu
  const marquerCommeLu = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, is_read: true } : m
      ));
    } catch (err) {
      console.error('Erreur marquage lu:', err);
    }
  }, []);

  useEffect(() => {
    chargerMessages();
    chargerEnseignants();
  }, [chargerMessages, chargerEnseignants]);

  return {
    messages,
    enseignants,
    loading,
    sending,
    error,
    envoyerMessage,
    marquerCommeLu,
    refetch: chargerMessages,
    refetchEnseignants: chargerEnseignants,
  };
}