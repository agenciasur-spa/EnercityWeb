/**
 * pdfGenerator.ts — Self-contained PDF generator for Enercity diagnostic reports.
 *
 * Uses pdf-lib (v1.17.1) via dynamic import. All text in Spanish.
 * A4 page, Helvetica/HelveticaBold, color-coded sections.
 *
 * Type-only imports from pdf-lib are erased at compile time.
 * Runtime loading happens via dynamic import inside generatePDF().
 *
 * Exports:
 *   - PDFData interface
 *   - generatePDF(data: PDFData): Promise<Uint8Array>
 *   - downloadPDF(data: PDFData): Promise<void>
 */

import type {
  PDFDocument as PDFDocumentType,
  PDFPage,
  PDFFont,
  RGB,
} from 'pdf-lib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PDFData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  kitName: string;
  kitPower: string;
  panelCount: number;
  panelWattage: number;
  roofType: string;
  meterLocation: string;
  comunaName: string;
  regionName?: string;
  monthlyBill: number;
  annualSavings: number;
  monthlySavings: number;
  systemPrice: number;
  systemPriceNoIva: number;
  paybackYears: number;
  coveragePercent: number;
  co2Reduction: number;
  investmentClassification: string;
  roi25Years: number;
  quoteDate: string;
  validUntil?: string;
}

// ---------------------------------------------------------------------------
// Color palette (as RGB tuples matching pdf-lib's rgb() return type)
// ---------------------------------------------------------------------------

const COLOR_DARK_BLUE: RGB = { red: 0.1, green: 0.2, blue: 0.5, type: 'RGB' } as RGB;
const COLOR_DARK_GRAY: RGB = { red: 0.2, green: 0.2, blue: 0.2, type: 'RGB' } as RGB;
const COLOR_GREEN: RGB = { red: 0.1, green: 0.6, blue: 0.3, type: 'RGB' } as RGB;
const COLOR_LIGHT_GRAY: RGB = { red: 0.75, green: 0.75, blue: 0.75, type: 'RGB' } as RGB;
const COLOR_MEDIUM_GRAY: RGB = { red: 0.45, green: 0.45, blue: 0.45, type: 'RGB' } as RGB;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Formats a number as Chilean Pesos: $1.234.567
 */
function formatCLP(n: number): string {
  return (
    '$' +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  );
}

/**
 * Formats an ISO date string to Spanish long date: "15 de enero de 2026"
 */
function formatDate(iso: string): string {
  const MONTHS: readonly string[] = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  const d: Date = new Date(iso);
  const day: number = d.getDate();
  const month: string = MONTHS[d.getMonth()] ?? 'enero';
  const year: number = d.getFullYear();

  return `${day} de ${month} de ${year}`;
}

/**
 * Formats a number as percentage: "85%"
 */
function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

/**
 * Formats a number with thousands separator: "1.234"
 */
function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ---------------------------------------------------------------------------
// Unicode sanitization for WinAnsi encoding (pdf-lib StandardFonts)
// ---------------------------------------------------------------------------

/**
 * Replaces characters NOT supported by WinAnsi encoding with ASCII equivalents.
 *
 * pdf-lib's StandardFonts (Helvetica, etc.) only support WinAnsi (CP1252).
 * Unicode subscripts, superscripts, and other special chars cause encoding errors.
 *
 * Spanish accented chars (á, é, í, ó, ú, ñ, ü, ¿, ¡) ARE in WinAnsi — kept as-is.
 * Degree sign (°), superscript 2 (²), superscript 3 (³) are also in WinAnsi — kept as-is.
 */
