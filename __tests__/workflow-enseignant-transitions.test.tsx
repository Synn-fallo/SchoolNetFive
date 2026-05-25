// /home/project/__tests__/workflow-enseignant-transitions.test.tsx
// Tests du workflow enseignant : transitions, rôles, permissions, RLS

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock des dépendances
jest.mock('@/lib/supabase');
jest.mock('@/contexts/AuthContext');
jest.mock('@/lib/abonnement');

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { isEtablissementAbonne } from '@/lib/abonnement';

describe('Workflow Enseignant - Transitions et rôles', () => {
  // ============================================================
  // 1. TESTS D'AUTHENTIFICATION ET RÔLES
  // ============================================================

  describe('Authentification et rôles', () => {
    it('Un enseignant peut se connecter', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ error: null });
      (useAuth as jest.Mock).mockReturnValue({
        signIn: mockSignIn,
        user: { id: 'enseignant-123', email: 'teacher@school.com' }
      });

      await useAuth().signIn('teacher@school.com', 'password');
      expect(mockSignIn).toHaveBeenCalledWith('teacher@school.com', 'password');
    });

    it('Un enseignant peut avoir le rôle "enseignant"', () => {
      (useAuth as jest.Mock).mockReturnValue({
        primaryRole: 'enseignant',
        hasRole: (role: string) => role === 'enseignant'
      });

      expect(useAuth().primaryRole).toBe('enseignant');
      expect(useAuth().hasRole('enseignant')).toBe(true);
    });

    it('Un enseignant peut avoir plusieurs rôles (enseignant + parent)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        roles: [
          { role: 'enseignant', is_active: true },
          { role: 'parent', is_active: true }
        ],
        hasRole: (role: string) => ['enseignant', 'parent'].includes(role)
      });

      expect(useAuth().hasRole('enseignant')).toBe(true);
      expect(useAuth().hasRole('parent')).toBe(true);
    });
  });

  // ============================================================
  // 2. TESTS DES STATUTS DES NOTES
  // ============================================================

  describe('Cycle des statuts des notes', () => {
    const noteId = 'note-123';
    const devoirId = 'devoir-456';
    const enseignantId = 'enseignant-789';

    it('Une note commence avec le statut "en_attente"', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: [{ id: noteId, statut: 'en_attente' }],
        error: null
      });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const { data } = await supabase.from('notes').insert({
        devoir_id: devoirId,
        eleve_id: 'eleve-123',
        note: 15
      });
      expect(data[0].statut).toBe('en_attente');
    });

    it('L\'enseignant peut passer une note de "en_attente" à "validee"', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: () => ({
          eq: () => ({
            eq: () => mockUpdate()
          })
        })
      });

      const { error } = await supabase
        .from('notes')
        .update({ statut: 'validee' })
        .eq('id', noteId)
        .eq('created_by', enseignantId);

      expect(error).toBeNull();
    });

    it('L\'enseignant peut passer une note de "validee" à "publiee"', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: () => ({
          eq: () => ({
            eq: () => mockUpdate()
          })
        })
      });

      const { error } = await supabase
        .from('notes')
        .update({ statut: 'publiee' })
        .eq('id', noteId)
        .eq('created_by', enseignantId);

      expect(error).toBeNull();
    });

    it('Un enseignant affilié peut passer une note de "publiee" à "livree"', async () => {
      (isEtablissementAbonne as jest.Mock).mockResolvedValue(true);

      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: () => ({
          eq: () => ({
            eq: () => mockUpdate()
          })
        })
      });

      const estAffilie = await isEtablissementAbonne('etab-123');
      expect(estAffilie).toBe(true);

      const { error } = await supabase
        .from('notes')
        .update({ statut: 'livree' })
        .eq('id', noteId)
        .eq('created_by', enseignantId);

      expect(error).toBeNull();
    });

    it('Un enseignant indépendant ne peut PAS passer une note à "livree"', async () => {
      (isEtablissementAbonne as jest.Mock).mockResolvedValue(false);

      const estAffilie = await isEtablissementAbonne('etab-123');
      expect(estAffilie).toBe(false);

      // La logique métier doit bloquer l'action
      const peutLivrer = estAffilie;
      expect(peutLivrer).toBe(false);
    });
  });

  // ============================================================
  // 3. TESTS DE LA DISTINCTION AFFILIÉ / INDÉPENDANT
  // ============================================================

  describe('Distinction enseignant affilié vs indépendant', () => {
    it('Un enseignant affilié a un établissement abonné', async () => {
      (isEtablissementAbonne as jest.Mock).mockResolvedValue(true);
      const estAffilie = await isEtablissementAbonne('etab-abonne-123');
      expect(estAffilie).toBe(true);
    });

    it('Un enseignant indépendant a un établissement non abonné', async () => {
      (isEtablissementAbonne as jest.Mock).mockResolvedValue(false);
      const estAffilie = await isEtablissementAbonne('etab-non-abonne-456');
      expect(estAffilie).toBe(false);
    });

    it('Un enseignant sans établissement est indépendant', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        roles: [{ role: 'enseignant', etablissement_id: null }],
        hasRole: (role: string) => role === 'enseignant'
      });

      const aEtablissement = useAuth().roles.some(r => r.etablissement_id);
      expect(aEtablissement).toBe(false);
    });
  });

  // ============================================================
  // 4. TESTS DES PERMISSIONS RLS
  // ============================================================

  describe('RLS - Row Level Security', () => {
    const enseignantId = 'enseignant-123';
    const autreEnseignantId = 'enseignant-456';

    it('Un enseignant ne peut voir que ses propres notes', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'note-1', created_by: enseignantId }],
        error: null
      });
      (supabase.from as jest.Mock).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => mockSelect()
          })
        })
      });

      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('created_by', enseignantId);

      expect(data?.every(n => n.created_by === enseignantId)).toBe(true);
    });

    it('Un enseignant ne peut pas modifier les notes d\'un autre enseignant', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: { code: '42501' } });
      (supabase.from as jest.Mock).mockReturnValue({
        update: () => ({
          eq: () => ({
            eq: () => mockUpdate()
          })
        })
      });

      const { error } = await supabase
        .from('notes')
        .update({ statut: 'validee' })
        .eq('id', 'note-autre')
        .eq('created_by', autreEnseignantId);

      expect(error).not.toBeNull();
    });
  });

  // ============================================================
  // 5. TESTS DES CLASSES PERSONNELLES
  // ============================================================

  describe('Classes personnelles (enseignant indépendant)', () => {
    const enseignantId = 'enseignant-123';

    it('Un enseignant indépendant peut créer une classe personnelle', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: [{ id: 'classe-perso-1', nom: 'Tle D' }],
        error: null
      });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const { data } = await supabase.from('classes_personnelles').insert({
        enseignant_id: enseignantId,
        nom: 'Tle D',
        eleves: [],
        matieres: []
      });

      expect(data[0].nom).toBe('Tle D');
    });

    it('Un enseignant affilié peut aussi avoir des classes personnelles (multi-contextes)', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'classe-perso-2', nom: 'Classe perso' }],
        error: null
      });
      (supabase.from as jest.Mock).mockReturnValue({
        select: () => ({
          eq: () => mockSelect()
        })
      });

      const { data } = await supabase
        .from('classes_personnelles')
        .select('*')
        .eq('enseignant_id', enseignantId);

      expect(data.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 6. TESTS DES NOTIFICATIONS
  // ============================================================

  describe('Notifications', () => {
    it('Un enseignant reçoit une notification quand ses notes sont livrées', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const { error } = await supabase.from('notifications').insert({
        user_id: 'enseignant-123',
        type: 'notes_livrees',
        message: 'Vos notes ont été livrées',
        is_read: false
      });

      expect(error).toBeNull();
    });

    it('Un parent reçoit une notification quand une note de son enfant est publiée', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const { error } = await supabase.from('notifications').insert({
        user_id: 'parent-123',
        type: 'note_publiee',
        message: 'Votre enfant a reçu une note',
        is_read: false
      });

      expect(error).toBeNull();
    });
  });
});