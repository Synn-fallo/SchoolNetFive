// /home/project/utils/pdf-generators/shared/pdfTable.ts
// Tableaux avec coins arrondis et zébrage

import jsPDF from 'jspdf';
import { PDF_CONFIG } from './pdfConfig';

export function drawRoundedTable(
  doc: jsPDF,
  startY: number,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
  margin: number,
  borderRadius: number = 3
): number {
  const startX = margin;
  let y = startY;
  const rowHeight = 7;
  const headerHeight = 8;

  let x = startX;
  doc.setFillColor(
    PDF_CONFIG.colors.headerBg[0],
    PDF_CONFIG.colors.headerBg[1],
    PDF_CONFIG.colors.headerBg[2]
  );
  doc.roundedRect(x, y, columnWidths.reduce((a, b) => a + b, 0), headerHeight, borderRadius, borderRadius, 'F');

  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setTextColor(
    PDF_CONFIG.colors.headerText[0],
    PDF_CONFIG.colors.headerText[1],
    PDF_CONFIG.colors.headerText[2]
  );

  x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 2, y + 5);
    x += columnWidths[i];
  }
  y += headerHeight;

  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
  doc.setTextColor(0, 0, 0);

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const isFirstRow = rowIdx === 0;
    const isLastRow = rowIdx === rows.length - 1;

    if (rowIdx % 2 === 0) {
      doc.setFillColor(PDF_CONFIG.colors.rowEven[0], PDF_CONFIG.colors.rowEven[1], PDF_CONFIG.colors.rowEven[2]);
    } else {
      doc.setFillColor(PDF_CONFIG.colors.rowOdd[0], PDF_CONFIG.colors.rowOdd[1], PDF_CONFIG.colors.rowOdd[2]);
    }

    if (isFirstRow && isLastRow) {
      doc.roundedRect(startX, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight, borderRadius, borderRadius, 'F');
    } else if (isFirstRow) {
      doc.roundedRect(startX, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight, borderRadius, 0, 'F');
    } else if (isLastRow) {
      doc.roundedRect(startX, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 0, borderRadius, 'F');
    } else {
      doc.rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
    }

    doc.setDrawColor(PDF_CONFIG.colors.border[0], PDF_CONFIG.colors.border[1], PDF_CONFIG.colors.border[2]);
    doc.setLineWidth(0.1);
    doc.line(startX, y + rowHeight, startX + columnWidths.reduce((a, b) => a + b, 0), y + rowHeight);

    x = startX;
    for (let i = 0; i < row.length; i++) {
      let cellText = row[i];
      const maxChars = Math.floor(columnWidths[i] / 2.5);
      if (cellText.length > maxChars) {
        cellText = cellText.substring(0, maxChars - 3) + '...';
      }
      doc.text(cellText, x + 2, y + 5);
      x += columnWidths[i];
    }
    y += rowHeight;

    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = PDF_CONFIG.margins.top;
      x = startX;
      doc.setFillColor(PDF_CONFIG.colors.headerBg[0], PDF_CONFIG.colors.headerBg[1], PDF_CONFIG.colors.headerBg[2]);
      doc.roundedRect(x, y, columnWidths.reduce((a, b) => a + b, 0), headerHeight, borderRadius, borderRadius, 'F');
      doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
      doc.setFontSize(PDF_CONFIG.fontSizes.small);
      doc.setTextColor(PDF_CONFIG.colors.headerText[0], PDF_CONFIG.colors.headerText[1], PDF_CONFIG.colors.headerText[2]);
      x = startX;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x + 2, y + 5);
        x += columnWidths[i];
      }
      y += headerHeight;
      doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
      doc.setTextColor(0, 0, 0);
    }
  }

  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  return y + 4;
}

export function drawSimpleTable(
  doc: jsPDF,
  startY: number,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
  margin: number
): number {
  const startX = margin;
  let y = startY;
  const rowHeight = 6;

  doc.setFillColor(PDF_CONFIG.colors.headerBg[0], PDF_CONFIG.colors.headerBg[1], PDF_CONFIG.colors.headerBg[2]);
  doc.setFont(PDF_CONFIG.fonts.bold, 'normal');
  doc.setFontSize(PDF_CONFIG.fontSizes.small);
  doc.setTextColor(PDF_CONFIG.colors.headerText[0], PDF_CONFIG.colors.headerText[1], PDF_CONFIG.colors.headerText[2]);

  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.rect(x, y, columnWidths[i], rowHeight, 'F');
    doc.text(headers[i], x + 2, y + 4);
    x += columnWidths[i];
  }
  y += rowHeight;

  doc.setFont(PDF_CONFIG.fonts.regular, 'normal');
  doc.setFontSize(PDF_CONFIG.fontSizes.verySmall);
  doc.setTextColor(0, 0, 0);

  for (const row of rows) {
    x = startX;
    for (let i = 0; i < row.length; i++) {
      doc.rect(x, y, columnWidths[i], rowHeight);
      doc.text(row[i], x + 2, y + 4);
      x += columnWidths[i];
    }
    y += rowHeight;
  }

  return y + 4;
}