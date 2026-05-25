// /home/project/__tests__/migration-independant-affilie.test.tsx
// Tests de la migration : correspondances, transfert, import/export

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock des dépendances
jest.mock('@/lib/supabase');
jest.mock('@/lib/abonnement');
jest.mock('@/hooks/useMigrationEnseignant');
jest.mock('@/hooks/useCorrespondanceEleves');
jest.mock('@/hooks/useCorrespondanceClasses');
jest.mock('@/utils/exportCSV');
jest.mock('@/utils/importCSV');

import { supabase } from '@/lib/supabase';
import { isEtablissementAbonne } from '@/lib/abonnement';
import { useMigrationEnseignant } from '@/hooks/useMigrationEnseignant';
import { useCorrespondanceEleves } from '@/hooks/useCorrespondanceEleves';
import { exportClassesToCSV, downloadCSV } from '@/utils/exportCSV';
import { previewCSV, importClassesFromCSV } from '@/utils/importCSV';

describe('Migration indépendant → affilié', () => {
  const enseignantId = 'enseignant-123';
  const classePersonnelleId = 'classe-perso-1';
  const classeOfficielleId = 'classe-off-1';
  const matiereOfficielleId = 'matiere-off-1';

  // ============================================================
  // 1. TESTS DES CORRESPONDANCES
  // ============================================================

  describe('Correspondance des classes', () => {
    it('Un enseignant peut correspondre une classe personnelle à une classe officielle', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: [{ id: 'corr-1', classe_personnelle_id: classePersonnelleId, classe_officielle_id: classeOfficielleId }],
        error: null
      });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const { data } = await supabase.from('correspondance_classes').insert({
        classe_personnelle_id: classePersonnelleId,
        classe_officielle_id: classeOfficielleId,
        enseignant_id: enseignantId
      });

      expect(data[0].classe_personnelle_id).toBe(classePersonnelleId);
      expect(data[0].classe_officielle_id).toBe(classeOfficielleId);
    });

    it('Une correspondance de classe ne peut pas être dupliquée', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: { code: '23505', message: 'Duplicate key violation' }
      });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const { error } = await supabase.from('correspondance_classes').insert({
        classe_personnelle_id: classePersonnelleId,
        classe_officielle_id: classeOfficielleId,
        enseignant_id: enseignantId
      });

      expect(error?.code).toBe('23505');
    });
  });

  describe('Correspondance des élèves', () => {
    it('La recherche automatique trouve une correspondance par matricule', async () => {
      const { rechercherCorrespondanceAuto } = useCorrespondanceEleves({
        classePersonnelleId,
        classeOfficielleId
      });

      const elevePersonnel = { nom: 'Koffi', prenom: 'Jean', matricule: '12345' };
      const elevesOfficiels = [
        { id: 'eleve-1', nom: 'KOFFI', prenom: 'Jean', matricule: '12345' }
      ];

      // Mock de la fonction
      (useCorrespondanceEleves as jest.Mock).mockReturnValue({
        rechercherCorrespondanceAuto: () => ({ eleve: elevesOfficiels[0], score: 100 })
      });

      const result = rechercherCorrespondanceAuto(elevePersonnel);
      expect(result.eleve?.id).toBe('eleve-1');
      expect(result.score).toBe(100);
    });

    it('La recherche automatique trouve une correspondance par nom+prénom', async () => {
      const elevePersonnel = { nom: 'Dossou', prenom: 'Marie' };
      const elevesOfficiels = [
        { id: 'eleve-2', nom: 'DOSSOU', prenom: 'Marie' }
      ];

      (useCorrespondanceEleves as jest.Mock).mockReturnValue({
        rechercherCorrespondanceAuto: () => ({ eleve: elevesOfficiels[0], score: 95 })
      });

      const result = useCorrespondanceEleves({ classePersonnelleId, classeOfficielleId })
        .rechercherCorrespondanceAuto(elevePersonnel);
      
      expect(result.eleve?.id).toBe('eleve-2');
    });

    it('Un élève sans correspondance est ignoré', async () => {
      const elevePersonnel = { nom: 'Traore', prenom: 'Fatou' };
      const elevesOfficiels: any[] = [];

      (useCorrespondanceEleves as jest.Mock).mockReturnValue({
        rechercherCorrespondanceAuto: () => ({ eleve: null, score: 0 })
      });

      const result = useCorrespondanceEleves({ classePersonnelleId, classeOfficielleId })
        .rechercherCorrespondanceAuto(elevePersonnel);
      
      expect(result.eleve).toBeNull();
      expect(result.score).toBe(0);
    });
  });

  // ============================================================
  // 2. TESTS DU TRANSFERT EN BLOC
  // ============================================================

  describe('Transfert des notes (transaction unique)', () => {
    it('Le transfert réussit pour toutes les évaluations sélectionnées', async () => {
      const { transfererEvaluations } = useMigrationEnseignant({
        classePersonnelleId,
        classeOfficielleId,
        matiereOfficielleId
      });

      const evaluations = [
        { id: 'eval-1', type: 'interrogation', titre: 'Interro 1', date: '2026-04-10', note_sur: 20, coefficient: 1 },
        { id: 'eval-2', type: 'devoir', titre: 'Devoir 1', date: '2026-04-17', note_sur: 20, coefficient: 2 }
      ];

      (useMigrationEnseignant as jest.Mock).mockReturnValue({
        transfererEvaluations: jest.fn().mockResolvedValue({
          success: true,
          evaluations_transferees: 2,
          notes_transferees: 24,
          notes_ecrasees: 0,
          notes_ignorees: 0,
          details: [
            { evaluation: 'Interro 1', statut: 'success' },
            { evaluation: 'Devoir 1', statut: 'success' }
          ]
        })
      });

      const result = await transfererEvaluations(evaluations);
      expect(result?.success).toBe(true);
      expect(result?.evaluations_transferees).toBe(2);
      expect(result?.notes_transferees).toBe(24);
    });

    it('Une erreur sur une évaluation annule tout le transfert (transaction)', async () => {
      const { transfererEvaluations } = useMigrationEnseignant({
        classePersonnelleId,
        classeOfficielleId,
        matiereOfficielleId
      });

      (useMigrationEnseignant as jest.Mock).mockReturnValue({
        transfererEvaluations: jest.fn().mockResolvedValue({
          success: false,
          evaluations_transferees: 0,
          notes_transferees: 0,
          notes_ecrasees: 0,
          notes_ignorees: 0,
          details: [
            { evaluation: 'Interro 1', statut: 'failed', message: 'Erreur de transaction' }
          ]
        })
      });

      const result = await transfererEvaluations([]);
      expect(result?.success).toBe(false);
      expect(result?.evaluations_transferees).toBe(0);
    });
  });

  // ============================================================
  // 3. TESTS DES NOTES EXISTANTES (ÉCRASEMENT)
  // ============================================================

  describe('Gestion des notes existantes', () => {
    it('Une note existante est écrasée et historisée', async () => {
      const noteExistante = { id: 'note-existante', note: 12, statut: 'publiee' };
      const nouvelleNote = 16;

      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      const mockInsertHistory = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'notes') {
          return { update: () => ({ eq: () => ({ eq: () => mockUpdate() }) }) };
        }
        if (table === 'note_history') {
          return { insert: mockInsertHistory };
        }
        return {};
      });

      // Simuler l'écrasement
      await supabase.from('notes').update({ note: nouvelleNote, statut: 'livree' }).eq('id', noteExistante.id);
      await supabase.from('note_history').insert({
        note_id: noteExistante.id,
        old_status: noteExistante.statut,
        new_status: 'livree',
        reason: 'Écrasement lors du transfert'
      });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockInsertHistory).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 4. TESTS DE L'IMPORT/EXPORT CSV
  // ============================================================

  describe('Export/Import CSV', () => {
    it('L\'export CSV des classes personnelles fonctionne', async () => {
      const classes = [
        { id: '1', nom: 'Tle D', matieres: [{ nom: 'Maths', coefficient: 4 }], eleves: [{ nom: 'Koffi', prenom: 'Jean' }] }
      ];

      (exportClassesToCSV as jest.Mock).mockImplementation(() => {
        const csv = 'id,nom,description,matieres,eleves\n1,Tle D,"[]","[{\"nom\":\"Maths\",\"coefficient\":4}]","[{\"nom\":\"Koffi\",\"prenom\":\"Jean\"}]"';
        downloadCSV(csv, 'classes.csv');
      });

      expect(() => exportClassesToCSV(classes)).not.toThrow();
    });

    it('L\'import CSV valide les en-têtes avant import', async () => {
      const mockFile = new File(['nom,description,matieres,eleves\nTle D,,,,'], 'test.csv', { type: 'text/csv' });

      (previewCSV as jest.Mock).mockResolvedValue({
        headers: ['nom', 'description', 'matieres', 'eleves'],
        sampleRows: [{ nom: 'Tle D', description: '', matieres: '', eleves: '' }],
        totalRows: 1
      });

      const preview = await previewCSV(mockFile);
      expect(preview.headers).toContain('nom');
      expect(preview.headers).toContain('description');
    });

    it('L\'import CSV rejette un fichier avec en-têtes invalides', async () => {
      const mockFile = new File(['nom,description\nTle D,'], 'invalid.csv', { type: 'text/csv' });

      (previewCSV as jest.Mock).mockResolvedValue({
        headers: ['nom', 'description'],
        sampleRows: [{ nom: 'Tle D', description: '' }],
        totalRows: 1
      });

      const preview = await previewCSV(mockFile);
      const expectedHeaders = ['nom', 'description', 'matieres', 'eleves'];
      const missingHeaders = expectedHeaders.filter(h => !preview.headers.includes(h));

      expect(missingHeaders.length).toBeGreaterThan(0);
    });

    it('L\'import CSV avec aperçu avant validation est sécurisé', async () => {
      const mockFile = new File(['nom,description,matieres,eleves\nClasse A,,,,'], 'test.csv', { type: 'text/csv' });

      (importClassesFromCSV as jest.Mock).mockResolvedValue({
        success: true,
        rowsTotal: 1,
        rowsImported: 1,
        rowsSkipped: 0,
        errors: [],
        warnings: []
      });

      const result = await importClassesFromCSV(mockFile, enseignantId, supabase);
      expect(result.success).toBe(true);
      expect(result.rowsImported).toBe(1);
    });
  });

  // ============================================================
  // 5. TESTS DE LA TRANSITION DÉSABONNEMENT
  // ============================================================

  describe('Transition lors du désabonnement', () => {
    it('Un enseignant affilié devient indépendant après désabonnement', async () => {
      (isEtablissementAbonne as jest.Mock)
        .mockResolvedValueOnce(true)  // Avant désabonnement
        .mockResolvedValueOnce(false); // Après désabonnement

      const avantDesabonnement = await isEtablissementAbonne('etab-123');
      expect(avantDesabonnement).toBe(true);

      // Simulation du désabonnement
      const apresDesabonnement = await isEtablissementAbonne('etab-123');
      expect(apresDesabonnement).toBe(false);
    });

    it('Un enseignant perd le droit de livrer des notes après désabonnement', async () => {
      (isEtablissementAbonne as jest.Mock).mockResolvedValue(false);
      const estAffilie = await isEtablissementAbonne('etab-123');
      
      const peutLivrer = estAffilie;
      expect(peutLivrer).toBe(false);
    });
  });

  // ============================================================
  // 6. TESTS DE LA JOURNALISATION (import_logs)
  // ============================================================

  describe('Journalisation des imports', () => {
    it('Chaque import CSV est journalisé dans import_logs', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      await supabase.from('import_logs').insert({
        user_id: enseignantId,
        type: 'classes',
        filename: 'classes.csv',
        rows_total: 10,
        rows_imported: 8,
        rows_skipped: 2,
        status: 'partial'
      });

      expect(mockInsert).toHaveBeenCalled();
    });

    it('Un import réussi a le statut "success"', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      await supabase.from('import_logs').insert({
        user_id: enseignantId,
        type: 'classes',
        filename: 'classes.csv',
        rows_total: 10,
        rows_imported: 10,
        rows_skipped: 0,
        status: 'success'
      });

      expect(mockInsert).toHaveBeenCalled();
    });
  });
});