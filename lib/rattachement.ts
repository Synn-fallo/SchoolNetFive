import { supabase } from './supabase';

export interface RattachementData {
  enseignantId: string;
  etablissementId: string;
  invitationCode?: string;
}

/**
 * Récupérer toutes les données d'un enseignant avant rattachement
 */
export async function getEnseignantData(enseignantId: string) {
  try {
    // Récupérer les notes
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('created_by', enseignantId)
      .is('etablissement_id', null);

    if (notesError) throw notesError;

    // Récupérer les devoirs
    const { data: devoirs, error: devoirsError } = await supabase
      .from('devoirs')
      .select('*')
      .eq('enseignant_id', enseignantId)
      .is('etablissement_id', null);

    if (devoirsError) throw devoirsError;

    // Récupérer les bulletins
    const { data: bulletins, error: bulletinsError } = await supabase
      .from('bulletins')
      .select('*')
      .eq('created_by', enseignantId)
      .is('etablissement_id', null);

    if (bulletinsError) throw bulletinsError;

    return {
      notes: notes || [],
      devoirs: devoirs || [],
      bulletins: bulletins || [],
    };
  } catch (error) {
    console.error('Error fetching enseignant data:', error);
    return { notes: [], devoirs: [], bulletins: [] };
  }
}

/**
 * Mettre à jour les notes avec l'établissement
 */
export async function rattacherNotes(enseignantId: string, etablissementId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notes')
      .update({ etablissement_id: etablissementId })
      .eq('created_by', enseignantId)
      .is('etablissement_id', null);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rattaching notes:', error);
    return false;
  }
}

/**
 * Mettre à jour les devoirs avec l'établissement
 */
export async function rattacherDevoirs(enseignantId: string, etablissementId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('devoirs')
      .update({ etablissement_id: etablissementId })
      .eq('enseignant_id', enseignantId)
      .is('etablissement_id', null);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rattaching devoirs:', error);
    return false;
  }
}

/**
 * Mettre à jour les bulletins avec l'établissement
 */
export async function rattacherBulletins(enseignantId: string, etablissementId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bulletins')
      .update({ etablissement_id: etablissementId })
      .eq('created_by', enseignantId)
      .is('etablissement_id', null);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rattaching bulletins:', error);
    return false;
  }
}

/**
 * Rattacher l'enseignant à l'établissement (mise à jour du rôle)
 */
export async function rattacherEnseignant(
  enseignantId: string,
  etablissementId: string,
  invitationCode?: string
): Promise<boolean> {
  try {
    // 1. Mettre à jour user_roles existant ou en créer un nouveau
    const { data: existingRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', enseignantId)
      .eq('role', 'enseignant')
      .maybeSingle();

    if (roleError) throw roleError;

    if (existingRole) {
      // Mettre à jour le rôle existant
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ etablissement_id: etablissementId })
        .eq('id', existingRole.id);

      if (updateError) throw updateError;
    } else {
      // Créer un nouveau rôle enseignant
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: enseignantId,
          role: 'enseignant',
          etablissement_id: etablissementId,
          is_active: true,
          metadata: {
            rattachement_date: new Date().toISOString(),
            source: invitationCode ? 'invitation' : 'manuel',
          },
        });

      if (insertError) throw insertError;
    }

    // 2. Marquer l'invitation comme utilisée si un code est fourni
    if (invitationCode) {
      const { error: inviteError } = await supabase
        .from('invitation_codes')
        .update({
          statut: 'utilise',
          utilise_le: new Date().toISOString(),
          utilise_par: enseignantId,
        })
        .eq('code', invitationCode);

      if (inviteError) throw inviteError;
    }

    return true;
  } catch (error) {
    console.error('Error rattaching enseignant:', error);
    return false;
  }
}

/**
 * Fusion complète des données d'un enseignant avec son établissement
 */
export async function fusionnerDonneesEnseignant(
  enseignantId: string,
  etablissementId: string,
  invitationCode?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Rattacher l'enseignant à l'établissement
    const rattachementOk = await rattacherEnseignant(enseignantId, etablissementId, invitationCode);
    if (!rattachementOk) {
      return { success: false, message: 'Erreur lors du rattachement de l\'enseignant' };
    }

    // 2. Rattacher les notes
    const notesOk = await rattacherNotes(enseignantId, etablissementId);
    if (!notesOk) {
      return { success: false, message: 'Erreur lors du rattachement des notes' };
    }

    // 3. Rattacher les devoirs
    const devoirsOk = await rattacherDevoirs(enseignantId, etablissementId);
    if (!devoirsOk) {
      return { success: false, message: 'Erreur lors du rattachement des devoirs' };
    }

    // 4. Rattacher les bulletins
    const bulletinsOk = await rattacherBulletins(enseignantId, etablissementId);
    if (!bulletinsOk) {
      return { success: false, message: 'Erreur lors du rattachement des bulletins' };
    }

    // 5. Mettre à jour le profil si besoin
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_role')
      .eq('id', enseignantId)
      .single();

    if (profile && !profile.active_role) {
      await supabase
        .from('profiles')
        .update({ active_role: 'enseignant' })
        .eq('id', enseignantId);
    }

    return { success: true, message: 'Fusion des données réussie' };
  } catch (error) {
    console.error('Error in fusionnerDonneesEnseignant:', error);
    return { success: false, message: 'Une erreur est survenue lors de la fusion' };
  }
}

/**
 * Vérifier si un code d'invitation est valide
 */
export async function verifierCodeInvitation(code: string): Promise<{
  valide: boolean;
  message: string;
  data?: {
    etablissementId: string;
    etablissementNom: string;
    role: string;
    invitePar: string;
    inviteParNom: string;
  };
}> {
  try {
    const { data, error } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        etablissement:etablissement_id (id, nom),
        inviteur:invite_par (id, profiles:profiles (nom, prenom))
      `)
      .eq('code', code)
      .eq('statut', 'en_attente')
      .single();

    if (error || !data) {
      return { valide: false, message: 'Code d\'invitation invalide ou expiré' };
    }

    // Vérifier si le code n'est pas expiré
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valide: false, message: 'Ce code d\'invitation a expiré' };
    }

    const inviteurNom = data.inviteur?.profiles?.prenom 
      ? `${data.inviteur.profiles.prenom} ${data.inviteur.profiles.nom}`
      : 'un utilisateur';

    return {
      valide: true,
      message: 'Code valide',
      data: {
        etablissementId: data.etablissement_id,
        etablissementNom: data.etablissement?.nom || 'Établissement',
        role: data.role,
        invitePar: data.invite_par,
        inviteParNom: inviteurNom,
      },
    };
  } catch (error) {
    console.error('Error verifying invitation code:', error);
    return { valide: false, message: 'Erreur lors de la vérification du code' };
  }
}