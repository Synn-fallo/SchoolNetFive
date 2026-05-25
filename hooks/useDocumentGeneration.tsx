// /home/project/hooks/useDocumentGeneration.tsx
// Hook pour la génération de documents PDF avec jsPDF
// Compatible web et mobile

import { useState, useCallback } from 'react';
import { Platform, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import jsPDF from 'jspdf';
import { ExportColumn, DEFAULT_CLASSE_COLUMNS, DEFAULT_MATIERE_COLUMNS } from '@/types/exportColumns.types';

// ============================================================
// TYPES
// ============================================================

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
  columns?: ExportColumn[];  // ← AJOUT
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
  columns?: ExportColumn[];  // ← AJOUT
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

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

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

function drawTable(
  doc: jsPDF,
  startY: number,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
  margin: number
): number {
  const startX = margin;
  let y = startY;
  const rowHeight = 8;
  
  doc.setFillColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  
  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.rect(x, y, columnWidths[i], rowHeight, 'F');
    doc.text(headers[i], x + 2, y + 5);
    x += columnWidths[i];
  }
  
  y += rowHeight;
  
  doc.setFillColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  for (const row of rows) {
    x = startX;
    for (let i = 0; i < row.length; i++) {
      doc.rect(x, y, columnWidths[i], rowHeight);
      doc.text(String(row[i]), x + 2, y + 5);
      x += columnWidths[i];
    }
    y += rowHeight;
    
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
      x = startX;
      doc.setFillColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      for (let i = 0; i < headers.length; i++) {
        doc.rect(x, y, columnWidths[i], rowHeight, 'F');
        doc.text(headers[i], x + 2, y + 5);
        x += columnWidths[i];
      }
      y += rowHeight;
      doc.setFillColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    }
  }
  
  return y;
}

function formatNumber(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(decimals);
}

// ============================================================
// EXPORT PAR CLASSE (RELEVÉ DE CLASSE) – AVEC FILTRAGE DES COLONNES
// ============================================================

