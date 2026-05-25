// /home/project/hooks/useDocumentGenerationV2.tsx
// Hook pour la génération de documents PDF avec jsPDF
// Version V2 utilisant les modules modulaires de /utils/pdf-generators/

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import jsPDF from 'jspdf';
import { ExportColumn } from '@/types/exportColumns.types';

import {
  generateRapportPDFDocument,
  generateTableauHonneurPDFDocument,
  generateClassePDFDocument,
  generateMatierePDFDocument,
  generateBulletinPDFDocument,
} from '@/utils/pdf-generators';

export interface GenerateRapportParams {
  etablissementNom: string;
  anneeScolaireLibelle: string;
  periodeLabel: string;
  statsGenerales: {
    moyenneEtablissement: number;
    tauxReussite: number;
    meilleureClasse: { nom: string; moyenne: number };
    plusFaibleClasse: { nom: string; moyenne: number };
  };
  classesStats: Array<{
    nom: string;
    effectif: number;
    moyenneGenerale: number;
    rang: number;
    tauxReussite: number;
  }>;
  matieresStats?: Array<{
    nom: string;
    coefficient: number;
    moyenneEtablissement?: number;
    moyenne?: number;
    meilleureNote?: number;
    plusFaibleNote?: number;
  }>;
  inclureTableauHonneur?: boolean;
  tableauHonneur?: Array<{
    nom: string;
    prenom: string;
    moyenne: number;
    rang: number;
  }>;
  orientation?: 'portrait' | 'landscape';
}

export interface GenerateTableauHonneurParams {
  etablissementNom: string;
  anneeScolaireLibelle: string;
  periodeLabel: string;
  classeNom?: string;
  seuilMoyenne: number;
  topN: number;
  eleves: Array<{
    nom: string;
    prenom: string;
    moyenne: number;
    rang: number;
    mention: 'felicitations' | 'encouragement' | 'tableau_honneur';
  }>;
  orientation?: 'portrait' | 'landscape';
}

export interface GenerateClassePDFParams {
  etablissementNom: string;
  anneeScolaireLibelle: string;
  periodeLabel: string;
  classeNom: string;
  effectif: number;
  moyenneClasse: number;
  eleves: Array<{
    rang: number;
    matricule: string;
    nom: string;
    prenom: string;
    moyenne: number;
    appreciation: string;
    detailsParMatiere?: Array<{
      matiere: string;
      coefficient: number;
      note: number;
      moyenneClasse: number;
      rangMatiere: number;
    }>;
  }>;
  orientation?: 'portrait' | 'landscape';
  columns?: ExportColumn[];
}

export interface GenerateMatierePDFParams {
  etablissementNom: string;
  anneeScolaireLibelle: string;
  periodeLabel: string;
  classeNom: string;
  matiereNom: string;
  coefficient: number;
  effectif: number;
  moyenneClasse: number;
  ecartType: number;
  tauxReussite: number;
  eleves: Array<{
    rang: number;
    matricule: string;
    nom: string;
    prenom: string;
    note: number;
    appreciation: string;
  }>;
  orientation?: 'portrait' | 'landscape';
  columns?: ExportColumn[];
}

export interface GenerateBulletinParams {
  eleveId: string;
  eleveNom: string;
  elevePrenom: string;
  matriculeEtablissement: string;
  matriculeSNET: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  sexe?: 'M' | 'F';
  classeNom: string;
  anneeScolaireLibelle: string;
  periodeLabel: string;
  notes: Array<{
    matiere: string;
    coefficient: number;
    moyenneInterrogations: number;
    devoir1: number;
    devoir2: number;
    moyenne: number;
    rang: number;
    appreciation: string;
  }>;
  moyenneGenerale: number;
  rang: number;
  plusForteMoyenne: { valeur: number; eleve: string };
  plusFaibleMoyenne: { valeur: number; eleve: string };
  decisions: string[];
  appreciationChef: string;
  appreciationPP?: string;
  qrCodeUrl: string;
  orientation?: 'portrait' | 'landscape';
}

export interface UseDocumentGenerationReturn {
  generating: boolean;
  error: string | null;
  generateRapportPDF: (params: GenerateRapportParams) => Promise<string | null>;
  generateTableauHonneurPDF: (params: GenerateTableauHonneurParams) => Promise<string | null>;
  generateClassePDF: (params: GenerateClassePDFParams) => Promise<string | null>;
  generateMatierePDF: (params: GenerateMatierePDFParams) => Promise<string | null>;
  generateBulletinPDF: (params: GenerateBulletinParams) => Promise<string | null>;
  sharePDF: (uri: string, fileName: string) => Promise<boolean>;
}

async function saveAndSharePDF(doc: jsPDF, fileName: string): Promise<string | null> {
  try {
    const pdfBase64 = doc.output('datauristring');
    
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = pdfBase64;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return pdfBase64;
    } else {
      const fileUri = FileSystem.documentDirectory + fileName;
      const base64Data = pdfBase64.split(',')[1];
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
      return fileUri;
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    return null;
  }
}

