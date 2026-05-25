import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { genererMotDePasse } from '@/utils/motDePasseUtils';

export interface Eleve {
  id: string;
  user_id?: string;
  etablissement_id: string;
  educmaster?: string;
  identifiant_connexion?: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  classe_id?: string;
  groupe_id?: string;
  classe_nom?: string;
  statut: string;
  created_at: string;
  motDePasseTemp?: string;
}

export interface ParentDataForCreate {
  type_lien: string;
  telephone: string;
  nom: string;
  prenom: string;
  email_personnel?: string;
  existing_parent_id?: string;
}

export interface CreateEleveData {
  etablissement_id: string;
  educmaster?: string;
  nom: string;
  prenom: string;
  sexe?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  classe_id?: string;
  groupe_id?: string;
  matricule?: string;
  statut?: string;
  parents?: ParentDataForCreate[];
}

export interface UpdateEleveData {
  nom?: string;
  prenom?: string;
  sexe?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  classe_id?: string;
  groupe_id?: string;
  matricule?: string;
  statut?: string;
}

function normaliserChaine(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')           // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, '')              // Garde lettres, chiffres, espaces, tirets
    .trim()                                    // Supprime espaces début/fin
    .replace(/\s+/g, '.')                      // Remplace les espaces par des points
    .replace(/\.+/g, '.');                     // Évite points multiples
}

async function genererIdentifiantSimple(
  nom: string,
  prenom: string,
  existingIds: string[]
): Promise<string> {
  const nomNormalise = normaliserChaine(nom);
  const prenomNormalise = normaliserChaine(prenom);
  const baseIdentifiant = `${nomNormalise}.${prenomNormalise}@snet.bj`;
  
  if (!existingIds.includes(baseIdentifiant)) {
    return baseIdentifiant;
  }
  
  let suffixe = 1;
  let identifiant = `${nomNormalise}.${prenomNormalise}.${suffixe}@snet.bj`;
  
  while (existingIds.includes(identifiant) && suffixe < 100) {
    suffixe++;
    identifiant = `${nomNormalise}.${prenomNormalise}.${suffixe}@snet.bj`;
  }
  
  return identifiant;
}

