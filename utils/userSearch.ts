// /home/project/utils/userSearch.ts
import { supabase } from '@/lib/supabase';

export interface UserSearchResult {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string | null;
}

/**
 * Recherche un utilisateur par email
 * Utilise une Edge Function pour accéder à auth.users
 * Retourne null si non trouvé
 */
export async function searchUserByEmail(email: string): Promise<UserSearchResult | null> {
  if (!email || !email.trim()) {
    return null;
  }

  try {
    // Récupérer la session pour le token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error('Session error:', sessionError);
      return null;
    }

    const accessToken = sessionData.session.access_token;

    // Appel à l'Edge Function
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/search-user-by-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Edge Function error:', result.error);
      return null;
    }

    if (result.found && result.user) {
      return {
        id: result.user.id,
        email: result.user.email,
        nom: result.user.nom || '',
        prenom: result.user.prenom || '',
        telephone: result.user.telephone || null,
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching user by email:', error);
    return null;
  }
}

/**
 * Version simplifiée pour test (sans Edge Function)
 * À utiliser uniquement en environnement de test
 */
export async function searchUserByEmailMock(email: string): Promise<UserSearchResult | null> {
  // Mock pour les tests
  const mockUsers = [
    { email: 'enseignant.workflow@gmail.com', id: 'test-id-123', nom: 'WORKFLOW', prenom: 'Enseignant', telephone: null },
  ];
  
  const found = mockUsers.find(u => u.email === email.trim().toLowerCase());
  if (found) {
    return found;
  }
  return null;
}
