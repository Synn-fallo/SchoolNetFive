// /home/project/utils/pdf-generators/shared/pdfHeader.ts
// En-tête institutionnel pour tous les documents PDF

import jsPDF from 'jspdf';
import { PDF_CONFIG } from './pdfConfig';
import { formatOfficialDate } from './pdfUtils';

export function drawInstitutionalHeader(
  doc: jsPDF,
  etablissementNom: string,
  titreDocument: string,
  anneeScolaireLibelle: string,
  periodeLabel: string,
  margin: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('RÉPUBLIQUE DU BÉNIN', pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  doc.text('MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('ET DE LA FORMATION TECHNIQUE ET PROFESSIONNELLE', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setDrawColor(PDF_CONFIG.colors.primary[0], PDF_CONFIG.colors.primary[1], PDF_CONFIG.colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFontSize(PDF_CONFIG.fontSizes.subtitle);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.setTextColor(PDF_CONFIG.colors.primary[0], PDF_CONFIG.colors.primary[1], PDF_CONFIG.colors.primary[2]);
  doc.text(etablissementNom || 'Établissement', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(PDF_CONFIG.fontSizes.body);
  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(anneeScolaireLibelle || '', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(periodeLabel || '', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(PDF_CONFIG.fontSizes.title);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.text(titreDocument, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setFont(PDF_CONFIG.fonts.italic, 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Établi le ${formatOfficialDate(new Date())}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  return y;
}

export function drawSimpleHeader(
  doc: jsPDF,
  titre: string,
  margin: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFontSize(PDF_CONFIG.fontSizes.title);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.text(titre, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(PDF_CONFIG.colors.primary[0], PDF_CONFIG.colors.primary[1], PDF_CONFIG.colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  return y;
}