function sanitizeText(text: string): string {
  return text
    // Unicode subscripts → plain digits
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₄/g, '4')
    .replace(/₅/g, '5')
    .replace(/₆/g, '6')
    .replace(/₇/g, '7')
    .replace(/₈/g, '8')
    .replace(/₉/g, '9')
    // Common Unicode symbols NOT in WinAnsi
    .replace(/–/g, '-')   // en dash
    .replace(/—/g, '--')  // em dash
    .replace(/"/g, '"')   // smart quotes
    .replace(/"/g, '"')
    .replace(/'/g, "'")   // smart apostrophes
    .replace(/'/g, "'");
}

// ---------------------------------------------------------------------------
// Classification labels
// ---------------------------------------------------------------------------

const CLASSIFICATION_LABELS: Record<string, string> = {
  ALTA_RETORNO: 'Alta Retorno',
  MEDIO_RETORNO: 'Medio Retorno',
  BAJA_RETORNO: 'Baja Retorno',
};

function getClassificationLabel(raw: string): string {
  return CLASSIFICATION_LABELS[raw] ?? raw;
}

// ---------------------------------------------------------------------------
// PDF drawing helpers
// ---------------------------------------------------------------------------

/**
 * Draws a horizontal line from (MARGIN_LEFT, y) to (PAGE_WIDTH - MARGIN_RIGHT, y).
 */
function drawHorizontalLine(
  page: PDFPage,
  y: number,
  color: RGB = COLOR_LIGHT_GRAY,
  thickness: number = 0.5,
): void {
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness,
    color,
  });
}

/**
 * Draws a section header (bold, dark blue, ~14pt).
 * Returns the Y position after the header.
 */
function drawSectionHeader(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
): number {
  page.drawText(sanitizeText(text), {
    x: MARGIN_LEFT,
    y,
    size: 14,
    font,
    color: COLOR_DARK_BLUE,
  });
  return y - 20;
}

/**
 * Draws a label/value pair. Label in bold, value in regular.
 * Returns the Y position after the line.
 */
function drawLabelValue(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  label: string,
  value: string,
  y: number,
  options: { valueColor?: RGB; indent?: number } = {},
): number {
  const indent: number = options.indent ?? 0;
  const valueColor: RGB = options.valueColor ?? COLOR_DARK_GRAY;
  const safeLabel: string = sanitizeText(label);
  const safeValue: string = sanitizeText(value);
  const labelWidth: number = fontBold.widthOfTextAtSize(safeLabel, 10);
  const xLabel: number = MARGIN_LEFT + indent;

  page.drawText(safeLabel, {
    x: xLabel,
    y,
    size: 10,
    font: fontBold,
    color: COLOR_DARK_GRAY,
  });

  page.drawText(safeValue, {
    x: xLabel + labelWidth + 6,
    y,
    size: 10,
    font: fontRegular,
    color: valueColor,
  });

  return y - 16;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

/**
 * Generates a PDF document for an Enercity diagnostic report.
 *
 * @param data — The diagnostic data to render.
 * @returns A Uint8Array containing the raw PDF bytes.
 */
export async function generatePDF(data: PDFData): Promise<Uint8Array> {
  // Dynamic import — keeps this module SSR-safe and avoids bundling pdf-lib
  // unnecessarily for pages that don't generate PDFs.
  const { PDFDocument, StandardFonts } = await import('pdf-lib');

  const pdfDoc: PDFDocumentType = await PDFDocument.create();
  const fontRegular: PDFFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold: PDFFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // ========================================================================
  // 1. HEADER (y ~800)
  // ========================================================================
  let y: number = PAGE_HEIGHT - 50;

  page.drawText(sanitizeText('ENERCITY'), {
    x: MARGIN_LEFT,
    y,
    size: 24,
    font: fontBold,
    color: COLOR_DARK_BLUE,
  });

  y -= 28;

  page.drawText(sanitizeText('Diagnóstico Solar Personalizado'), {
    x: MARGIN_LEFT,
    y,
    size: 14,
    font: fontRegular,
    color: COLOR_MEDIUM_GRAY,
  });

  // Date on the right side
  const dateStr: string = sanitizeText(formatDate(data.quoteDate));
  const dateWidth: number = fontRegular.widthOfTextAtSize(dateStr, 10);
  page.drawText(dateStr, {
    x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
    y: PAGE_HEIGHT - 50,
    size: 10,
    font: fontRegular,
    color: COLOR_MEDIUM_GRAY,
  });

  y -= 16;

  // Header separator
  drawHorizontalLine(page, y, COLOR_DARK_BLUE, 1.5);
  y -= 24;

  // ========================================================================
  // 2. CUSTOMER INFO (y ~720)
  // ========================================================================
  y = drawSectionHeader(page, fontBold, 'Datos del Cliente', y);

  y = drawLabelValue(page, fontBold, fontRegular, 'Nombre: ', data.customerName, y);
  y = drawLabelValue(page, fontBold, fontRegular, 'Email: ', data.customerEmail, y);
  y = drawLabelValue(page, fontBold, fontRegular, 'Teléfono: ', data.customerPhone, y);
  if (data.customerAddress) {
    y = drawLabelValue(page, fontBold, fontRegular, 'Dirección: ', data.customerAddress, y);
  }

  y -= 8;
  drawHorizontalLine(page, y);
  y -= 16;

  // ========================================================================
  // 3. SYSTEM SPECS (y ~620)
  // ========================================================================
  y = drawSectionHeader(page, fontBold, 'Especificaciones del Sistema', y);

  y = drawLabelValue(page, fontBold, fontRegular, 'Kit: ', data.kitName, y);
  y = drawLabelValue(page, fontBold, fontRegular, 'Potencia: ', data.kitPower, y);
  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Paneles: ',
    `${data.panelCount} paneles de ${data.panelWattage}W`,
    y,
  );
  y = drawLabelValue(page, fontBold, fontRegular, 'Tipo de techo: ', data.roofType, y);
  y = drawLabelValue(page, fontBold, fontRegular, 'Ubicación medidor: ', data.meterLocation, y);
  const locationStr: string = data.regionName
    ? `${data.comunaName}, ${data.regionName}`
    : data.comunaName;
  y = drawLabelValue(page, fontBold, fontRegular, 'Comuna: ', locationStr, y);

  y -= 8;
  drawHorizontalLine(page, y);
  y -= 16;

  // ========================================================================
  // 4. PRICE BREAKDOWN (y ~500)
  // ========================================================================
  y = drawSectionHeader(page, fontBold, 'Detalle de Precio', y);

  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Boleta mensual actual: ',
    formatCLP(data.monthlyBill),
    y,
  );
  y -= 4;

  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Precio total (con IVA): ',
    formatCLP(data.systemPrice),
    y,
    { valueColor: COLOR_DARK_BLUE },
  );
  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Precio sin IVA: ',
    formatCLP(data.systemPriceNoIva),
    y,
  );

  y -= 8;
  drawHorizontalLine(page, y);
  y -= 16;

  // ========================================================================
  // 5. ROI SUMMARY (y ~400)
  // ========================================================================
  y = drawSectionHeader(page, fontBold, 'Retorno de Inversión', y);

  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Ahorro mensual: ',
    formatCLP(data.monthlySavings),
    y,
    { valueColor: COLOR_GREEN },
  );
  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Ahorro anual: ',
    formatCLP(data.annualSavings),
    y,
    { valueColor: COLOR_GREEN },
  );
  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Período de retorno: ',
    `${data.paybackYears} años`,
    y,
  );
  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Cobertura energética: ',
    formatPercent(data.coveragePercent),
    y,
  );
  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Reducción CO2: ',
    `${formatNumber(data.co2Reduction)} kg/año`,
    y,
    { valueColor: COLOR_GREEN },
  );
  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Ahorro estimado a 25 años: ',
    formatCLP(data.roi25Years),
    y,
    { valueColor: COLOR_GREEN },
  );
  y = drawLabelValue(
    page,
    fontBold,
    fontRegular,
    'Clasificación: ',
    getClassificationLabel(data.investmentClassification),
    y,
  );

  y -= 8;
  drawHorizontalLine(page, y);
  y -= 16;

  // ========================================================================
  // 6. DISCLAIMER (y ~250)
  // ========================================================================
  y = drawSectionHeader(page, fontBold, 'Nota Legal', y);

  const disclaimerLines: string[] = [
    'Esta cotización tiene carácter informativo y es válida por 30 días desde la fecha de emisión.',
    'Los valores presentados son estimaciones basadas en los datos proporcionados y pueden variar',
    'al momento de la instalación. Los cálculos de ahorro consideran condiciones promedio de',
    'radiación solar y tarifas eléctricas vigentes. Enercity se reserva el derecho de',
    'modificar precios y condiciones sin previo aviso.',
  ];

  const disclaimerFontSize: number = 8;
  for (const line of disclaimerLines) {
    page.drawText(sanitizeText(line), {
      x: MARGIN_LEFT,
      y,
      size: disclaimerFontSize,
      font: fontRegular,
      color: COLOR_MEDIUM_GRAY,
    });
    y -= 12;
  }

  // ========================================================================
  // 7. FOOTER (y ~100)
  // ========================================================================
  y = 80;
  drawHorizontalLine(page, y, COLOR_LIGHT_GRAY, 0.5);
  y -= 16;

  const footerText: string =
    'Enercity  |  contacto@enercitysolar.cl  |  www.enercitysolar.cl';
  page.drawText(sanitizeText(footerText), {
    x: MARGIN_LEFT,
    y,
    size: 9,
    font: fontRegular,
    color: COLOR_MEDIUM_GRAY,
  });

  // ========================================================================
  // Serialize
  // ========================================================================
  const pdfBytes: Uint8Array = await pdfDoc.save();
  return pdfBytes;
}

// ---------------------------------------------------------------------------
// Browser download helper
// ---------------------------------------------------------------------------

/**
 * Generates a PDF and triggers a browser download. Silent error handling —
 * never throws, so the lead flow is never disrupted.
 */
export async function downloadPDF(data: PDFData): Promise<void> {
  try {
    const pdfBytes: Uint8Array = await generatePDF(data);
    const blob: Blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
      type: 'application/pdf',
    });
    const url: string = URL.createObjectURL(blob);
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = url;
    link.download = `Diagnostico-Solar-Enercity-${data.customerName.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
    // Silent fallback — do NOT throw, lead flow must not break
  }
}
