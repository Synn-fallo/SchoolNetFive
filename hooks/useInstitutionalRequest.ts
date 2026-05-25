import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendInAppNotification, sendEmail } from '@/lib/notifications';

export type InstitutionalRole = 'chef_etablissement' | 'autorite' | 'partenaire';

interface InstitutionalRequestFormData {
  role: InstitutionalRole;
  message?: string;
  justificatif_url?: string;
  // Champs supplémentaires selon le rôle
  nom_etablissement?: string;
  ville?: string;
  adresse?: string;
  telephone_etablissement?: string;
  statut_juridique?: string;
  // Pour autorité
  institution_nom?: string;
  fonction?: string;
  // Pour partenaire
  organisation_nom?: string;
  secteur?: string;
}

interface UseInstitutionalRequestProps {
  role: InstitutionalRole;
}

export function useInstitutionalRequest({ role }: UseInstitutionalRequestProps) {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadJustificatif = async (file: File): Promise<string | null> => {
    if (!user) {
      setError('Vous devez être connecté');
      return null;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${role}.${fileExt}`;
      const filePath = `justificatifs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('demandes')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('demandes')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Erreur lors du téléchargement du justificatif');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submitRequest = async (formData: InstitutionalRequestFormData, justificatifFile?: File) => {
    if (!user) {
      setError('Vous devez être connecté pour faire une demande');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      let justificatifUrl = null;
      if (justificatifFile) {
        justificatifUrl = await uploadJustificatif(justificatifFile);
        if (!justificatifUrl) {
          return false;
        }
      }

      // Vérifier si l'utilisateur a déjà une demande en attente pour ce rôle
      const { data: existingRequest, error: checkError } = await supabase
        .from('demandes_role')
        .select('id, statut')
        .eq('user_id', user.id)
        .eq('role_souhaite', role)
        .in('statut', ['en_attente'])
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRequest) {
        setError(`Vous avez déjà une demande en attente pour le rôle ${getRoleLabel(role)}.`);
        return false;
      }

      // Vérifier si l'utilisateur a déjà ce rôle
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', role)
        .eq('is_active', true)
        .maybeSingle();

      if (roleCheckError) throw roleCheckError;

      if (existingRole) {
        setError(`Vous avez déjà le rôle ${getRoleLabel(role)}.`);
        return false;
      }

      // Construire les métadonnées spécifiques au rôle
      let metadata: any = {
        user_nom: profile?.nom,
        user_prenom: profile?.prenom,
        user_email: user.email,
        user_telephone: profile?.telephone,
      };

      if (role === 'chef_etablissement') {
        metadata = {
          ...metadata,
          nom_etablissement: formData.nom_etablissement,
          ville: formData.ville,
          adresse: formData.adresse,
          telephone_etablissement: formData.telephone_etablissement,
          statut_juridique: formData.statut_juridique,
        };
      } else if (role === 'autorite') {
        metadata = {
          ...metadata,
          institution_nom: formData.institution_nom,
          fonction: formData.fonction,
        };
      } else if (role === 'partenaire') {
        metadata = {
          ...metadata,
          organisation_nom: formData.organisation_nom,
          secteur: formData.secteur,
        };
      }

      // Construire les données à stocker
      const requestData: any = {
        user_id: user.id,
        role_souhaite: role,
        message: formData.message || null,
        justificatif_url: justificatifUrl,
        statut: 'en_attente',
        metadata: metadata,
      };

      // Insérer la demande
      const { error: insertError } = await supabase
        .from('demandes_role')
        .insert(requestData);

      if (insertError) throw insertError;

      // Notification in-app
      await sendInAppNotification(
        user.id,
        'Demande envoyée',
        `Votre demande de rôle ${getRoleLabel(role)} a bien été enregistrée. Vous serez notifié de sa validation.`,
        { type: 'demande_envoyee', role }
      );

      // Notification email
      await sendEmail({
        to: user.email || '',
        subject: `SchoolNet - Confirmation de votre demande de rôle ${getRoleLabel(role)}`,
        html: `
          <h2>Confirmation de votre demande</h2>
          <p>Bonjour ${profile?.prenom || ''} ${profile?.nom || ''},</p>
          <p>Nous accusons réception de votre demande de rôle <strong>${getRoleLabel(role)}</strong>.</p>
          <p>Notre équipe administrative examine votre dossier et vous tiendra informé de la décision.</p>
          <p>Vous pouvez suivre l'évolution de votre demande dans votre espace "Mes demandes".</p>
          <br/>
          <p>Cordialement,</p>
          <p>L'équipe SchoolNet</p>
        `,
      });

      return true;
    } catch (err) {
      console.error('Error submitting institutional request:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: InstitutionalRole): string => {
    switch (role) {
      case 'chef_etablissement': return 'Chef d\'établissement';
      case 'autorite': return 'Autorité';
      case 'partenaire': return 'Partenaire';
      default: return role;
    }
  };

  const getJustificatifsDescription = (role: InstitutionalRole): string => {
    switch (role) {
      case 'chef_etablissement':
        return 'RCCM, statut juridique, identité du représentant légal, quitus fiscal (si disponible)';
      case 'autorite':
        return 'Lettre de mission ou de nomination, carte professionnelle, pièce d\'identité officielle';
      case 'partenaire':
        return 'Statut de l\'organisation, RCCM (pour les entreprises), lettre de motivation ou proposition de partenariat';
      default:
        return 'Justificatifs requis selon votre statut';
    }
  };

  return {
    submitRequest,
    uploadJustificatif,
    loading,
    uploading,
    error,
    getRoleLabel,
    getJustificatifsDescription,
  };
}