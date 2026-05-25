import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SimpleRoleFormData {
  role: 'eleve' | 'parent' | 'enseignant';
  message?: string;
  justificatif_url?: string;
  // Champs spécifiques selon le rôle
  classe?: string;
  matricule?: string;
  enfants?: string;
  telephone_parent?: string;
  diplomes?: string;
  specialite?: string;
  annees_experience?: string;
}

interface UseSimpleRoleRequestProps {
  role: 'eleve' | 'parent' | 'enseignant';
}

export function useSimpleRoleRequest({ role }: UseSimpleRoleRequestProps) {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRequest = async (formData: SimpleRoleFormData) => {
    if (!user) {
      setError('Vous devez être connecté pour faire une demande');
      return false;
    }

    setLoading(true);
    setError(null);
    
    // LOG 1 & 2: Début de la demande
    console.log('1. Début de la demande pour le rôle:', role);
    console.log('2. Utilisateur:', user?.id);

    try {
      // Vérifier si l'utilisateur a déjà une demande en attente ou validée
      const { data: existingRequest, error: checkError } = await supabase
        .from('demandes_role')
        .select('id, statut')
        .eq('user_id', user.id)
        .eq('role_souhaite', role)
        .in('statut', ['en_attente', 'valide'])
        .maybeSingle();

      if (checkError) throw checkError;

      // LOG 3: Demande existante
      console.log('3. Demande existante:', existingRequest);

      if (existingRequest) {
        if (existingRequest.statut === 'valide') {
          setError(`Vous avez déjà le rôle ${role}.`);
        } else if (existingRequest.statut === 'en_attente') {
          setError(`Vous avez déjà une demande en attente pour le rôle ${role}.`);
        }
        return false;
      }

      // Construire les métadonnées
      let metadata: any = {};
      if (role === 'eleve') {
        metadata = {
          classe: formData.classe,
          matricule: formData.matricule,
        };
      } else if (role === 'parent') {
        metadata = {
          enfants: formData.enfants,
          telephone_parent: formData.telephone_parent,
        };
      } else if (role === 'enseignant') {
        metadata = {
          diplomes: formData.diplomes,
          specialite: formData.specialite,
          annees_experience: formData.annees_experience,
        };
      }

      // LOG 4: Insertion dans demandes_role
      console.log('4. Insertion dans demandes_role...');

      // 1. Insérer la demande avec statut 'valide' (auto-validation)
      const { error: insertError } = await supabase
        .from('demandes_role')
        .insert({
          user_id: user.id,
          role_souhaite: role,
          message: formData.message || null,
          justificatif_url: formData.justificatif_url || null,
          statut: 'valide',
          metadata: metadata,
        });

      if (insertError) throw insertError;

      // LOG 5: Insertion réussie dans demandes_role
      console.log('5. Insertion réussie dans demandes_role');

      // LOG 6: Insertion dans user_roles
      console.log('6. Insertion dans user_roles...');

      // 2. Insérer le rôle dans user_roles (politique RLS vérifiera la demande 'valide')
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: role,
          is_active: true,
          metadata: { source: 'auto_validated_request', requested_at: new Date().toISOString() },
        });

      if (roleError) throw roleError;

      // LOG 7: Insertion réussie dans user_roles
      console.log('7. Insertion réussie dans user_roles');

      // 3. Mettre à jour le profil
      await supabase
        .from('profiles')
        .update({ active_role: role })
        .eq('id', user.id);

      // LOG 8: Profil mis à jour
      console.log('8. Profil mis à jour');

      // 4. Rafraîchir le contexte
      await refreshProfile();

      // LOG 9: Rafraîchissement terminé, retour true
      console.log('9. Rafraîchissement terminé, retour true');

      return true;
    } catch (err) {
      // LOG ERREUR: En cas d'erreur
      console.log('ERREUR:', err);
      console.error('Error submitting role request:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitRequest,
    loading,
    error,
  };
}