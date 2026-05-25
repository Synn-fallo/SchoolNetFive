// /home/project/hooks/useAutoInscription.ts

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isValidEducMasterFormat, normalizeEducMaster } from '@/utils/educmasterUtils';

export interface VerificationCodeResult {
  valid: boolean;
  etablissement_id?: string;
  etablissement_nom?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  message?: string;
}

export interface VerificationEducMasterResult {
  valid: boolean;
  exists: boolean;
  auto_filled?: boolean;
  existing_data?: {
    nom: string;
    prenom: string;
    sexe?: string;
    date_naissance?: string;
  };
  message?: string;
  eleve_existant?: {
    id: string;
    nom: string;
    prenom: string;
    statut: string;
  };
}

export interface ParentData {
  nom: string;
  prenom: string;
  telephone: string;
  email_personnel: string;
  type_lien: 'pere' | 'mere' | 'tuteur' | 'autre';
}

export interface EleveData {
  educmaster: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  date_naissance?: string;
  classe_souhaitee: string;
}

export interface DemandeAutoInscriptionData {
  code_etablissement: string;
  eleve: EleveData;
  parent: ParentData;
}

export interface SoumissionResult {
  success: boolean;
  demande_id?: string;
  message?: string;
  error?: string;
  auto_filled?: boolean;
  existing_data?: any;
}

export function useAutoInscription() {
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifyingEducMaster, setVerifyingEducMaster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Vérifier si un code établissement est valide
   * @param code - Code établissement (format: SCHYY1234)
   */
  const verifierCodeEtablissement = useCallback(async (code: string): Promise<VerificationCodeResult> => {
    setVerifyingCode(true);
    setError(null);

    try {
      if (!code || code.trim() === '') {
        return { valid: false, message: 'Veuillez saisir un code établissement' };
      }

      const codeClean = code.trim().toUpperCase();

      // ✅ CORRECTION : Interroger la table etablissements, PAS invitation_codes
      const { data, error: dbError } = await supabase
        .from('etablissements')
        .select('id, nom, code_etablissement, ville, telephone, email, statut')
        .eq('code_etablissement', codeClean)
        .maybeSingle();

      if (dbError) {
        console.error('Erreur vérification code:', dbError);
        return { valid: false, message: 'Erreur lors de la vérification' };
      }

      if (!data) {
        return { valid: false, message: 'Code établissement invalide' };
      }

      return {
        valid: true,
        etablissement_id: data.id,
        etablissement_nom: data.nom,
        ville: data.ville,
        telephone: data.telephone,
        email: data.email,
        message: `Établissement trouvé : ${data.nom}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { valid: false, message: 'Erreur lors de la vérification' };
    } finally {
      setVerifyingCode(false);
    }
  }, []);

  /**
   * Vérifier si un EducMaster est valide et n'existe pas déjà
   */
  const verifierEducMaster = useCallback(async (educmaster: string): Promise<VerificationEducMasterResult> => {
    setVerifyingEducMaster(true);
    setError(null);

    try {
      if (!isValidEducMasterFormat(educmaster)) {
        return { valid: false, exists: false, message: 'EducMaster invalide (doit contenir 12 chiffres)' };
      }

      const cleaned = normalizeEducMaster(educmaster);

      // Vérifier si l'EducMaster existe déjà dans eleves
      const { data: eleveExistant, error: eleveError } = await supabase
        .from('eleves')
        .select('id, user_id, educmaster, statut')
        .eq('educmaster', cleaned)
        .maybeSingle();

      if (eleveError) {
        console.error('Erreur vérification EducMaster:', eleveError);
        return { valid: false, exists: false, message: 'Erreur lors de la vérification' };
      }

      if (eleveExistant && eleveExistant.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nom, prenom, sexe, date_naissance')
          .eq('id', eleveExistant.user_id)
          .maybeSingle();

        let message = `Cet élève existe déjà dans SchoolNet`;
        if (eleveExistant.statut === 'PENDING_ADMIN_VALIDATION') {
          message = 'Une demande est déjà en attente de validation pour cet élève';
        } else if (eleveExistant.statut === 'actif' || eleveExistant.statut === 'CONFIRMED') {
          message = 'Cet élève est déjà inscrit dans un établissement';
        }

        return {
          valid: false,
          exists: true,
          message,
          eleve_existant: {
            id: eleveExistant.id,
            nom: profileData?.nom || '',
            prenom: profileData?.prenom || '',
            statut: eleveExistant.statut || '',
          },
        };
      }

      // Vérifier si une demande est déjà en attente
      const { data: demandeExistante, error: demandeError } = await supabase
        .from('demandes_auto_inscription')
        .select('id, statut')
        .eq('educmaster', cleaned)
        .eq('statut', 'pending')
        .maybeSingle();

      if (demandeError) {
        console.error('Erreur vérification demande existante:', demandeError);
      }

      if (demandeExistante) {
        return {
          valid: false,
          exists: true,
          message: 'Une demande d\'inscription est déjà en attente de validation pour cet élève',
        };
      }

      return { valid: true, exists: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { valid: false, exists: false, message: 'Erreur lors de la vérification' };
    } finally {
      setVerifyingEducMaster(false);
    }
  }, []);

  /**
   * Soumettre une demande d'auto-inscription
   */
  const soumettreDemande = useCallback(async (data: DemandeAutoInscriptionData): Promise<SoumissionResult> => {
    setSubmitting(true);
    setError(null);

    try {
      if (!data.code_etablissement || data.code_etablissement.trim() === '') {
        return { success: false, message: 'Code établissement requis' };
      }

      if (!data.eleve.educmaster || !isValidEducMasterFormat(data.eleve.educmaster)) {
        return { success: false, message: 'EducMaster invalide (12 chiffres requis)' };
      }

      if (!data.eleve.nom || !data.eleve.prenom) {
        return { success: false, message: 'Nom et prénom de l\'élève requis' };
      }

      if (!data.parent.telephone || !data.parent.nom || !data.parent.prenom) {
        return { success: false, message: 'Informations parent incomplètes' };
      }

      // Récupérer la session pour le token JWT
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return { success: false, message: 'Vous devez être connecté pour soumettre une demande' };
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ||
                           process.env.NEXT_PUBLIC_SUPABASE_URL ||
                           'https://dohqohgnnysbvykyruwy.supabase.co';

      const functionUrl = `${supabaseUrl}/functions/v1/auto-inscription`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code_etablissement: data.code_etablissement.trim().toUpperCase(),
          eleve: {
            educmaster: normalizeEducMaster(data.eleve.educmaster),
            nom: data.eleve.nom.toUpperCase(),
            prenom: data.eleve.prenom,
            sexe: data.eleve.sexe,
            date_naissance: data.eleve.date_naissance || null,
            classe_souhaitee: data.eleve.classe_souhaitee,
          },
          parent: {
            nom: data.parent.nom.toUpperCase(),
            prenom: data.parent.prenom,
            telephone: data.parent.telephone.replace(/\D/g, ''),
            email_personnel: data.parent.email_personnel?.toLowerCase() || null,
            type_lien: data.parent.type_lien,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        return { success: false, message: result.error || 'Erreur lors de la soumission' };
      }

      return {
        success: true,
        demande_id: result.demande_id,
        message: 'Votre demande a été envoyée avec succès.',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la soumission';
      setError(message);
      return { success: false, message };
    } finally {
      setSubmitting(false);
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    verifyingCode,
    verifyingEducMaster,
    submitting,
    error,
    verifierCodeEtablissement,
    verifierEducMaster,
    soumettreDemande,
    resetError,
  };
}
