// /home/project/utils/pdf-generators/shared/pdfConfig.ts
// Configurations communes pour tous les PDF

export const PDF_CONFIG = {
  pageFormats: {
    portrait: { width: 210, height: 297 },
    landscape: { width: 297, height: 210 },
  },
  margins: {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15,
  },
  colors: {
    primary: [37, 99, 235],
    secondary: [245, 158, 11],
    success: [16, 185, 129],
    error: [239, 68, 68],
    warning: [245, 158, 11],
    headerBg: [37, 99, 235],
    headerText: [255, 255, 255],
    rowEven: [249, 250, 251],
    rowOdd: [255, 255, 255],
    border: [229, 231, 235],
  },
  fonts: {
    regular: 'helvetica',
    bold: 'helvetica',
    italic: 'helvetica',
  },
  fontSizes: {
    title: 18,
    subtitle: 14,
    section: 12,
    body: 10,
    small: 8,
    verySmall: 7,
  },
  lineHeights: {
    title: 10,
    section: 8,
    body: 6,
    table: 7,
  },
};