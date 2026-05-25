import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import DelegationsScreen from '@/app/(app)/(sidebar)/etablissement/delegations';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

describe('Gestion des Délégations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Nomination', () => {
    it('devrait permettre au Chef de nommer un Directeur des Études', async () => {
      // Mock de l'utilisateur à nommer
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'de-user-id', nom: 'Dupont', prenom: 'Jean', email: 'jean@ecole.com' },
          error: null,
        }),
      }));

      // Mock de l'insertion du rôle
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      }));

      const { getByPlaceholderText, getByText } = render(<DelegationsScreen />);

      fireEvent.changeText(getByPlaceholderText('ex: jean.dupont@email.com'), 'jean@ecole.com');
      fireEvent.press(getByText('Rechercher'));
      
      await waitFor(() => {
        expect(getByText('Jean Dupont')).toBeTruthy();
      });

      fireEvent.press(getByText('Nommer un collaborateur'));
      fireEvent.press(getByText('Directeur des Études (DE)'));
      fireEvent.press(getByText('Nommer'));

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('user_roles');
      });
    });

    it('devrait permettre de révoquer une délégation', async () => {
      // Mock de la délégation existante
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue({ error: null }),
        single: jest.fn(),
      }));

      const { findByText, getByTestId } = render(<DelegationsScreen />);
      
      const deleteButton = await findByText('Révoquer');
      fireEvent.press(deleteButton);
      
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('delegations');
      });
    });
  });

  describe('Permissions', () => {
    it('devrait restreindre l\'accès aux non-administrateurs', async () => {
      // Mock d'un utilisateur non chef
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: { id: 'normal-user' },
          isChefEtablissement: false,
        }),
      }));

      const { getByText } = render(<DelegationsScreen />);
      
      await waitFor(() => {
        expect(getByText('Accès non autorisé')).toBeTruthy();
      });
    });
  });
});