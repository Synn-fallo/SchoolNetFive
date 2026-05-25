// /home/project/services/evaluationService.ts
// Service API pour la gestion des évaluations et notes

// ============================================================
// CE SERVICE GÈRE LES "ÉVALUATIONS" (métier)
// Les appels sous-jacents utilisent la table "devoirs"
// ============================================================

import { supabase } from '@/lib/supabase';
import { Evaluation, EvaluationType, NoteStatus } from '@/types/notes.types';

// ============================================================
// TYPES
// ============================================================

export interface CreateEvaluationData {
  type: EvaluationType;
  titre: string;
  description?: string;
  date_evaluation: string;
  note_sur: number;
  coefficient: number;
  classe_id?: string;
  classe_personnelle_id?: string;
  matiere_id: string;
}

export interface UpdateEvaluationData {
  type?: EvaluationType;
  titre?: string;
  description?: string;
  date_evaluation?: string;
  note_sur?: number;
  coefficient?: number;
}

export interface EvaluationWithDetails extends Evaluation {
  classe_nom?: string;
  classe_type?: 'officielle' | 'personnelle';
  matiere_nom?: string;
  notes_count?: number;
  moyenne?: number;
}

// ============================================================
// SERVICE
// ============================================================

/**
 * Récupère toutes les évaluations d'un enseignant
 * @param enseignantId - ID de l'enseignant
 * @returns Liste des évaluations
 */
export async function getEvaluationsByEnseignant(enseignantId: string): Promise<EvaluationWithDetails[]> {
  const { data, error } = await supabase
    .from('devoirs')
    .select(`
      id,
      type,
      titre,
      description,
      date_devoir,
      note_sur,
      coefficient,
      is_published,
      classe_id,
      classe_personnelle_id,
      matiere_id,
      created_at,
      updated_at,
      classe:classe_id(id, nom),
      classe_personnelle:classe_personnelle_id(id, nom),
      matiere:matiere_id(id, nom)
    `)
    .eq('enseignant_id', enseignantId)
    .order('date_devoir', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => {
    const isOfficielle = !!item.classe_id;
    return {
      id: item.id,
      type: item.type || 'devoir',
      titre: item.titre,
      description: item.description,
      date_evaluation: item.date_devoir,
      note_sur: item.note_sur,
      coefficient: item.coefficient,
      is_published: item.is_published,
      classe_id: item.classe_id,
      classe_personnelle_id: item.classe_personnelle_id,
      matiere_id: item.matiere_id,
      enseignant_id: enseignantId,
      periode_id: null,
      annee_scolaire_id: null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      classe_nom: isOfficielle ? item.classe?.nom : item.classe_personnelle?.nom,
      classe_type: isOfficielle ? 'officielle' : 'personnelle',
      matiere_nom: item.matiere?.nom
    };
  });
}

/**
 * Récupère une évaluation par son ID
 * @param evaluationId - ID de l'évaluation
 * @returns Évaluation
 */
export async function getEvaluationById(evaluationId: string): Promise<EvaluationWithDetails | null> {
  const { data, error } = await supabase
    .from('devoirs')
    .select(`
      id,
      type,
      titre,
      description,
      date_devoir,
      note_sur,
      coefficient,
      is_published,
      classe_id,
      classe_personnelle_id,
      matiere_id,
      created_at,
      updated_at,
      classe:classe_id(id, nom),
      classe_personnelle:classe_personnelle_id(id, nom),
      matiere:matiere_id(id, nom)
    `)
    .eq('id', evaluationId)
    .single();

  if (error) throw error;

  const isOfficielle = !!data.classe_id;
  return {
    id: data.id,
    type: data.type || 'devoir',
    titre: data.titre,
    description: data.description,
    date_evaluation: data.date_devoir,
    note_sur: data.note_sur,
    coefficient: data.coefficient,
    is_published: data.is_published,
    classe_id: data.classe_id,
    classe_personnelle_id: data.classe_personnelle_id,
    matiere_id: data.matiere_id,
    enseignant_id: '',
    periode_id: null,
    annee_scolaire_id: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    classe_nom: isOfficielle ? data.classe?.nom : data.classe_personnelle?.nom,
    classe_type: isOfficielle ? 'officielle' : 'personnelle',
    matiere_nom: data.matiere?.nom
  };
}

/**
 * Crée une nouvelle évaluation
 * @param enseignantId - ID de l'enseignant
 * @param data - Données de l'évaluation
 * @returns Évaluation créée
 */