async function generateClassePDFDocument(params: GenerateClassePDFParams): Promise<string | null> {
  try {
    console.log('🔍 generateClassePDFDocument - params reçus:', JSON.stringify(params, null, 2));
    
    const doc = new jsPDF({
      orientation: params.orientation === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // En-tête
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELEVÉ DE NOTES', pageWidth / 2, y, { align: 'center' });
    y += 8;
    
    doc.setFontSize(12);
    doc.text(params.etablissementNom || 'Établissement', pageWidth / 2, y, { align: 'center' });
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${params.anneeScolaireLibelle || ''} – ${params.periodeLabel || ''}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(`Classe : ${params.classeNom || ''}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Informations générales
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Effectif : ${params.effectif || 0} élèves`, margin, y);
    doc.text(`Moyenne de la classe : ${formatNumber(params.moyenneClasse)}/20`, margin + 80, y);
    y += 8;

    // Liste des élèves avec colonnes dynamiques
    if (params.eleves && params.eleves.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTE DES ÉLÈVES', margin, y);
      y += 6;
      
      // Déterminer les colonnes à afficher
      const columnsToShow = params.columns || DEFAULT_CLASSE_COLUMNS;
      
      // Construire les en-têtes et les largeurs dynamiquement
      const headers: string[] = [];
      const columnWidths: number[] = [];
      
      if (columnsToShow.includes('rang')) {
        headers.push('Rang');
        columnWidths.push(15);
      }
      if (columnsToShow.includes('matricule')) {
        headers.push('Matricule');
        columnWidths.push(35);
      }
      if (columnsToShow.includes('nom')) {
        headers.push('Nom');
        columnWidths.push(40);
      }
      if (columnsToShow.includes('prenom')) {
        headers.push('Prénom');
        columnWidths.push(40);
      }
      if (columnsToShow.includes('moyenne')) {
        headers.push('Moy.');
        columnWidths.push(20);
      }
      if (columnsToShow.includes('appreciation')) {
        headers.push('Appréciation');
        columnWidths.push(35);
      }
      
      // Construire les lignes avec les mêmes colonnes
      const rows = params.eleves.map(e => {
        const row: string[] = [];
        if (columnsToShow.includes('rang')) row.push(e.rang.toString());
        if (columnsToShow.includes('matricule')) row.push(e.matricule || '');
        if (columnsToShow.includes('nom')) row.push(e.nom || '');
        if (columnsToShow.includes('prenom')) row.push(e.prenom || '');
        if (columnsToShow.includes('moyenne')) row.push(formatNumber(e.moyenne));
        if (columnsToShow.includes('appreciation')) row.push(e.appreciation || '');
        return row;
      });
      
      console.log('🔍 generateClassePDFDocument - colonnes affichées:', headers);
      
      y = drawTable(doc, y, headers, rows, columnWidths, margin);
    } else {
      doc.setFontSize(10);
      doc.text('Aucun élève trouvé', margin, y);
      y += 10;
    }

    // Pied de page
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Document généré par SchoolNet – ${dateStr} – Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const fileName = `releve_classe_${params.classeNom || 'classe'}_${params.periodeLabel || 'periode'}_${dateStr.replace(/\//g, '-')}.pdf`;
    return await saveAndSharePDF(doc, fileName);
  } catch (err) {
    console.error('Error in generateClassePDFDocument:', err);
    throw err;
  }
}

// ============================================================
// EXPORT PAR MATIÈRE (ANALYSE DE MATIÈRE) – AVEC FILTRAGE DES COLONNES
// ============================================================

async function generateMatierePDFDocument(params: GenerateMatierePDFParams): Promise<string | null> {
  try {
    console.log('🔍 generateMatierePDFDocument - params reçus:', JSON.stringify(params, null, 2));
    
    const doc = new jsPDF({
      orientation: params.orientation === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // En-tête
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ANALYSE DE MATIÈRE', pageWidth / 2, y, { align: 'center' });
    y += 8;
    
    doc.setFontSize(12);
    doc.text(params.etablissementNom || 'Établissement', pageWidth / 2, y, { align: 'center' });
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${params.anneeScolaireLibelle || ''} – ${params.periodeLabel || ''}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(`Classe : ${params.classeNom || ''}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(`Matière : ${params.matiereNom || ''} (Coefficient ${params.coefficient || 1})`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Statistiques
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('STATISTIQUES', margin, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Effectif : ${params.effectif || 0} élèves`, margin + 5, y);
    doc.text(`Moyenne de la classe : ${formatNumber(params.moyenneClasse)}/20`, margin + 60, y);
    doc.text(`Écart-type : ${formatNumber(params.ecartType)}`, margin + 120, y);
    y += 5;
    doc.text(`Taux de réussite (≥10/20) : ${formatNumber(params.tauxReussite, 0)}%`, margin + 5, y);
    y += 10;

    // Liste des élèves avec colonnes dynamiques
    if (params.eleves && params.eleves.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSULTATS PAR ÉLÈVE', margin, y);
      y += 6;
      
      // Déterminer les colonnes à afficher
      const columnsToShow = params.columns || DEFAULT_MATIERE_COLUMNS;
      
      // Construire les en-têtes et les largeurs dynamiquement
      const headers: string[] = [];
      const columnWidths: number[] = [];
      
      if (columnsToShow.includes('rang')) {
        headers.push('Rang');
        columnWidths.push(15);
      }
      if (columnsToShow.includes('matricule')) {
        headers.push('Matricule');
        columnWidths.push(35);
      }
      if (columnsToShow.includes('nom')) {
        headers.push('Nom');
        columnWidths.push(40);
      }
      if (columnsToShow.includes('prenom')) {
        headers.push('Prénom');
        columnWidths.push(40);
      }
      if (columnsToShow.includes('moyenne')) {
        headers.push('Note');
        columnWidths.push(20);
      }
      if (columnsToShow.includes('appreciation')) {
        headers.push('Appréciation');
        columnWidths.push(35);
      }
      
      // Construire les lignes avec les mêmes colonnes
      const rows = params.eleves.map(e => {
        const row: string[] = [];
        if (columnsToShow.includes('rang')) row.push(e.rang.toString());
        if (columnsToShow.includes('matricule')) row.push(e.matricule || '');
        if (columnsToShow.includes('nom')) row.push(e.nom || '');
        if (columnsToShow.includes('prenom')) row.push(e.prenom || '');
        if (columnsToShow.includes('moyenne')) row.push(formatNumber(e.note));
        if (columnsToShow.includes('appreciation')) row.push(e.appreciation || '');
        return row;
      });
      
      console.log('🔍 generateMatierePDFDocument - colonnes affichées:', headers);
      
      y = drawTable(doc, y, headers, rows, columnWidths, margin);
    } else {
      doc.setFontSize(10);
      doc.text('Aucun élève trouvé', margin, y);
      y += 10;
    }

    // Pied de page
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Document généré par SchoolNet – ${dateStr} – Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const fileName = `analyse_matiere_${params.matiereNom || 'matiere'}_${params.periodeLabel || 'periode'}_${dateStr.replace(/\//g, '-')}.pdf`;
    return await saveAndSharePDF(doc, fileName);
  } catch (err) {
    console.error('Error in generateMatierePDFDocument:', err);
    throw err;
  }
}

// ============================================================
// GÉNÉRATION RAPPORT DE PÉRIODE (A4 paysage)
// ============================================================

async function generateRapportPDFDocument(params: GenerateRapportParams): Promise<string | null> {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // En-tête
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT DE FIN DE PÉRIODE', pageWidth / 2, y, { align: 'center' });
    y += 8;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(params.etablissementNom || 'Établissement', pageWidth / 2, y, { align: 'center' });
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(params.anneeScolaireLibelle || '', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(params.periodeLabel || '', pageWidth / 2, y, { align: 'center' });
    y += 5;
    
    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(`Établi le ${dateStr}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Statistiques générales
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('STATISTIQUES GÉNÉRALES', margin, y);
    y += 6;
    
    doc.setFontSize(10);
    doc.text(`Moyenne établissement : ${formatNumber(params.statsGenerales?.moyenneEtablissement)}/20`, margin, y);
    y += 5;
    doc.text(`Taux de réussite : ${formatNumber(params.statsGenerales?.tauxReussite, 1)}%`, margin, y);
    y += 5;
    doc.text(`Meilleure classe : ${params.statsGenerales?.meilleureClasse?.nom || 'N/A'} (${formatNumber(params.statsGenerales?.meilleureClasse?.moyenne)}/20)`, margin, y);
    y += 5;
    doc.text(`Classe à améliorer : ${params.statsGenerales?.plusFaibleClasse?.nom || 'N/A'} (${formatNumber(params.statsGenerales?.plusFaibleClasse?.moyenne)}/20)`, margin, y);
    y += 10;

    // Moyennes par classe
    if (params.classesStats && params.classesStats.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('MOYENNES PAR CLASSE', margin, y);
      y += 6;
      
      const headers = ['Classe', 'Effectif', 'Moyenne', 'Rang', 'Taux réussite'];
      const columnWidths = [40, 20, 25, 20, 30];
      const rows = params.classesStats.map(c => [
        c.nom || 'N/A',
        (c.effectif || 0).toString(),
        formatNumber(c.moyenneGenerale),
        (c.rang || 0).toString(),
        `${formatNumber(c.tauxReussite, 0)}%`,
      ]);
      
      y = drawTable(doc, y, headers, rows, columnWidths, margin);
      y += 6;
    }

    // Détail par matière
    if (params.matieresStats && params.matieresStats.length > 0) {
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DÉTAIL PAR MATIÈRE', margin, y);
      y += 6;
      
      const headers = ['Matière', 'Coeff.', 'Moyenne'];
      const columnWidths = [60, 30, 40];
      const rows = params.matieresStats.map(m => [
        m.nom || 'N/A',
        (m.coefficient || 1).toString(),
        formatNumber((m as any).moyenneEtablissement ?? (m as any).moyenne ?? 0),
      ]);
      
      y = drawTable(doc, y, headers, rows, columnWidths, margin);
      y += 6;
    }

    // Pied de page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Document généré par SchoolNet – Plateforme éducative – Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const fileName = `rapport_${params.periodeLabel || 'periode'}_${dateStr.replace(/\//g, '-')}.pdf`;
    return await saveAndSharePDF(doc, fileName);
  } catch (err) {
    console.error('Error in generateRapportPDFDocument:', err);
    throw err;
  }
}

// ============================================================
// GÉNÉRATION TABLEAU D'HONNEUR (A4 portrait)
// ============================================================

async function generateTableauHonneurPDFDocument(params: GenerateTableauHonneurParams): Promise<string | null> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TABLEAU D\'HONNEUR', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(params.etablissementNom || 'Établissement', pageWidth / 2, y, { align: 'center' });
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(params.anneeScolaireLibelle || '', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(params.periodeLabel || '', pageWidth / 2, y, { align: 'center' });
    y += 5;
    
    if (params.classeNom) {
      doc.text(`Classe : ${params.classeNom}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }
    
    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(`Établi le ${dateStr}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Seuil : ≥ ${params.seuilMoyenne || 14}/20 | Top ${params.topN || 5} élèves`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTE DES LAURÉATS', margin, y);
    y += 6;
    
    const headers = ['Rang', 'Nom & Prénoms', 'Moyenne', 'Mention'];
    const columnWidths = [20, 70, 25, 40];
    const rows = (params.eleves || []).map(e => [
      (e.rang || 0).toString(),
      `${e.prenom || ''} ${e.nom || ''}`.trim() || 'N/A',
      formatNumber(e.moyenne),
      e.mention === 'felicitations' ? 'Félicitations' : e.mention === 'encouragement' ? 'Encouragements' : 'Tableau d\'honneur',
    ]);
    
    y = drawTable(doc, y, headers, rows, columnWidths, margin);
    y += 10;

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Document généré par SchoolNet – Plateforme éducative – Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const fileName = `tableau_honneur_${params.periodeLabel || 'periode'}_${dateStr.replace(/\//g, '-')}.pdf`;
    return await saveAndSharePDF(doc, fileName);
  } catch (err) {
    console.error('Error in generateTableauHonneurPDFDocument:', err);
    throw err;
  }
}

// ============================================================
// GÉNÉRATION BULLETIN INDIVIDUEL (A4 portrait)
// ============================================================

async function generateBulletinPDFDocument(params: GenerateBulletinParams): Promise<string | null> {
  try {
    console.log('🔍 generateBulletinPDFDocument - params reçus:', JSON.stringify(params, null, 2));
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // ========== EN-TÊTE INSTITUTIONNEL ==========
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('MINISTÈRE DE L\'ENSEIGNEMENT SECONDAIRE', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ET DE LA FORMATION TECHNIQUE ET PROFESSIONNELLE', pageWidth / 2, y, { align: 'center' });
    y += 6;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('LYCEE TECHNIQUE PROFESSIONNEL', pageWidth / 2, y, { align: 'center' });
    y += 8;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BULLETIN DE NOTES', pageWidth / 2, y, { align: 'center' });
    y += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${params.anneeScolaireLibelle || ''} – ${params.periodeLabel || ''}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // ========== IDENTIFICATION DE L'ÉLÈVE ==========
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, pageWidth - margin * 2, 35, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('IDENTIFICATION DE L\'ÉLÈVE', margin + 5, y + 5);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom : ${params.eleveNom || ''}`, margin + 5, y + 12);
    doc.text(`Prénom : ${params.elevePrenom || ''}`, margin + 80, y + 12);
    doc.text(`Matricule : ${params.matriculeEtablissement || ''}`, margin + 5, y + 19);
    doc.text(`Classe : ${params.classeNom || ''}`, margin + 80, y + 19);
    doc.text(`Date naiss. : ${params.dateNaissance || 'Non renseignée'}`, margin + 5, y + 26);
    doc.text(`Sexe : ${params.sexe === 'M' ? 'Masculin' : params.sexe === 'F' ? 'Féminin' : 'Non renseigné'}`, margin + 80, y + 26);
    
    y += 42;

    // ========== RÉSULTATS PAR MATIÈRE ==========
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('RÉSULTATS PAR MATIÈRE', margin, y);
    y += 6;
    
    const headers = ['Matière', 'Coef.', 'Moy.Inter', 'Devoir1', 'Devoir2', 'Moy.', 'Rang', 'Appréciation'];
    const columnWidths = [25, 10, 15, 15, 15, 12, 10, 25];
    const rows = (params.notes || []).map(n => [
      n.matiere || 'N/A',
      (n.coefficient || 1).toString(),
      formatNumber(n.moyenneInterrogations),
      formatNumber(n.devoir1),
      formatNumber(n.devoir2),
      formatNumber(n.moyenne),
      (n.rang || 0).toString(),
      n.appreciation || '',
    ]);
    
    doc.setFontSize(7);
    y = drawTable(doc, y, headers, rows, columnWidths, margin);
    doc.setFontSize(8);
    y += 8;

    // ========== RÉCAPITULATIF ==========
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFillColor(240, 253, 244);
    doc.rect(margin, y, pageWidth - margin * 2, 35, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('RÉCAPITULATIF', margin + 5, y + 5);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const moyenneColor = (params.moyenneGenerale || 0) >= 10 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(moyenneColor[0], moyenneColor[1], moyenneColor[2]);
    doc.text(`Moyenne générale : ${formatNumber(params.moyenneGenerale)}/20`, margin + 5, y + 12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Rang dans la classe : ${params.rang || 0}`, margin + 80, y + 12);
    doc.text(`Plus forte moyenne : ${formatNumber(params.plusForteMoyenne?.valeur)} (${params.plusForteMoyenne?.eleve || 'N/A'})`, margin + 5, y + 19);
    doc.text(`Plus faible moyenne : ${formatNumber(params.plusFaibleMoyenne?.valeur)} (${params.plusFaibleMoyenne?.eleve || 'N/A'})`, margin + 5, y + 26);
    
    y += 42;

    // ========== DÉCISIONS ET APPRÉCIATIONS ==========
    if (y > doc.internal.pageSize.getHeight() - 70) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉCISION DU CONSEIL', margin, y);
    y += 5;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    (params.decisions || []).forEach((decision, idx) => {
      doc.text(`✓ ${decision}`, margin + 5, y + idx * 5);
    });
    y += (params.decisions || []).length * 5 + 8;

    if (params.appreciationPP) {
      doc.setFillColor(254, 243, 199);
      doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Appréciation du Professeur Principal :', margin + 5, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(params.appreciationPP, margin + 5, y + 12);
      y += 25;
    }
    
    doc.setFillColor(254, 243, 199);
    doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Appréciation du Chef d\'établissement :', margin + 5, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(params.appreciationChef || '_________________________', margin + 5, y + 12);
    y += 25;

    // ========== SIGNATURES ==========
    const sigY = doc.internal.pageSize.getHeight() - 45;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Le Professeur Principal', margin, sigY);
    doc.text('Le Chef d\'établissement', margin + 50, sigY);
    doc.text('L\'Élève', margin + 100, sigY);
    doc.text('Les Parents/Tuteur', margin + 150, sigY);
    
    for (let i = 0; i < 4; i++) {
      doc.line(margin + i * 50, sigY + 5, margin + i * 50 + 35, sigY + 5);
    }

    // ========== DATE ET PIED DE PAGE ==========
    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.setFontSize(8);
    doc.text(`Fait à ________________, le ${dateStr}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 25, { align: 'center' });
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Document généré par SchoolNet – Plateforme éducative – Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const fileName = `bulletin_${params.eleveNom || ''}_${params.elevePrenom || ''}_${params.periodeLabel || 'periode'}_${dateStr.replace(/\//g, '-')}.pdf`;
    return await saveAndSharePDF(doc, fileName);
  } catch (err) {
    console.error('Error in generateBulletinPDFDocument:', err);
    throw err;
  }
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useDocumentGeneration(): UseDocumentGenerationReturn {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRapportPDF = useCallback(async (params: GenerateRapportParams): Promise<string | null> => {
    setGenerating(true);
    try {
      return await generateRapportPDFDocument(params);
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
    try {
      return await generateTableauHonneurPDFDocument(params);
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
    try {
      console.log('🔍 generateClassePDF - params reçus:', JSON.stringify(params, null, 2));
      const result = await generateClassePDFDocument(params);
      console.log('🔍 generateClassePDF - résultat:', result);
      return result;
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
    try {
      console.log('🔍 generateMatierePDF - params reçus:', JSON.stringify(params, null, 2));
      const result = await generateMatierePDFDocument(params);
      console.log('🔍 generateMatierePDF - résultat:', result);
      return result;
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
    try {
      return await generateBulletinPDFDocument(params);
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