export function useDocumentGeneration(): UseDocumentGenerationReturn {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRapportPDF = useCallback(async (params: GenerateRapportParams): Promise<string | null> => {
    setGenerating(true);
    setError(null);
    try {
      const generatorParams = {
        etablissementNom: params.etablissementNom,
        anneeScolaireLibelle: params.anneeScolaireLibelle,
        periodeLabel: params.periodeLabel,
        statsGenerales: params.statsGenerales,
        classesStats: params.classesStats,
        matieresStats: params.matieresStats?.map(m => ({
          nom: m.nom,
          coefficient: m.coefficient,
          moyenneEtablissement: (m as any).moyenneEtablissement ?? (m as any).moyenne ?? 0,
        })),
        inclureTableauHonneur: params.inclureTableauHonneur,
        tableauHonneur: params.tableauHonneur,
      };
      const doc = await generateRapportPDFDocument(generatorParams);
      const fileName = `rapport_${params.periodeLabel || 'periode'}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      return await saveAndSharePDF(doc, fileName);
    } catch (err) {
      console.error('Error generating rapport PDF:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PDF');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateTableauHonneurPDF = useCallback(async (params: GenerateTableauHonneurParams): Promise<string | null> => {
    setGenerating(true);
    setError(null);
    try {
      const doc = await generateTableauHonneurPDFDocument({
        etablissementNom: params.etablissementNom,
        anneeScolaireLibelle: params.anneeScolaireLibelle,
        periodeLabel: params.periodeLabel,
        classeNom: params.classeNom,
        seuilMoyenne: params.seuilMoyenne,
        topN: params.topN,
        eleves: params.eleves,
      });
      const fileName = `tableau_honneur_${params.periodeLabel || 'periode'}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      return await saveAndSharePDF(doc, fileName);
    } catch (err) {
      console.error('Error generating tableau honneur PDF:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PDF');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateClassePDF = useCallback(async (params: GenerateClassePDFParams): Promise<string | null> => {
    setGenerating(true);
    setError(null);
    try {
      const doc = await generateClassePDFDocument({
        etablissementNom: params.etablissementNom,
        anneeScolaireLibelle: params.anneeScolaireLibelle,
        periodeLabel: params.periodeLabel,
        classeNom: params.classeNom,
        effectif: params.effectif,
        moyenneClasse: params.moyenneClasse,
        eleves: params.eleves.map(e => ({
          rang: e.rang,
          matricule: e.matricule,
          nom: e.nom,
          prenom: e.prenom,
          moyenne: e.moyenne,
          appreciation: e.appreciation,
        })),
        columns: params.columns,
      });
      const fileName = `releve_classe_${params.classeNom}_${params.periodeLabel}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      return await saveAndSharePDF(doc, fileName);
    } catch (err) {
      console.error('Error generating classe PDF:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PDF');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateMatierePDF = useCallback(async (params: GenerateMatierePDFParams): Promise<string | null> => {
    setGenerating(true);
    setError(null);
    try {
      const doc = await generateMatierePDFDocument({
        etablissementNom: params.etablissementNom,
        anneeScolaireLibelle: params.anneeScolaireLibelle,
        periodeLabel: params.periodeLabel,
        classeNom: params.classeNom,
        matiereNom: params.matiereNom,
        coefficient: params.coefficient,
        effectif: params.effectif,
        moyenneClasse: params.moyenneClasse,
        ecartType: params.ecartType,
        tauxReussite: params.tauxReussite,
        eleves: params.eleves.map(e => ({
          rang: e.rang,
          matricule: e.matricule,
          nom: e.nom,
          prenom: e.prenom,
          note: e.note,
          appreciation: e.appreciation,
        })),
        columns: params.columns,
      });
      const fileName = `analyse_matiere_${params.matiereNom}_${params.periodeLabel}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      return await saveAndSharePDF(doc, fileName);
    } catch (err) {
      console.error('Error generating matiere PDF:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PDF');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateBulletinPDF = useCallback(async (params: GenerateBulletinParams): Promise<string | null> => {
    setGenerating(true);
    setError(null);
    try {
      const doc = await generateBulletinPDFDocument({
        etablissementNom: params.etablissementNom,
        anneeScolaireLibelle: params.anneeScolaireLibelle,
        periodeLabel: params.periodeLabel,
        eleveNom: params.eleveNom,
        elevePrenom: params.elevePrenom,
        matriculeEtablissement: params.matriculeEtablissement,
        matriculeSNET: params.matriculeSNET,
        dateNaissance: params.dateNaissance,
        lieuNaissance: params.lieuNaissance,
        sexe: params.sexe,
        classeNom: params.classeNom,
        notes: params.notes,
        moyenneGenerale: params.moyenneGenerale,
        rang: params.rang,
        plusForteMoyenne: params.plusForteMoyenne,
        plusFaibleMoyenne: params.plusFaibleMoyenne,
        decisions: params.decisions,
        appreciationChef: params.appreciationChef,
        appreciationPP: params.appreciationPP,
        qrCodeUrl: params.qrCodeUrl,
      });
      const fileName = `bulletin_${params.eleveNom}_${params.elevePrenom}_${params.periodeLabel}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      return await saveAndSharePDF(doc, fileName);
    } catch (err) {
      console.error('Error generating bulletin PDF:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PDF');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const sharePDF = useCallback(async (uri: string, fileName: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        return true;
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      return false;
    }
  }, []);

  return {
    generating,
    error,
    generateRapportPDF,
    generateTableauHonneurPDF,
    generateClassePDF,
    generateMatierePDF,
    generateBulletinPDF,
    sharePDF,
  };
}