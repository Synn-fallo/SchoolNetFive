// /home/project/utils/pdf-generators/generators/generateBulletinPDF.ts
// Générateur de bulletin individuel (portrait)
// Version enrichie avec décisions du conseil (7 options) et observations

import jsPDF from 'jspdf';
import { PDF_CONFIG, drawInstitutionalHeader, drawFooter, drawRoundedTable, formatNumber } from '../shared';

export interface BulletinPDFParams {
  etablissementNom: string;
  anneeScolaireLibelle: string;
  periodeLabel: string;
  regime: 'semestre' | 'trimestre';
  eleveNom: string;
  elevePrenom: string;
  matriculeEtablissement: string;
  matriculeSNET: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  sexe?: 'M' | 'F';
  classeNom: string;
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
  decisions: {
    orientation: 'passe_classe_superieure' | 'redouble_franchement' | 'redouble_cas_echec' | 'redouble_fin_cycle';
    mention: 'felicitations' | 'encouragement' | 'tableau_honneur' | null;
  };
  appreciationChef: string;
  appreciationPP?: string;
  lieuEtablissement?: string;
  dateEdition?: string;
  qrCodeUrl: string;
}

/**
 * Dessine la section des décisions du conseil
 */
function drawDecisionsSection(
  doc: jsPDF,
  startY: number,
  decisions: BulletinPDFParams['decisions'],
  margin: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY;

  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.text('DÉCISION DU CONSEIL DES PROFESSEURS', margin, y);
  y += 6;

  // Dessiner un cadre autour des décisions
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageWidth - margin * 2, 50, 'S');

  let x = margin + 5;
  let lineY = y + 5;

  // Décisions d'orientation (colonne de gauche)
  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);

  const orientationOptions = [
    { key: 'passe_classe_superieure', label: 'Passe en Classe Supérieure' },
    { key: 'redouble_franchement', label: 'Redouble Franchement' },
    { key: 'redouble_cas_echec', label: 'Redouble en Cas d\'Echec' },
    { key: 'redouble_fin_cycle', label: 'Redouble en Fin de Cycle/Scolarité' },
  ];

  for (const opt of orientationOptions) {
    const isSelected = decisions.orientation === opt.key;
    doc.text(isSelected ? '✅' : '☐', x, lineY);
    doc.text(opt.label, x + 5, lineY);
    lineY += 5;
  }

  // Mentions (colonne de droite)
  x = margin + 90;
  lineY = y + 5;

  doc.text('Mentions :', x, lineY);
  lineY += 5;

  const mentionOptions = [
    { key: 'felicitations', label: 'Félicitations' },
    { key: 'encouragement', label: 'Encouragement' },
    { key: 'tableau_honneur', label: 'Tableau d\'Honneur' },
  ];

  for (const opt of mentionOptions) {
    const isSelected = decisions.mention === opt.key;
    doc.text(isSelected ? '✅' : '☐', x, lineY);
    doc.text(opt.label, x + 5, lineY);
    lineY += 5;
  }

  return y + 55;
}

/**
 * Dessine la section des observations du chef d'établissement
 */
function drawObservationsSection(
  doc: jsPDF,
  startY: number,
  appreciationChef: string,
  lieuEtablissement: string,
  dateEdition: string,
  chefNom: string,
  margin: number,
  pageWidth: number
): number {
  let y = startY;

  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.text('OBSERVATION DU CHEF D\'ÉTABLISSEMENT', margin, y);
  y += 6;

  // Cadre
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageWidth - margin * 2, 50, 'S');

  // Ligne "Fait à"
  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
  doc.text(`Fait à ${lieuEtablissement || '_________'}, le ${dateEdition || '____ / ____ / 2026'}`, margin + 5, y + 8);

  // Appréciations
  doc.text('Appréciations :', margin + 5, y + 18);
  
  // Lignes pour l'appréciation (si non renseignée, lignes pointillées)
  if (appreciationChef && appreciationChef !== '_________________________') {
    doc.text(appreciationChef, margin + 5, y + 28);
  } else {
    doc.line(margin + 5, y + 28, margin + 100, y + 28);
    doc.line(margin + 5, y + 35, margin + 100, y + 35);
    doc.line(margin + 5, y + 42, margin + 100, y + 42);
  }

  // Signature et cachet
  doc.text('Signature et Cachet', margin + 5, y + 52);
  
  // Nom du chef
  doc.text(`Nom & Prénoms du Chef d'Établissement : ${chefNom || '_________________'}`, margin + 5, y + 62);

  return y + 70;
}

/**
 * Génère le PDF du bulletin individuel
 */
