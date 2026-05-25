import { render, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import EnseignantsScreen from '@/app/(app)/enseignants';
import DashboardDEScreen from '@/app/(app)/dashboard-de';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

describe('Rôles Administratifs', () => {
  describe('Directeur des Études', () => {
    it('devrait avoir accès à la gestion des enseignants', async () => {
      // Mock du contexte pour DE
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: { id: 'de-user' },
          isDirecteurEtudes: true,
          getAdminMetadata: () => ({ type_admin: 'de' }),
        }),
      }));

      const { getByText } = render(<EnseignantsScreen />);
      
      await waitFor(() => {
        expect(getByText('Gestion des enseignants')).toBeTruthy();
        expect(getByText('Ajouter un enseignant')).toBeTruthy();
      });
    });

    it('devrait avoir un tableau de bord spécifique', async () => {
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: { id: 'de-user' },
          isDirecteurEtudes: true,
        }),
      }));

      const { getByText } = render(<DashboardDEScreen />);
      
      await waitFor(() => {
        expect(getByText('Directeur des Études')).toBeTruthy();
        expect(getByText('Moyennes par matière')).toBeTruthy();
      });
    });
  });

  describe('Animateur d\'Établissement', () => {
    it('devrait avoir un accès limité à son département', async () => {
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: { id: 'ae-user' },
          isAnimateurEtablissement: true,
          getAdminMetadata: () => ({ type_admin: 'ae', departement: 'Sciences' }),
        }),
      }));

      const { getByText } = render(<DashboardAEScreen />);
      
      await waitFor(() => {
        expect(getByText('Département: Sciences')).toBeTruthy();
      });
    });
  });

  describe('Personnel Vie Scolaire', () => {
    it('devrait avoir accès à la gestion des incidents', async () => {
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: { id: 'vie-user' },
          isPersonnelVieScolaire: true,
        }),
      }));

      const { getByText } = render(<DisciplineScreen />);
      
      await waitFor(() => {
        expect(getByText('Gestion de la discipline')).toBeTruthy();
        expect(getByText('Signaler un incident')).toBeTruthy();
      });
    });
  });
});