// /home/project/hooks/useCorrespondanceEleves.ts
// Hook pour la recherche automatique de correspondance élèves

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ElevePersonnel {
  index: number;
  nom: string;
  prenom: string;
  matricule?: string;
  date_naissance?: string;
}

export interface EleveOfficiel {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  date_naissance?: string;
}

export interface CorrespondanceEleve {
  elevePersonnel: ElevePersonnel;
  eleveOfficielId: string | null;
  eleveOfficielNom: string | null;
  statut: 'auto' | 'manuel' | 'ignore' | 'pending';
  score?: number; // Score de correspondance (0-100)
}

interface UseCorrespondanceElevesProps {
  classePersonnelleId: string;
  classeOfficielleId: string;
}

export function useCorrespondanceEleves({
  classePersonnelleId,
  classeOfficielleId
}: UseCorrespondanceElevesProps) {
  const [loading, setLoading] = useState(false);
  const [elevesPersonnels, setElevesPersonnels] = useState<ElevePersonnel[]>([]);
  const [elevesOfficiels, setElevesOfficiels] = useState<EleveOfficiel[]>([]);
  const [correspondances, setCorrespondances] = useState<CorrespondanceEleve[]>([]);

  /**
   * Normalise une chaîne pour la comparaison (minuscule, sans accents)
   */
  const normaliser = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  /**
   * Calcule un score de similarité entre deux chaînes (0-100)
   */
  const calculerSimilarite = (str1: string, str2: string): number => {
    const s1 = normaliser(str1);
    const s2 = normaliser(str2);
    
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 85;
    
    // Distance de Levenshtein simplifiée
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 100;
    
    const editDistance = (a: string, b: string): number => {
      const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
      
      for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
      
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          const cost = a[j - 1] === b[i - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }
      return matrix[b.length][a.length];
    };
    
    const distance = editDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return Math.round((1 - distance / maxLength) * 100);
  };

  /**
   * Recherche automatiquement la correspondance pour un élève personnel
   */
  const rechercherCorrespondanceAuto = useCallback((eleve: ElevePersonnel): {
    eleve: EleveOfficiel | null;
    score: number;
  } => {
    let meilleurMatch: EleveOfficiel | null = null;
    let meilleurScore = 0;
    
    for (const officiel of elevesOfficiels) {
      let score = 0;
      
      // Priorité 1 : Matricule exact (100 points)
      if (eleve.matricule && officiel.matricule && eleve.matricule === officiel.matricule) {
        return { eleve: officiel, score: 100 };
      }
      
      // Priorité 2 : Nom + Prénom exacts (95 points)
      if (normaliser(eleve.nom) === normaliser(officiel.nom) &&
          normaliser(eleve.prenom) === normaliser(officiel.prenom)) {
        score = 95;
      }
      // Priorité 3 : Nom exact + Prénom similaire
      else if (normaliser(eleve.nom) === normaliser(officiel.nom)) {
        const prenomScore = calculerSimilarite(eleve.prenom, officiel.prenom);
        score = 70 + prenomScore * 0.2;
      }
      // Priorité 4 : Similarité globale
      else {
        const nomScore = calculerSimilarite(eleve.nom, officiel.nom);
        const prenomScore = calculerSimilarite(eleve.prenom, officiel.prenom);
        score = (nomScore + prenomScore) / 2;
      }
      
      // Bonus pour date de naissance
      if (eleve.date_naissance && officiel.date_naissance && 
          eleve.date_naissance === officiel.date_naissance) {
        score = Math.min(score + 10, 100);
      }
      
      if (score > meilleurScore && score >= 60) {
        meilleurScore = score;
        meilleurMatch = officiel;
      }
    }
    
    return { eleve: meilleurMatch, score: meilleurScore };
  }, [elevesOfficiels]);

  /**
   * Exécute la recherche automatique pour tous les élèves
   */
  const executerRechercheAuto = useCallback(async (): Promise<CorrespondanceEleve[]> => {
    setLoading(true);
    
    try {
      // 1. Charger les élèves personnels depuis classes_personnelles
      const { data: classePerso, error: persoError } = await supabase
        .from('classes_personnelles')
        .select('eleves')
        .eq('id', classePersonnelleId)
        .single();
      
      if (persoError) throw persoError;
      
      const personnels: ElevePersonnel[] = (classePerso.eleves || []).map((e: any, idx: number) => ({
        index: idx,
        nom: e.nom || '',
        prenom: e.prenom || '',
        matricule: e.matricule || '',
        date_naissance: e.date_naissance || null
      }));
      setElevesPersonnels(personnels);
      
      // 2. Charger les élèves officiels de la classe
      const { data: officiels, error: offError } = await supabase
        .from('eleves')
        .select('id, nom, prenom, matricule, date_naissance')
        .eq('classe_id', classeOfficielleId);
      
      if (offError) throw offError;
      setElevesOfficiels(officiels || []);
      
      // 3. Récupérer les correspondances existantes
      const { data: existantes, error: existError } = await supabase
        .from('correspondance_eleves')
        .select('*')
        .eq('classe_personnelle_id', classePersonnelleId);
      
      if (existError) throw existError;
      
      // 4. Calculer les correspondances
      const nouvellesCorrespondances: CorrespondanceEleve[] = personnels.map((eleve, idx) => {
        const existante = existantes?.find(e => 
          e.eleve_personnel_nom === eleve.nom && 
          e.eleve_personnel_prenom === eleve.prenom
        );
        
        if (existante && existante.eleve_officiel_id) {
          const officiel = officiels?.find(o => o.id === existante.eleve_officiel_id);
          return {
            elevePersonnel: eleve,
            eleveOfficielId: existante.eleve_officiel_id,
            eleveOfficielNom: officiel ? `${officiel.prenom} ${officiel.nom}` : null,
            statut: 'auto',
            score: 100
          };
        }
        
        const { eleve: match, score } = rechercherCorrespondanceAuto(eleve);
        
        if (match && score >= 70) {
          return {
            elevePersonnel: eleve,
            eleveOfficielId: match.id,
            eleveOfficielNom: `${match.prenom} ${match.nom}`,
            statut: score >= 90 ? 'auto' : 'manuel',
            score
          };
        }
        
        return {
          elevePersonnel: eleve,
          eleveOfficielId: null,
          eleveOfficielNom: null,
          statut: 'pending',
          score: 0
        };
      });
      
      setCorrespondances(nouvellesCorrespondances);
      return nouvellesCorrespondances;
    } catch (error) {
      console.error('Error in auto search:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [classePersonnelleId, classeOfficielleId, rechercherCorrespondanceAuto]);

  /**
   * Met à jour manuellement une correspondance
   */
  const mettreAJourCorrespondance = useCallback(async (
    elevePersonnel: ElevePersonnel,
    eleveOfficielId: string | null,
    statut: 'manuel' | 'ignore'
  ): Promise<boolean> => {
    try {
      const officiel = elevesOfficiels.find(o => o.id === eleveOfficielId);
      
      // Mettre à jour l'état local
      setCorrespondances(prev => prev.map(c => {
        if (c.elevePersonnel.index === elevePersonnel.index) {
          return {
            ...c,
            eleveOfficielId: eleveOfficielId,
            eleveOfficielNom: officiel ? `${officiel.prenom} ${officiel.nom}` : null,
            statut: statut === 'manuel' ? 'manuel' : 'ignore'
          };
        }
        return c;
      }));
      
      // Sauvegarder en base
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('correspondance_eleves')
        .upsert({
          classe_personnelle_id: classePersonnelleId,
          eleve_personnel_nom: elevePersonnel.nom,
          eleve_personnel_prenom: elevePersonnel.prenom,
          eleve_personnel_matricule: elevePersonnel.matricule,
          eleve_officiel_id: eleveOfficielId,
          enseignant_id: user.user?.id,
          statut: eleveOfficielId ? 'active' : 'ignoree'
        }, {
          onConflict: 'classe_personnelle_id,eleve_personnel_nom,eleve_personnel_prenom'
        });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating correspondence:', error);
      return false;
    }
  }, [classePersonnelleId, elevesOfficiels]);

  /**
   * Sauvegarde toutes les correspondances validées
   */
  const sauvegarderToutesCorrespondances = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      
      for (const c of correspondances) {
        if (c.statut === 'auto' || c.statut === 'manuel') {
          const { error } = await supabase
            .from('correspondance_eleves')
            .upsert({
              classe_personnelle_id: classePersonnelleId,
              eleve_personnel_nom: c.elevePersonnel.nom,
              eleve_personnel_prenom: c.elevePersonnel.prenom,
              eleve_personnel_matricule: c.elevePersonnel.matricule,
              eleve_officiel_id: c.eleveOfficielId,
              enseignant_id: user.user?.id,
              statut: 'active'
            }, {
              onConflict: 'classe_personnelle_id,eleve_personnel_nom,eleve_personnel_prenom'
            });
          
          if (error) throw error;
        } else if (c.statut === 'ignore') {
          const { error } = await supabase
            .from('correspondance_eleves')
            .upsert({
              classe_personnelle_id: classePersonnelleId,
              eleve_personnel_nom: c.elevePersonnel.nom,
              eleve_personnel_prenom: c.elevePersonnel.prenom,
              eleve_personnel_matricule: c.elevePersonnel.matricule,
              eleve_officiel_id: null,
              enseignant_id: user.user?.id,
              statut: 'ignoree'
            }, {
              onConflict: 'classe_personnelle_id,eleve_personnel_nom,eleve_personnel_prenom'
            });
          
          if (error) throw error;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving correspondences:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [classePersonnelleId, correspondances]);

  return {
    loading,
    elevesPersonnels,
    elevesOfficiels,
    correspondances,
    executerRechercheAuto,
    mettreAJourCorrespondance,
    sauvegarderToutesCorrespondances,
    rechercherCorrespondanceAuto
  };
}