export async function generateBulletinPDFDocument(params: BulletinPDFParams): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONFIG.margins.left;
  let y = margin;

  // ========== EN-TÊTE ==========
  y = drawInstitutionalHeader(
    doc,
    params.etablissementNom,
    'BULLETIN DE NOTES',
    params.anneeScolaireLibelle,
    params.periodeLabel,
    margin
  );

  // ========== IDENTIFICATION DE L'ÉLÈVE ==========
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, y, pageWidth - margin * 2, 32, 'F');
  
  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.text('IDENTIFICATION DE L\'ÉLÈVE', margin + 5, y + 5);
  
  doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  doc.text(`Nom : ${params.eleveNom}`, margin + 5, y + 12);
  doc.text(`Prénom : ${params.elevePrenom}`, margin + 80, y + 12);
  doc.text(`Matricule : ${params.matriculeEtablissement}`, margin + 5, y + 18);
  doc.text(`Classe : ${params.classeNom}`, margin + 80, y + 18);
  doc.text(`Date naiss. : ${params.dateNaissance || 'Non renseignée'}`, margin + 5, y + 24);
  doc.text(`Sexe : ${params.sexe === 'M' ? 'Masculin' : params.sexe === 'F' ? 'Féminin' : 'Non renseigné'}`, margin + 80, y + 24);
  
  y += 38;

  // ========== RÉSULTATS PAR MATIÈRE ==========
  if (params.notes.length > 0) {
    const headers = ['Matière', 'Coef.', 'Moy.Inter', 'Devoir1', 'Devoir2', 'Moy.', 'Rang', 'Appréciation'];
    const columnWidths = [25, 10, 15, 15, 15, 12, 10, 28];
    const rows = params.notes.map(n => [
      n.matiere,
      n.coefficient.toString(),
      formatNumber(n.moyenneInterrogations),
      formatNumber(n.devoir1),
      formatNumber(n.devoir2),
      formatNumber(n.moyenne),
      n.rang.toString(),
      n.appreciation,
    ]);
    
    doc.setFontSize(7);
    y = drawRoundedTable(doc, y, headers, rows, columnWidths, margin);
    doc.setFontSize(8);
    y += 8;
  }

  // ========== RÉCAPITULATIF ==========
  if (y > doc.internal.pageSize.getHeight() - 130) {
    doc.addPage();
    y = margin;
  }
  
  doc.setFillColor(240, 253, 244);
  doc.rect(margin, y, pageWidth - margin * 2, 32, 'F');
  
  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.text('RÉCAPITULATIF', margin + 5, y + 5);
  
  doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  
  const moyenneColor = params.moyenneGenerale >= 10 ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(moyenneColor[0], moyenneColor[1], moyenneColor[2]);
  doc.text(`Moyenne générale : ${formatNumber(params.moyenneGenerale)}/20`, margin + 5, y + 12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Rang dans la classe : ${params.rang}`, margin + 80, y + 12);
  doc.text(`Plus forte moyenne : ${formatNumber(params.plusForteMoyenne.valeur)} (${params.plusForteMoyenne.eleve})`, margin + 5, y + 19);
  doc.text(`Plus faible moyenne : ${formatNumber(params.plusFaibleMoyenne.valeur)} (${params.plusFaibleMoyenne.eleve})`, margin + 5, y + 26);
  
  y += 38;

  // ========== DÉCISIONS DU CONSEIL ==========
  if (y > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    y = margin;
  }

  y = drawDecisionsSection(doc, y, params.decisions, margin);
  y += 5;

  // ========== APPRÉCIATIONS ==========
  if (params.appreciationPP) {
    doc.setFillColor(254, 243, 199);
    doc.rect(margin, y, pageWidth - margin * 2, 18, 'F');
    doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
    doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
    doc.text('Appréciation du Professeur Principal :', margin + 5, y + 5);
    doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
    doc.text(params.appreciationPP, margin + 5, y + 12);
    y += 22;
  }

  // ========== OBSERVATIONS DU CHEF ==========
  const dateStr = params.dateEdition || new Date().toLocaleDateString('fr-FR');
  y = drawObservationsSection(
    doc, 
    y, 
    params.appreciationChef, 
    params.lieuEtablissement || '', 
    dateStr, 
    params.chefNom || '_________________',
    margin, 
    pageWidth
  );

  // ========== VÉRIFICATION QUE LE BULLETIN TIENT SUR 1 PAGE ==========
  if (y > doc.internal.pageSize.getHeight() - 15) {
    console.warn('⚠️ Le bulletin dépasse la page A4. Envisagez de réduire la taille de la police ou les marges.');
  }

  // ========== PIED DE PAGE ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i, pageCount, params.qrCodeUrl);
  }

  return doc;
}