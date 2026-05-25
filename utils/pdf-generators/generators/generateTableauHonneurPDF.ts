// /home/project/utils/pdf-generators/generators/generateTableauHonneurPDF.ts
// Générateur de tableau d'honneur (portrait)

import jsPDF from 'jspdf';
import { PDF_CONFIG, drawInstitutionalHeader, drawFooter, drawRoundedTable, formatNumber } from '../shared';

export interface TableauHonneurPDFParams {
  etablissementNom: string;
  anneeScolaireLibelle: string;
  periodeLabel: string;
  classeNom?: string;
  seuilMoyenne: number;
  topN: number;
  eleves: Array<{
    rang: number;
    nom: string;
    prenom: string;
    moyenne: number;
    mention: 'felicitations' | 'encouragement' | 'tableau_honneur';
  }>;
}

export async function generateTableauHonneurPDFDocument(params: TableauHonneurPDFParams): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONFIG.margins.left;
  let y = margin;

  y = drawInstitutionalHeader(
    doc,
    params.etablissementNom,
    'TABLEAU D\'HONNEUR',
    params.anneeScolaireLibelle,
    params.periodeLabel,
    margin
  );

  if (params.classeNom) {
    doc.setFontSize(PDF_CONFIG.fontSizes.body);
    doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
    doc.text(`Classe : ${params.classeNom}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setFont(PDF_CONFIG.fonts.italic, 'normal');
  doc.text(`Seuil : ≥ ${params.seuilMoyenne}/20 | Top ${params.topN} élèves`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  if (params.eleves.length > 0) {
    const headers = ['Rang', 'Nom & Prénoms', 'Moyenne', 'Mention'];
    const columnWidths = [25, 85, 35, 45];
    const rows = params.eleves.map(e => [
      e.rang.toString(),
      `${e.prenom} ${e.nom}`,
      formatNumber(e.moyenne),
      e.mention === 'felicitations' ? 'Félicitations' : e.mention === 'encouragement' ? 'Encouragements' : 'Tableau d\'honneur',
    ]);

    y = drawRoundedTable(doc, y, headers, rows, columnWidths, margin);
    y += 8;
  } else {
    doc.setFontSize(PDF_CONFIG.fontSizes.body);
    doc.text('Aucun lauréat pour cette période', margin, y);
    y += 10;
  }

  if (y < doc.internal.pageSize.getHeight() - 40) {
    doc.setFillColor(254, 243, 199);
    doc.rect(margin, y, pageWidth - margin * 2, 18, 'F');
    
    doc.setFontSize(PDF_CONFIG.fontSizes.small);
    doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
    doc.setTextColor(217, 119, 6);
    doc.text('🏅 Félicitations à nos lauréats !', margin + 5, y + 6);
    
    doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
    doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
    doc.text(
      'Ces élèves se sont distingués par leur excellence académique. Continuez à travailler avec la même détermination.',
      margin + 5,
      y + 12
    );
    doc.setTextColor(0, 0, 0);
    y += 22;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i, pageCount);
  }

  return doc;
}