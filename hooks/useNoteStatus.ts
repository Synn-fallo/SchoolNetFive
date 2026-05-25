// /home/project/hooks/useNoteStatus.ts
// Hook pour la gestion des statuts des notes

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { NoteStatus } from '@/types/notes.types';

interface UseNoteStatusReturn {
  updating: boolean;
  error: string | null;
  updateNoteStatus: (noteId: string, newStatus: NoteStatus, reason?: string) => Promise<boolean>;
  updateBatchNoteStatus: (noteIds: string[], newStatus: NoteStatus) => Promise<{ success: boolean; failed: string[] }>;
  canTransition: (currentStatus: NoteStatus, newStatus: NoteStatus, isAffiliated: boolean) => boolean;
}

// Transitions autorisées
const ALLOWED_TRANSITIONS: Record<NoteStatus, NoteStatus[]> = {
  'en_attente': ['validee', 'annulee'],
  'validee': ['publiee', 'annulee'],
  'publiee': ['livree', 'revisee', 'annulee'],
  'livree': [],
  'revisee': ['publiee', 'livree', 'annulee'],
  'annulee': []
};

export function useNoteStatus(): UseNoteStatusReturn {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTransition = useCallback((currentStatus: NoteStatus, newStatus: NoteStatus, isAffiliated: boolean): boolean => {
    // Seul un enseignant affilié peut livrer une note
    if (newStatus === 'livree' && !isAffiliated) {
      return false;
    }
    
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    return allowed.includes(newStatus);
  }, []);

  const updateNoteStatus = useCallback(async (noteId: string, newStatus: NoteStatus, reason?: string): Promise<boolean> => {
    setUpdating(true);
    setError(null);

    try {
      // Appel à l'Edge Function existante
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-note-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ noteId, newStatus, reason }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }

      return true;
    } catch (err) {
      console.error('Error updating note status:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setUpdating(false);
    }
  }, []);

  const updateBatchNoteStatus = useCallback(async (noteIds: string[], newStatus: NoteStatus): Promise<{ success: boolean; failed: string[] }> => {
    setUpdating(true);
    setError(null);
    const failed: string[] = [];

    try {
      // Traitement en parallèle avec Promise.allSettled
      const results = await Promise.allSettled(
        noteIds.map(noteId => updateNoteStatus(noteId, newStatus))
      );

      results.forEach((result, index) => {
        if (result.status === 'rejected' || !result.value) {
          failed.push(noteIds[index]);
        }
      });

      return {
        success: failed.length === 0,
        failed
      };
    } finally {
      setUpdating(false);
    }
  }, [updateNoteStatus]);

  return {
    updating,
    error,
    updateNoteStatus,
    updateBatchNoteStatus,
    canTransition
  };
}