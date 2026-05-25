import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface NoteAlertConfig {
  id?: string;
  eleve_id: string;
  matiere_id?: string; // null = toutes matières
  seuil: number;
  type: 'inférieur' | 'supérieur';
  active: boolean;
  notification_channels: ('push' | 'email' | 'sms')[];
}

export function useNoteNotifications(eleveId?: string) {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<NoteAlertConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Charger les configurations d'alertes
  const loadConfigs = useCallback(async () => {
    if (!eleveId) {
      setConfigs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('note_alerts')
        .select('*')
        .eq('eleve_id', eleveId);

      if (error) throw error;

      setConfigs(data || []);
    } catch (err) {
      console.error('Error loading note alerts:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [eleveId]);

  // Créer une nouvelle alerte
  const createAlert = useCallback(async (config: Omit<NoteAlertConfig, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('note_alerts')
        .insert({
          eleve_id: config.eleve_id,
          matiere_id: config.matiere_id || null,
          seuil: config.seuil,
          type: config.type,
          active: config.active,
          notification_channels: config.notification_channels,
        })
        .select()
        .single();

      if (error) throw error;

      setConfigs(prev => [...prev, data]);
      return { success: true, data };
    } catch (err) {
      console.error('Error creating note alert:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, []);

  // Mettre à jour une alerte
  const updateAlert = useCallback(async (id: string, updates: Partial<NoteAlertConfig>) => {
    try {
      const { data, error } = await supabase
        .from('note_alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setConfigs(prev => prev.map(c => c.id === id ? data : c));
      return { success: true, data };
    } catch (err) {
      console.error('Error updating note alert:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, []);

  // Supprimer une alerte
  const deleteAlert = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('note_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConfigs(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting note alert:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, []);

  // Vérifier une note par rapport aux alertes et envoyer une notification si nécessaire
  const checkAndNotify = useCallback(async (note: {
    note: number;
    matiere_id: string;
    eleve_id: string;
    eleve_nom: string;
    matiere_nom: string;
  }) => {
    if (!configs.length) return;

    const matchingAlerts = configs.filter(config => {
      if (!config.active) return false;
      if (config.matiere_id && config.matiere_id !== note.matiere_id) return false;
      if (config.type === 'inférieur' && note.note < config.seuil) return true;
      if (config.type === 'supérieur' && note.note > config.seuil) return true;
      return false;
    });

    if (matchingAlerts.length === 0) return;

    // Récupérer les parents de l'élève
    const { data: eleve } = await supabase
      .from('eleves')
      .select('parent_id')
      .eq('id', note.eleve_id)
      .single();

    const parentIds = eleve?.parent_id ? [eleve.parent_id] : [];

    // Récupérer l'élève lui-même
    const { data: userData } = await supabase
      .from('eleves')
      .select('user_id')
      .eq('id', note.eleve_id)
      .single();

    const userIds = [...parentIds];
    if (userData?.user_id) userIds.push(userData.user_id);

    if (userIds.length === 0) return;

    // Pour chaque alerte, envoyer une notification
    for (const alert of matchingAlerts) {
      const template = alert.type === 'inférieur' ? 'note_seuil_bas' : 'note_seuil_haut';
      
      try {
        await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            user_ids: userIds,
            type: 'note',
            template,
            data: {
              eleve_nom: note.eleve_nom,
              matiere: note.matiere_nom,
              note: note.note,
              seuil: alert.seuil,
            },
          }),
        });
      } catch (err) {
        console.error('Error sending notification:', err);
      }
    }
  }, [configs]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return {
    loading,
    error,
    configs,
    createAlert,
    updateAlert,
    deleteAlert,
    checkAndNotify,
    refresh: loadConfigs,
  };
}