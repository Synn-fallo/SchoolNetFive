// /home/project/utils/pdf-generators/shared/pdfUtils.ts
// Utilitaires généraux pour les PDF

import jsPDF from 'jspdf';

export function formatNumber(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(decimals);
}

export function formatOfficialDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getContentWidth(doc: jsPDF, margin: number): number {
  return doc.internal.pageSize.getWidth() - margin * 2;
}

export function drawHorizontalLine(
  doc: jsPDF,
  y: number,
  startX: number,
  endX: number,
  lineWidth: number = 0.5
): void {
  doc.setLineWidth(lineWidth);
  doc.line(startX, y, endX, y);
}

export function getNextY(currentY: number, additionalSpace: number = 4): number {
  return currentY + additionalSpace;
}