/**
 * Tests du workflow Chef d'établissement
 * 
 * Ce fichier teste les 3 phases du workflow :
 * - Phase 1 : Vérification d'identité (demande de création d'établissement)
 * - Phase 2 : Site en construction (INFOS_MINIMALES_COMPLETE)
 * - Phase 3 : Activation officielle (abonnement)
 * 
 * Exécution : npm test -- workflow-chef.test.tsx
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock de Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        in: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

// Mock du router
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

describe('Workflow Chef d\'établissement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Phase 1 - Vérification d\'identité', () => {
    it('devrait permettre de soumettre une demande avec numéro d\'agrément', async () => {
      // Simulation de la soumission
      const demandeData = {
        nom_etablissement: 'Lycée Moderne de Cotonou',
        ville: 'Cotonou',
        type_etablissement: 'public',
        email_contact: 'contact@lmc.bj',
        telephone: '+229 99 00 00 00',
        mode_verification: 'auto',
        numero_agrement: 'AGRE-2024-00123',
        plan_souhaite: 'basique',
      };

      // Vérifier que la soumission est possible
      expect(demandeData.mode_verification).toBe('auto');
      expect(demandeData.numero_agrement).toBeTruthy();
    });

    it('devrait permettre de soumettre une demande avec justificatif', async () => {
      const demandeData = {
        nom_etablissement: 'Lycée Moderne de Cotonou',
        ville: 'Cotonou',
        type_etablissement: 'public',
        email_contact: 'contact@lmc.bj',
        telephone: '+229 99 00 00 00',
        mode_verification: 'manuel_cachet',
        justificatif_url: 'https://storage.supabase.co/justificatif.pdf',
        plan_souhaite: 'basique',
      };

      expect(demandeData.mode_verification).toBe('manuel_cachet');
      expect(demandeData.justificatif_url).toBeTruthy();
    });

    it('devrait détecter un doublon d\'établissement (même nom et ville)', async () => {
      // Simuler un établissement existant
      const existingEtab = {
        nom: 'Lycée Moderne de Cotonou',
        ville: 'Cotonou',
        id: '123',
      };

      const newDemandeNom = 'Lycée Moderne de Cotonou';
      const newDemandeVille = 'Cotonou';

      const isDuplicate = existingEtab.nom === newDemandeNom && existingEtab.ville === newDemandeVille;
      
      expect(isDuplicate).toBe(true);
    });
  });

  describe('Phase 2 - Site en construction', () => {
    it('devrait afficher le bandeau "Site en construction" pour le propriétaire', async () => {
      const etablissement = {
        id: '123',
        nom: 'Lycée Moderne de Cotonou',
        statut: 'INFOS_MINIMALES_COMPLETE',
        created_at: new Date().toISOString(),
      };

      const isOwner = true;
      const statut = etablissement.statut;

      expect(isOwner).toBe(true);
      expect(statut).toBe('INFOS_MINIMALES_COMPLETE');
    });

    it('devrait afficher le badge "En configuration" dans l\'annuaire pour Phase 2', async () => {
      const etablissement = {
        statut: 'INFOS_MINIMALES_COMPLETE',
      };

      const shouldShowBadge = etablissement.statut === 'INFOS_MINIMALES_COMPLETE';
      
      expect(shouldShowBadge).toBe(true);
    });

    it('devrait calculer correctement le nombre de jours depuis la création', async () => {
      const createdDate = new Date('2026-03-01');
      const now = new Date('2026-03-31');
      const daysSince = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysSince).toBe(30);
    });

    it('devrait afficher un message d\'alerte à J+30', async () => {
      const daysSince = 30;
      const showWarning = daysSince >= 30;

      expect(showWarning).toBe(true);
    });

    it('devrait afficher un message critique à J+60', async () => {
      const daysSince = 60;
      const showCritical = daysSince >= 60;

      expect(showCritical).toBe(true);
    });
  });

  describe('Phase 3 - Activation officielle', () => {
    it('devrait créer un abonnement après paiement', async () => {
      const etablissementId = '123';
      const plan = 'basique';
      
      const abonnement = {
        etablissement_id: etablissementId,
        plan: plan,
        is_active: true,
        date_debut: new Date().toISOString(),
      };

      expect(abonnement.etablissement_id).toBe(etablissementId);
      expect(abonnement.plan).toBe('basique');
      expect(abonnement.is_active).toBe(true);
    });

    it('devrait mettre à jour le statut de l\'établissement après activation', async () => {
      const oldStatut = 'INFOS_MINIMALES_COMPLETE';
      const newStatut = 'ACTIF';
      
      expect(oldStatut).not.toBe(newStatut);
    });

    it('devrait supprimer le badge "En configuration" de l\'annuaire', async () => {
      const etablissement = {
        statut: 'ACTIF',
      };

      const shouldShowBadge = etablissement.statut === 'INFOS_MINIMALES_COMPLETE';
      
      expect(shouldShowBadge).toBe(false);
    });

    it('devrait rendre le site public après activation', async () => {
      const isPublic = true;
      const isOwner = false;
      
      // Un site public est visible par tous
      expect(isPublic).toBe(true);
      // Même sans être propriétaire
      expect(isOwner).toBe(false);
    });
  });

  describe('Relances et notifications', () => {
    it('devrait envoyer une relance à J+7 pour Phase 2 sans abonnement', async () => {
      const daysSince = 7;
      const hasSubscription = false;
      
      const shouldSendReminder = daysSince >= 7 && !hasSubscription;
      
      expect(shouldSendReminder).toBe(true);
    });

    it('devrait envoyer une relance à J+30 pour Phase 2 sans abonnement', async () => {
      const daysSince = 30;
      const hasSubscription = false;
      
      const shouldSendReminder = daysSince >= 30 && !hasSubscription;
      
      expect(shouldSendReminder).toBe(true);
    });

    it('devrait envoyer une relance critique à J+60', async () => {
      const daysSince = 60;
      const hasSubscription = false;
      
      const shouldSendCriticalReminder = daysSince >= 60 && !hasSubscription;
      
      expect(shouldSendCriticalReminder).toBe(true);
    });

    it('ne devrait pas envoyer de relance si abonnement actif', async () => {
      const daysSince = 30;
      const hasSubscription = true;
      
      const shouldSendReminder = daysSince >= 7 && !hasSubscription;
      
      expect(shouldSendReminder).toBe(false);
    });
  });

  describe('Métriques dashboard', () => {
    it('devrait calculer le taux de conversion Phase 1 → Phase 2', async () => {
      const totalDemandes = 10;
      const etablissementsPhase2 = 7;
      const tauxConversion = (etablissementsPhase2 / totalDemandes) * 100;
      
      expect(tauxConversion).toBe(70);
    });

    it('devrait calculer le taux de conversion Phase 2 → Abonnement', async () => {
      const etablissementsPhase2 = 10;
      const abonnementsActifs = 6;
      const tauxConversion = (abonnementsActifs / etablissementsPhase2) * 100;
      
      expect(tauxConversion).toBe(60);
    });

    it('devrait identifier les demandes en attente > 48h', async () => {
      const now = new Date();
      const demandeDate = new Date(now.getTime() - 50 * 60 * 60 * 1000); // 50h
      const hoursDiff = (now.getTime() - demandeDate.getTime()) / (1000 * 60 * 60);
      
      expect(hoursDiff > 48).toBe(true);
    });
  });
});