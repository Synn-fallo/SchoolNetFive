// /home/project/hooks/useMigrationEnseignant.ts
// Hook pour la logique de migration (transaction unique)

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface EvaluationToTransfer {
  id: string;
  type: 'interrogation' | 'devoir';
  titre: string;
  date: string;
  note_sur: number;
  coefficient: number;
}

export interface MigrationRapport {
  success: boolean;
  evaluations_transferees: number;
  notes_transferees: number;
  notes_ecrasees: number;
  notes_ignorees: number;
  details: Array<{
    evaluation: string;
    statut: 'success' | 'partial' | 'failed';
    message?: string;
  }>;
}

interface UseMigrationEnseignantProps {
  classePersonnelleId: string;
  classeOfficielleId: string;
  matiereOfficielleId: string;
}

export function useMigrationEnseignant({
  classePersonnelleId,
  classeOfficielleId,
  matiereOfficielleId
}: UseMigrationEnseignantProps) {
  const [loading, setLoading] = useState(false);
  const [rapport, setRapport] = useState<MigrationRapport | null>(null);

  /**
   * Transfère les évaluations sélectionnées en une transaction unique
   * @param evaluations - Liste des évaluations à transférer
   * @returns Rapport de migration
   */
  const transfererEvaluations = useCallback(async (
    evaluations: EvaluationToTransfer[]
  ): Promise<MigrationRapport | null> => {
    if (evaluations.length === 0) {
      console.warn('Aucune évaluation à transférer');
      return null;
    }

    setLoading(true);

    try {
      // Appel à l'Edge Function pour le transfert transactionnel
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/transferer-notes-bloc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            classe_personnelle_id: classePersonnelleId,
            classe_officielle_id: classeOfficielleId,
            matiere_officielle_id: matiereOfficielleId,
            evaluations
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setRapport(result.rapport);
        return result.rapport;
      } else {
        console.error('Transfert failed:', result.error);
        const errorRapport: MigrationRapport = {
          success: false,
          evaluations_transferees: 0,
          notes_transferees: 0,
          notes_ecrasees: 0,
          notes_ignorees: 0,
          details: evaluations.map(e => ({
            evaluation: e.titre,
            statut: 'failed',
            message: result.error || 'Erreur lors du transfert'
          }))
        };
        setRapport(errorRapport);
        return errorRapport;
      }
    } catch (error) {
      console.error('Error during transfer:', error);
      const errorRapport: MigrationRapport = {
        success: false,
        evaluations_transferees: 0,
        notes_transferees: 0,
        notes_ecrasees: 0,
        notes_ignorees: 0,
        details: evaluations.map(e => ({
          evaluation: e.titre,
          statut: 'failed',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }))
      };
      setRapport(errorRapport);
      return errorRapport;
    } finally {
      setLoading(false);
    }
  }, [classePersonnelleId, classeOfficielleId, matiereOfficielleId]);

  /**
   * Récupère les évaluations disponibles pour une classe personnelle et matière
   */
  const getEvaluationsDisponibles = useCallback(async (): Promise<EvaluationToTransfer[]> => {
    try {
      // Récupérer la classe personnelle
      const { data: classePerso, error: classeError } = await supabase
        .from('classes_personnelles')
        .select('eleves, matieres')
        .eq('id', classePersonnelleId)
        .single();

      if (classeError) throw classeError;

      // Récupérer les devoirs personnels de l'enseignant
      // Note: Cette partie dépend de la structure réelle des devoirs personnels
      // Pour l'instant, on retourne un tableau vide
      // Dans l'implémentation réelle, il faudra interroger une table `devoirs_personnels`
      // ou extraire depuis les JSONB de classes_personnelles
      
      const { data: user } = await supabase.auth.getUser();
      
      // Simulation : dans la vraie implémentation, remplacer par une requête réelle
      const { data: devoirs, error: devoirsError } = await supabase
        .from('devoirs')
        .select('id, titre, date_devoir, note_sur, coefficient, type')
        .eq('enseignant_id', user.user?.id)
        .is('classe_personnelle_id', classePersonnelleId)
        .order('date_devoir', { ascending: true });

      if (devoirsError) throw devoirsError;

      const evaluations: EvaluationToTransfer[] = (devoirs || []).map(d => ({
        id: d.id,
        type: d.type === 'devoir' ? 'devoir' : 'interrogation',
        titre: d.titre,
        date: d.date_devoir,
        note_sur: d.note_sur,
        coefficient: d.coefficient
      }));

      return evaluations;
    } catch (error) {
      console.error('Error getting evaluations:', error);
      return [];
    }
  }, [classePersonnelleId]);

  /**
   * Vérifie l'état de la correspondance des élèves pour une classe
   */
  const verifierCorrespondanceEleves = useCallback(async (): Promise<{
    total: number;
    correspondus: number;
    ignorés: number;
    manquants: number;
  }> => {
    try {
      const { data: correspondances, error } = await supabase
        .from('correspondance_eleves')
        .select('id, eleve_officiel_id, statut')
        .eq('classe_personnelle_id', classePersonnelleId);

      if (error) throw error;

      const total = correspondances?.length || 0;
      const correspondus = correspondances?.filter(c => c.eleve_officiel_id && c.statut === 'active').length || 0;
      const ignorés = correspondances?.filter(c => c.statut === 'ignoree').length || 0;
      const manquants = total - correspondus - ignorés;

      return { total, correspondus, ignorés, manquants };
    } catch (error) {
      console.error('Error checking correspondences:', error);
      return { total: 0, correspondus: 0, ignorés: 0, manquants: 0 };
    }
  }, [classePersonnelleId]);

  return {
    loading,
    rapport,
    transfererEvaluations,
    getEvaluationsDisponibles,
    verifierCorrespondanceEleves
  };
}