import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEducMasterConfig } from './useEducMasterConfig';

export interface EducMasterValidation {
  isValid: boolean;
  error?: string;
  last4Digits?: string;
}

export interface IdentifiantGeneration {
  base: string;
  candidate: string;
  suffixe: number;
  isCollision: boolean;
}

export interface EducMasterEleveData {
  nom: string;
  prenom: string;
  sexe?: 'M' | 'F';
  date_naissance?: string;
  lieu_naissance?: string;
  etablissement_id?: string;
  etablissement_nom?: string;
  identifiant_connexion?: string;  // ← NOUVEAU
  source: 'local' | 'api' | 'cache' | 'none';
}

// Fonction de normalisation (identique à celle dans useEleves)
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

export function useEducMaster() {
  const [checking, setChecking] = useState(false);
  const { getOrdreVerification, isApiEnabled, getApiTimeout } = useEducMasterConfig();

  // Valider le format de l'EducMaster
  const validateFormat = useCallback((educmaster: string): EducMasterValidation => {
    if (!educmaster || educmaster.trim() === '') {
      return { isValid: false, error: 'L\'EducMaster est obligatoire' };
    }

    const cleaned = educmaster.replace(/\s/g, '');
    
    // Format attendu: chiffres uniquement, entre 10 et 20 caractères
    if (!/^\d{10,20}$/.test(cleaned)) {
      return { isValid: false, error: 'L\'EducMaster doit contenir uniquement des chiffres (10 à 20 caractères)' };
    }

    const last4Digits = cleaned.slice(-4);
    return { isValid: true, last4Digits };
  }, []);

  // Vérifier si l'EducMaster existe dans NOTRE base (version corrigée - 3 requêtes simples)
  const checkExistsInLocal = useCallback(async (educmaster: string): Promise<{ exists: boolean; data?: EducMasterEleveData; error?: string }> => {
    const cleaned = educmaster.replace(/\s/g, '');
    
    try {
      // ÉTAPE 1: Récupérer l'élève et son user_id
      const { data: eleveData, error: eleveError } = await supabase
        .from('eleves')
        .select('id, user_id, educmaster, etablissement_id, identifiant_connexion')
        .eq('educmaster', cleaned)
        .maybeSingle();
  
      if (eleveError) {
        console.error('Erreur requête eleve:', eleveError);
        throw eleveError;
      }
  
      if (!eleveData) {
        return { exists: false };
      }
  
      // ÉTAPE 2: Récupérer le profil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nom, prenom, sexe, date_naissance')
        .eq('id', eleveData.user_id)
        .maybeSingle();
  
      if (profileError) {
        console.error('Erreur requête profile:', profileError);
      }
  
      // ÉTAPE 3: Récupérer l'établissement (optionnel)
      let etablissementNom = '';
      if (eleveData.etablissement_id) {
        const { data: etabData, error: etabError } = await supabase
          .from('etablissements')
          .select('nom')
          .eq('id', eleveData.etablissement_id)
          .maybeSingle();
  
        if (!etabError && etabData) {
          etablissementNom = etabData.nom;
        }
      }
  
      return {
        exists: true,
        data: {
          nom: profileData?.nom || '',
          prenom: profileData?.prenom || '',
          sexe: profileData?.sexe as 'M' | 'F' | undefined,
          date_naissance: profileData?.date_naissance,
          etablissement_id: eleveData.etablissement_id,
          etablissement_nom: etablissementNom,
          identifiant_connexion: eleveData.identifiant_connexion,  // ← NOUVEAU
          source: 'local',
        },
      };
    } catch (error) {
      console.error('Error checking EducMaster in local DB:', error);
      return { exists: false, error: 'Erreur lors de la recherche locale' };
    }
  }, []);

  // Vérifier via l'API externe (proxy)
  const checkExistsViaAPI = useCallback(async (educmaster: string): Promise<{ exists: boolean; data?: EducMasterEleveData; error?: string }> => {
    const cleaned = educmaster.replace(/\s/g, '');
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return { exists: false, error: 'Configuration API manquante' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), getApiTimeout());

      const response = await fetch(`${supabaseUrl}/functions/v1/proxy-educmaster-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ educmaster: cleaned }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { exists: false, error: `API retourne erreur ${response.status}` };
      }

      const result = await response.json();

      if (result.success && result.data) {
        return {
          exists: true,
          data: {
            nom: result.data.nom || '',
            prenom: result.data.prenom || '',
            sexe: result.data.sexe as 'M' | 'F' | undefined,
            date_naissance: result.data.date_naissance,
            lieu_naissance: result.data.lieu_naissance,
            source: result.fromCache ? 'cache' : 'api',
          },
        };
      }

      return { exists: false, error: result.error };
    } catch (error) {
      console.error('Error calling EducMaster API:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        return { exists: false, error: `Timeout après ${getApiTimeout()}ms` };
      }
      return { exists: false, error: 'Erreur lors de l\'appel API' };
    }
  }, [getApiTimeout]);

  // Récupérer les informations d'un élève par EducMaster (avec logique configurable)
  const getEleveByEducMaster = useCallback(async (educmaster: string): Promise<EducMasterEleveData> => {
    const cleaned = educmaster.replace(/\s/g, '');
    const ordre = getOrdreVerification();
    const apiEnabled = isApiEnabled();
    
    console.log(`🔍 Recherche EducMaster ${cleaned} - Ordre: ${ordre}, API activée: ${apiEnabled}`);

    // Mode: BDD → API (défaut)
    if (ordre === 'BDD_API') {
      // ÉTAPE 1: Vérifier dans notre base
      const localResult = await checkExistsInLocal(cleaned);
      if (localResult.exists && localResult.data) {
        console.log('✅ Élève trouvé dans la base locale');
        return localResult.data;
      }

      // ÉTAPE 2: Vérifier via l'API externe (si activée)
      if (apiEnabled) {
        const apiResult = await checkExistsViaAPI(cleaned);
        if (apiResult.exists && apiResult.data) {
          console.log('✅ Élève trouvé via API externe');
          return apiResult.data;
        }
      }

      console.log('❌ Aucun élève trouvé');
      return { nom: '', prenom: '', source: 'none' };
    }

    // Mode: API → BDD
    if (ordre === 'API_BDD') {
      // ÉTAPE 1: Vérifier via l'API externe (si activée)
      if (apiEnabled) {
        const apiResult = await checkExistsViaAPI(cleaned);
        if (apiResult.exists && apiResult.data) {
          console.log('✅ Élève trouvé via API externe');
          return apiResult.data;
        }
      }

      // ÉTAPE 2: Vérifier dans notre base
      const localResult = await checkExistsInLocal(cleaned);
      if (localResult.exists && localResult.data) {
        console.log('✅ Élève trouvé dans la base locale (fallback)');
        return localResult.data;
      }

      console.log('❌ Aucun élève trouvé');
      return { nom: '', prenom: '', source: 'none' };
    }

    return { nom: '', prenom: '', source: 'none' };
  }, [checkExistsInLocal, checkExistsViaAPI, getOrdreVerification, isApiEnabled]);

  // Vérifier si l'EducMaster existe déjà (simple existence, sans les données)
  const checkExists = useCallback(async (educmaster: string): Promise<{ exists: boolean; data?: any; error?: string }> => {
    const cleaned = educmaster.replace(/\s/g, '');
    
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('id, user_id, educmaster')
        .eq('educmaster', cleaned)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Récupérer le profil pour avoir nom et prénom
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nom, prenom')
          .eq('id', data.user_id)
          .maybeSingle();

        return { 
          exists: true, 
          data: { 
            ...data, 
            nom: profileData?.nom, 
            prenom: profileData?.prenom 
          } 
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking EducMaster:', error);
      return { exists: false, error: 'Erreur lors de la vérification' };
    }
  }, []);

  // Générer l'identifiant SNET (format nom.prenom@snet.bj) - SANS EducMaster
  const generateIdentifiantSimple = useCallback(async (
    nom: string,
    prenom: string,
    currentId?: string
  ): Promise<{ success: boolean; identifiant: string; suffixe: number; error?: string }> => {
    const cleanedNom = normaliserChaine(nom);
    const cleanedPrenom = normaliserChaine(prenom);
    
    let base = `${cleanedNom}.${cleanedPrenom}@snet.bj`;
    let suffixe = 0;
    let candidate = base;
    
    try {
      while (true) {
        const { data, error } = await supabase
          .from('eleves')
          .select('id')
          .eq('identifiant_connexion', candidate)
          .maybeSingle();

        if (error) throw error;
        
        if (!data || (currentId && data.id === currentId)) {
          break;
        }
        
        suffixe++;
        candidate = `${cleanedNom}.${cleanedPrenom}.${suffixe}@snet.bj`;
        
        if (suffixe > 99) {
          return { success: false, identifiant: '', suffixe: 0, error: 'Impossible de générer un identifiant unique' };
        }
      }
      
      return { success: true, identifiant: candidate, suffixe };
    } catch (error) {
      console.error('Error generating simple identifiant:', error);
      return { success: false, identifiant: '', suffixe: 0, error: 'Erreur lors de la génération' };
    }
  }, []);

  // Vérifier l'unicité de l'identifiant SNET (sans EducMaster)
  const checkIdentifiantUniquenessSimple = useCallback(async (
    nom: string,
    prenom: string
  ): Promise<IdentifiantGeneration> => {
    const cleanedNom = normaliserChaine(nom);
    const cleanedPrenom = normaliserChaine(prenom);
    
    const base = `${cleanedNom}.${cleanedPrenom}@snet.bj`;
    
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('id')
        .eq('identifiant_connexion', base)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        return { base, candidate: `${cleanedNom}.${cleanedPrenom}.1@snet.bj`, suffixe: 1, isCollision: true };
      }
      
      return { base, candidate: base, suffixe: 0, isCollision: false };
    } catch (error) {
      console.error('Error checking simple identifiant uniqueness:', error);
      return { base, candidate: base, suffixe: 0, isCollision: false };
    }
  }, []);

  return {
    validateFormat,
    checkExists,
    checkExistsInLocal,
    checkExistsViaAPI,
    getEleveByEducMaster,
    generateIdentifiantSimple,
    checkIdentifiantUniquenessSimple,
    checking,
  };
}