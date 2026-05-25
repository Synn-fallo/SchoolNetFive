// /home/project/utils/pdf-generators/generators/generateClassePDF.ts
// Générateur de relevé de classe (portrait)

import jsPDF from 'jspdf';
import { PDF_CONFIG, drawInstitutionalHeader, drawFooter, drawRoundedTable, formatNumber } from '../shared';
import { ExportColumn, DEFAULT_CLASSE_COLUMNS } from '@/types/exportColumns.types';

export interface ClassePDFParams {
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
  }>;
  columns?: ExportColumn[];
}

export async function generateClassePDFDocument(params: ClassePDFParams): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const margin = PDF_CONFIG.margins.left;
  let y = margin;

  y = drawInstitutionalHeader(
    doc,
    params.etablissementNom,
    'RELEVÉ DE NOTES',
    params.anneeScolaireLibelle,
    params.periodeLabel,
    margin
  );

  doc.setFontSize(PDF_CONFIG.fontSizes.body);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.text(`Classe : ${params.classeNom}`, margin, y);
  y += 6;
  
  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  doc.text(`Effectif : ${params.effectif} élèves`, margin, y);
  doc.text(`Moyenne de la classe : ${formatNumber(params.moyenneClasse)}/20`, margin + 80, y);
  y += 8;

  if (params.eleves.length > 0) {
    const columnsToShow = params.columns || DEFAULT_CLASSE_COLUMNS;
    
    const headers: string[] = [];
    const columnWidths: number[] = [];
    
    if (columnsToShow.includes('rang')) {
      headers.push('Rang');
      columnWidths.push(15);
    }
    if (columnsToShow.includes('matricule')) {
      headers.push('Matricule');
      columnWidths.push(45);
    }
    if (columnsToShow.includes('nom')) {
      headers.push('Nom');
      columnWidths.push(50);
    }
    if (columnsToShow.includes('prenom')) {
      headers.push('Prénom');
      columnWidths.push(50);
    }
    if (columnsToShow.includes('moyenne')) {
      headers.push('Moy.');
      columnWidths.push(25);
    }
    if (columnsToShow.includes('appreciation')) {
      headers.push('Appréciation');
      columnWidths.push(35);
    }
    
    const rows = params.eleves.map(e => {
      const row: string[] = [];
      if (columnsToShow.includes('rang')) row.push(e.rang.toString());
      if (columnsToShow.includes('matricule')) row.push(e.matricule);
      if (columnsToShow.includes('nom')) row.push(e.nom);
      if (columnsToShow.includes('prenom')) row.push(e.prenom);
      if (columnsToShow.includes('moyenne')) row.push(formatNumber(e.moyenne));
      if (columnsToShow.includes('appreciation')) row.push(e.appreciation);
      return row;
    });
    
    y = drawRoundedTable(doc, y, headers, rows, columnWidths, margin);
  } else {
    doc.setFontSize(PDF_CONFIG.fontSizes.body);
    doc.text('Aucun élève trouvé', margin, y);
    y += 10;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i, pageCount);
  }

  return doc;
}