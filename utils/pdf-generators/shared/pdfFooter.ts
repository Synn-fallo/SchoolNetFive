// /home/project/utils/pdf-generators/shared/pdfFooter.ts
// Pied de page pour tous les documents PDF

import jsPDF from 'jspdf';
import { PDF_CONFIG } from './pdfConfig';

export function drawFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  qrCodeUrl?: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_CONFIG.margins.bottom;
  const y = pageHeight - margin;

  doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
  doc.setFont(PDF_CONFIG.fonts.italic, 'normal');
  doc.setTextColor(156, 163, 175);

  doc.text(
    'Document généré par SchoolNet – Plateforme éducative de référence',
    pageWidth / 2,
    y - 6,
    { align: 'center' }
  );

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 8, pageWidth - margin, y - 8);

  doc.text(`Page ${pageNumber}/${totalPages}`, pageWidth / 2, y, { align: 'center' });

  if (qrCodeUrl && pageNumber === 1) {
    doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
    doc.text('🔒 Document authentifiable par QR code', pageWidth / 2, y - 3, { align: 'center' });
  }

  doc.setTextColor(0, 0, 0);
}