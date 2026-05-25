// /home/project/utils/pdf-generators/generators/generateRapportPDF.ts
// Générateur de rapport de période (paysage)

import jsPDF from 'jspdf';
import { PDF_CONFIG, drawInstitutionalHeader, drawFooter, drawRoundedTable, formatNumber } from '../shared';

export interface RapportPDFParams {
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
    moyenneEtablissement: number;
  }>;
  inclureTableauHonneur?: boolean;
  tableauHonneur?: Array<{
    nom: string;
    prenom: string;
    moyenne: number;
    rang: number;
  }>;
}

export async function generateRapportPDFDocument(params: RapportPDFParams): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONFIG.margins.left;
  let y = margin;

  y = drawInstitutionalHeader(
    doc,
    params.etablissementNom,
    'RAPPORT DE FIN DE PÉRIODE',
    params.anneeScolaireLibelle,
    params.periodeLabel,
    margin
  );

  doc.setFontSize(PDF_CONFIG.fontSizes.section);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.text('STATISTIQUES GÉNÉRALES', margin, y);
  y += 6;

  doc.setFontSize(PDF_CONFIG.fontSizes.body);
  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');

  const statsRows = [
    `Moyenne établissement : ${formatNumber(params.statsGenerales.moyenneEtablissement)}/20`,
    `Taux de réussite : ${formatNumber(params.statsGenerales.tauxReussite, 1)}%`,
    `Meilleure classe : ${params.statsGenerales.meilleureClasse.nom} (${formatNumber(params.statsGenerales.meilleureClasse.moyenne)}/20)`,
    `Classe à améliorer : ${params.statsGenerales.plusFaibleClasse.nom} (${formatNumber(params.statsGenerales.plusFaibleClasse.moyenne)}/20)`,
  ];

  statsRows.forEach((row) => {
    doc.text(row, margin, y);
    y += 5;
  });
  y += 4;

  if (params.classesStats.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(PDF_CONFIG.fontSizes.section);
    doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
    doc.text('MOYENNES PAR CLASSE', margin, y);
    y += 6;

    const headers = ['Classe', 'Effectif', 'Moyenne', 'Rang', 'Taux réussite'];
    const columnWidths = [50, 25, 30, 25, 35];
    const rows = params.classesStats.map(c => [
      c.nom,
      c.effectif.toString(),
      formatNumber(c.moyenneGenerale),
      c.rang.toString(),
      `${formatNumber(c.tauxReussite, 0)}%`,
    ]);

    y = drawRoundedTable(doc, y, headers, rows, columnWidths, margin);
    y += 4;
  }

  if (params.matieresStats && params.matieresStats.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(PDF_CONFIG.fontSizes.section);
    doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
    doc.text('DÉTAIL PAR MATIÈRE', margin, y);
    y += 6;

    const headers = ['Matière', 'Coeff.', 'Moyenne établissement'];
    const columnWidths = [80, 40, 60];
    const rows = params.matieresStats.map(m => [
      m.nom,
      m.coefficient.toString(),
      formatNumber(m.moyenneEtablissement),
    ]);

    y = drawRoundedTable(doc, y, headers, rows, columnWidths, margin);
    y += 4;
  }

  if (params.inclureTableauHonneur && params.tableauHonneur && params.tableauHonneur.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(PDF_CONFIG.fontSizes.section);
    doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
    doc.text('TABLEAU D\'HONNEUR', margin, y);
    y += 6;

    const headers = ['Rang', 'Nom & Prénoms', 'Moyenne'];
    const columnWidths = [30, 100, 50];
    const rows = params.tableauHonneur.map(e => [
      e.rang.toString(),
      `${e.prenom} ${e.nom}`,
      formatNumber(e.moyenne),
    ]);

    y = drawRoundedTable(doc, y, headers, rows, columnWidths, margin);
    y += 4;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i, pageCount);
  }

  return doc;
}