export function useEleves() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getElevesByEtablissement = useCallback(async (
    etablissementId: string,
    classeId?: string
  ): Promise<Eleve[]> => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('eleves')
        .select('*')
        .eq('etablissement_id', etablissementId);

      if (classeId) {
        query = query.eq('classe_id', classeId);
      }

      const { data: elevesData, error: elevesError } = await query;

      if (elevesError) throw elevesError;

      if (!elevesData || elevesData.length === 0) {
        return [];
      }

      const userIds = elevesData.map(e => e.user_id).filter(Boolean) as string[];
      let profilesMap: Record<string, { nom: string; prenom: string; sexe?: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom, sexe')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = { nom: p.nom || '', prenom: p.prenom || '', sexe: p.sexe };
            return acc;
          }, {} as Record<string, { nom: string; prenom: string; sexe?: string }>);
        }
      }

      const classeIds = elevesData.map(e => e.classe_id).filter(Boolean) as string[];
      let classesMap: Record<string, { nom: string }> = {};
      
      if (classeIds.length > 0) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, nom')
          .in('id', classeIds);

        if (!classesError && classesData) {
          classesMap = classesData.reduce((acc, c) => {
            acc[c.id] = { nom: c.nom };
            return acc;
          }, {} as Record<string, { nom: string }>);
        }
      }

      return elevesData.map(e => ({
        ...e,
        nom: profilesMap[e.user_id]?.nom || '',
        prenom: profilesMap[e.user_id]?.prenom || '',
        sexe: profilesMap[e.user_id]?.sexe,
        classe_nom: classesMap[e.classe_id]?.nom || '',
      })) as Eleve[];
    } catch (err) {
      console.error('Error fetching eleves:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getEleveById = useCallback(async (id: string): Promise<Eleve | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: eleveData, error: eleveError } = await supabase
        .from('eleves')
        .select('*')
        .eq('id', id)
        .single();

      if (eleveError) throw eleveError;
      if (!eleveData) return null;

      let nom = '', prenom = '', sexe = '';
      if (eleveData.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nom, prenom, sexe')
          .eq('id', eleveData.user_id)
          .single();

        if (!profileError && profileData) {
          nom = profileData.nom || '';
          prenom = profileData.prenom || '';
          sexe = profileData.sexe || '';
        }
      }

      let classe_nom = '';
      if (eleveData.classe_id) {
        const { data: classeData, error: classeError } = await supabase
          .from('classes')
          .select('nom')
          .eq('id', eleveData.classe_id)
          .single();

        if (!classeError && classeData) {
          classe_nom = classeData.nom;
        }
      }

      return {
        ...eleveData,
        nom,
        prenom,
        sexe,
        classe_nom,
      } as Eleve;
    } catch (err) {
      console.error('Error fetching eleve:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTousLesIdentifiants = useCallback(async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('eleves')
      .select('identifiant_connexion');
    
    if (error) {
      console.error('Error fetching all identifiants:', error);
      return [];
    }
    return data.map(row => row.identifiant_connexion).filter(Boolean) as string[];
  }, []);

  const createEleve = useCallback(async (
    data: CreateEleveData,
    identifiantConnexion?: string
  ): Promise<{ success: boolean; data?: Eleve; error?: string; motDePasseTemp?: string; parentsResults?: any[] }> => {
    setLoading(true);
    setError(null);
    
    try {
      let finalIdentifiant = identifiantConnexion;
      
      if (!finalIdentifiant) {
        const tousLesIds = await getTousLesIdentifiants();
        finalIdentifiant = await genererIdentifiantSimple(
          data.nom,
          data.prenom,
          tousLesIds
        );
      }
      
      // La génération du matricule est faite par l'Edge Function
      const matricule = data.matricule || undefined;
      const motDePasseTemp = genererMotDePasse(data.prenom);
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                           process.env.NEXT_PUBLIC_SUPABASE_URL || 
                           'https://dohqohgnnysbvykyruwy.supabase.co';
      
      const functionUrl = `${supabaseUrl}/functions/v1/create-eleve`;
      
      const parentsData = (data.parents || [])
        .filter(p => p.telephone && p.nom && p.prenom)
        .map(p => ({
          type_lien: p.type_lien,
          telephone: p.telephone,
          nom: p.nom,
          prenom: p.prenom,
          email_personnel: p.email_personnel || null,
          existing_parent_id: p.existing_parent_id || null,
        }));
      
      // ✅ RÉCUPÉRATION DU TOKEN D'AUTHENTIFICATION
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`, // ✅ AJOUT DU TOKEN
        },
        body: JSON.stringify({
          email: finalIdentifiant,
          password: motDePasseTemp,
          nom: data.nom,
          prenom: data.prenom,
          sexe: data.sexe || null,
          etablissement_id: data.etablissement_id,
          classe_id: data.classe_id,
          groupe_id: data.groupe_id || null,
          educmaster: data.educmaster,
          telephone: data.telephone,
          date_naissance: data.date_naissance,
          matricule: matricule,
          parents: parentsData,
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }
      
      const edgeData = await response.json();
      
      if (!edgeData.success) {
        throw new Error(edgeData.error || 'Erreur création élève');
      }
      
      const userId = edgeData.data.user_id;
      
      const { data: eleveData, error: eleveError } = await supabase
        .from('eleves')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (eleveError) throw eleveError;
      
      return { 
        success: true, 
        data: {
          ...eleveData,
          nom: data.nom,
          prenom: data.prenom,
          sexe: data.sexe,
          motDePasseTemp,
        } as Eleve,
        motDePasseTemp,
        parentsResults: edgeData.data.parents,
      };
    } catch (err) {
      console.error('Error creating eleve:', err);
      setError(err instanceof Error ? err.message : 'Erreur de création');
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de création' };
    } finally {
      setLoading(false);
    }
  }, [getTousLesIdentifiants]);

  const updateEleve = useCallback(async (
    id: string,
    data: UpdateEleveData
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('📝 updateEleve - id:', id);
    console.log('📝 updateEleve - data:', JSON.stringify(data, null, 2));
    
    setLoading(true);
    setError(null);
    
    try {
      const updateData: any = {};
      if (data.date_naissance !== undefined) updateData.date_naissance = data.date_naissance;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.telephone !== undefined) updateData.telephone = data.telephone;
      if (data.classe_id !== undefined) updateData.classe_id = data.classe_id;
      if (data.groupe_id !== undefined) updateData.groupe_id = data.groupe_id;
      if (data.matricule !== undefined) updateData.matricule = data.matricule;
      if (data.statut !== undefined) updateData.statut = data.statut;
      
      console.log('📝 updateEleve - updateData final:', JSON.stringify(updateData, null, 2));
      
      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', id);
  
      if (error) {
        console.error('📝 updateEleve - Supabase error:', error);
        throw error;
      }
      
      console.log('📝 updateEleve - succès');
      
      if (data.nom !== undefined || data.prenom !== undefined || data.sexe !== undefined) {
        const { data: eleveData, error: fetchError } = await supabase
          .from('eleves')
          .select('user_id')
          .eq('id', id)
          .single();
        
        if (!fetchError && eleveData?.user_id) {
          const profileUpdate: any = {};
          if (data.nom !== undefined) profileUpdate.nom = data.nom;
          if (data.prenom !== undefined) profileUpdate.prenom = data.prenom;
          if (data.sexe !== undefined) profileUpdate.sexe = data.sexe;
          
          await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', eleveData.user_id);
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error updating eleve:', err);
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de mise à jour' };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEleve = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('eleves')
        .update({ statut: 'inactif' })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error deleting eleve:', err);
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de suppression' };
    } finally {
      setLoading(false);
    }
  }, []);

  const getElevesByClasse = useCallback(async (classeId: string): Promise<Eleve[]> => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('eleves')
        .select('*')
        .eq('classe_id', classeId)
        .eq('statut', 'actif');

      const { data: elevesData, error: elevesError } = await query;

      if (elevesError) throw elevesError;

      if (!elevesData || elevesData.length === 0) {
        return [];
      }

      const userIds = elevesData.map(e => e.user_id).filter(Boolean) as string[];
      let profilesMap: Record<string, { nom: string; prenom: string; sexe?: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom, sexe')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = { nom: p.nom || '', prenom: p.prenom || '', sexe: p.sexe };
            return acc;
          }, {} as Record<string, { nom: string; prenom: string; sexe?: string }>);
        }
      }

      return elevesData.map(e => ({
        ...e,
        nom: profilesMap[e.user_id]?.nom || '',
        prenom: profilesMap[e.user_id]?.prenom || '',
        sexe: profilesMap[e.user_id]?.sexe,
      })) as Eleve[];
    } catch (err) {
      console.error('Error fetching eleves by classe:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const importEleves = useCallback(async (
    eleves: CreateEleveData[],
    classeId: string,
    etablissementId: string
  ): Promise<{ success: boolean; imported: number; failed: number; errors: string[] }> => {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < eleves.length; i++) {
      const eleve = eleves[i];
      
      try {
        const createResult = await createEleve({
          ...eleve,
          etablissement_id: etablissementId,
          classe_id: classeId,
        });

        if (!createResult.success) {
          errors.push(`Ligne ${i + 1}: ${createResult.error}`);
          failed++;
        } else {
          imported++;
        }
      } catch (err) {
        errors.push(`Ligne ${i + 1}: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        failed++;
      }
    }

    return { success: failed === 0, imported, failed, errors };
  }, [createEleve]);

  return {
    loading,
    error,
    getElevesByEtablissement,
    getEleveById,
    getElevesByClasse,
    createEleve,
    updateEleve,
    deleteEleve,
    importEleves,
  };
}