export async function createEvaluation(enseignantId: string, data: CreateEvaluationData): Promise<Evaluation> {
  const insertData: any = {
    enseignant_id: enseignantId,
    type: data.type,
    titre: data.titre,
    description: data.description || null,
    date_devoir: data.date_evaluation,
    note_sur: data.note_sur,
    coefficient: data.coefficient,
    matiere_id: data.matiere_id,
    is_published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (data.classe_id) {
    insertData.classe_id = data.classe_id;
    const { data: classeData } = await supabase
      .from('classes')
      .select('etablissement_id')
      .eq('id', data.classe_id)
      .single();
    if (classeData) {
      insertData.etablissement_id = classeData.etablissement_id;
    }
  } else if (data.classe_personnelle_id) {
    insertData.classe_personnelle_id = data.classe_personnelle_id;
  } else {
    throw new Error('Classe non spécifiée');
  }

  const { data: result, error } = await supabase
    .from('devoirs')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Met à jour une évaluation
 * @param evaluationId - ID de l'évaluation
 * @param enseignantId - ID de l'enseignant
 * @param data - Données à mettre à jour
 */
export async function updateEvaluation(evaluationId: string, enseignantId: string, data: UpdateEvaluationData): Promise<void> {
  const updateData: any = { updated_at: new Date().toISOString() };
  if (data.type !== undefined) updateData.type = data.type;
  if (data.titre !== undefined) updateData.titre = data.titre;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.date_evaluation !== undefined) updateData.date_devoir = data.date_evaluation;
  if (data.note_sur !== undefined) updateData.note_sur = data.note_sur;
  if (data.coefficient !== undefined) updateData.coefficient = data.coefficient;

  const { error } = await supabase
    .from('devoirs')
    .update(updateData)
    .eq('id', evaluationId)
    .eq('enseignant_id', enseignantId);

  if (error) throw error;
}

/**
 * Supprime une évaluation
 * @param evaluationId - ID de l'évaluation
 * @param enseignantId - ID de l'enseignant
 */
export async function deleteEvaluation(evaluationId: string, enseignantId: string): Promise<void> {
  const { error } = await supabase
    .from('devoirs')
    .delete()
    .eq('id', evaluationId)
    .eq('enseignant_id', enseignantId);

  if (error) throw error;
}

/**
 * Récupère les notes d'une évaluation avec les infos élèves
 * @param evaluationId - ID de l'évaluation
 * @returns Liste des notes avec élèves
 */
export async function getNotesByEvaluation(evaluationId: string): Promise<{
  id: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  note: number;
  appreciation?: string;
  statut: NoteStatus;
}[]> {
  // Récupérer l'évaluation pour connaître la classe
  const { data: evaluation, error: evalError } = await supabase
    .from('devoirs')
    .select('classe_id, classe_personnelle_id')
    .eq('id', evaluationId)
    .single();

  if (evalError) throw evalError;

  let eleves: any[] = [];

  if (evaluation.classe_id) {
    const { data, error } = await supabase
      .from('eleves')
      .select('id, nom, prenom')
      .eq('classe_id', evaluation.classe_id);
    if (error) throw error;
    eleves = data || [];
  } else if (evaluation.classe_personnelle_id) {
    const { data, error } = await supabase
      .from('classes_personnelles')
      .select('eleves')
      .eq('id', evaluation.classe_personnelle_id)
      .single();
    if (error) throw error;
    eleves = (data?.eleves || []).map((e: any, idx: number) => ({
      id: `temp_${idx}`,
      nom: e.nom,
      prenom: e.prenom
    }));
  }

  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, eleve_id, note, appreciation, statut')
    .eq('devoir_id', evaluationId);

  if (notesError) throw notesError;

  const notesMap = new Map(notes?.map(n => [n.eleve_id, n]) || []);

  return eleves.map(eleve => {
    const existingNote = notesMap.get(eleve.id);
    return {
      id: existingNote?.id || '',
      eleve_id: eleve.id,
      eleve_nom: eleve.nom,
      eleve_prenom: eleve.prenom,
      note: existingNote?.note || 0,
      appreciation: existingNote?.appreciation,
      statut: existingNote?.statut || 'en_attente'
    };
  });
}

/**
 * Met à jour une note
 * @param noteId - ID de la note
 * @param note - Nouvelle note
 * @param appreciation - Appréciation
 */
export async function updateNoteValue(noteId: string, note: number, appreciation?: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ note, appreciation, updated_at: new Date().toISOString() })
    .eq('id', noteId);

  if (error) throw error;
}

/**
 * Crée une nouvelle note
 * @param evaluationId - ID de l'évaluation
 * @param eleveId - ID de l'élève
 * @param note - Note
 * @param appreciation - Appréciation
 * @param createdBy - ID du créateur
 */
export async function createNote(evaluationId: string, eleveId: string, note: number, appreciation?: string, createdBy?: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .insert({
      devoir_id: evaluationId,
      eleve_id: eleveId,
      note,
      appreciation: appreciation || null,
      statut: 'en_attente',
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

/**
 * Met à jour le statut d'une note (utilise l'Edge Function)
 * @param noteId - ID de la note
 * @param newStatus - Nouveau statut
 * @param reason - Raison du changement
 */
export async function updateNoteStatus(noteId: string, newStatus: NoteStatus, reason?: string): Promise<void> {
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
}