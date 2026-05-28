/**
 * pdfGenerator.ts — Self-contained PDF generator for Enercity diagnostic reports.
 *
 * Uses pdf-lib (v1.17.1) via dynamic import. All text in Spanish.
 * A4 page, Helvetica/HelveticaBold, color-coded sections matching email branding.
 */

import type {
  PDFDocument as PDFDocumentType,
  PDFPage,
  PDFFont,
  RGB,
} from 'pdf-lib';

import { readFileSync } from 'fs';

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
// Color palette matching Email CSS exactly
// ---------------------------------------------------------------------------

const COLOR_DARK_BLUE: RGB = { red: 0.082, green: 0.274, blue: 0.376, type: 'RGB' } as RGB; // #154660
const COLOR_ACCENT_ORANGE: RGB = { red: 0.941, green: 0.494, blue: 0.016, type: 'RGB' } as RGB; // #F07E04
const COLOR_GREEN: RGB = { red: 0.29, green: 0.686, blue: 0.301, type: 'RGB' } as RGB; // #4AAF4D
const COLOR_TEXT_DARK: RGB = { red: 0.29, green: 0.333, blue: 0.408, type: 'RGB' } as RGB; // #4a5568
const COLOR_BG_CARD: RGB = { red: 0.972, green: 0.98, blue: 0.988, type: 'RGB' } as RGB; // #f8fafc
const COLOR_LIGHT_GRAY: RGB = { red: 0.886, green: 0.91, blue: 0.941, type: 'RGB' } as RGB; // #e2e8f0
const COLOR_WHITE: RGB = { red: 1, green: 1, blue: 1, type: 'RGB' } as RGB;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatCLP(n: number): string {
  return (
    '$' +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  );
}

function formatDate(iso: string): string {
  const MONTHS: readonly string[] = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const d: Date = new Date(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()] ?? 'enero'} de ${d.getFullYear()}`;
}

function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

function formatNumber(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function sanitizeText(text: string): string {
  return text
    .replace(/₀/g, '0').replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3')
    .replace(/₄/g, '4').replace(/₅/g, '5').replace(/₆/g, '6').replace(/₇/g, '7')
    .replace(/₈/g, '8').replace(/₉/g, '9')
    .replace(/–/g, '-').replace(/—/g, '--');
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  ALTA_RETORNO: 'Alta Retorno',
  MEDIO_RETORNO: 'Medio Retorno',
  BAJA_RETORNO: 'Baja Retorno',
};

function getClassificationLabel(raw: string): string {
  return CLASSIFICATION_LABELS[raw] ?? raw;
}

// ---------------------------------------------------------------------------
// Advanced UI helpers for PDF (Cards & Headers)
// ---------------------------------------------------------------------------

/**
 * Draws a section header styled like the subheadings of the email
 */
function drawSectionHeader(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
): number {
  page.drawText(sanitizeText(text.toUpperCase()), {
    x: MARGIN_LEFT,
    y: y - 5,
    size: 11,
    font,
    color: COLOR_DARK_BLUE,
  });
  
  return y - 25;
}

/**
 * Draws a full container block (Card) with a colored top header band
 */
function drawCardBackground(
  page: PDFPage,
  yTop: number,
  height: number,
  headerColor: RGB = COLOR_DARK_BLUE
): void {
  // Cuerpo de la tarjeta
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: yTop - height,
    width: CONTENT_WIDTH,
    height: height,
    color: COLOR_BG_CARD,
    borderColor: COLOR_LIGHT_GRAY,
    borderWidth: 1,
  });

  // Banda superior de la tarjeta (Estilo Email)
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: yTop - 20,
    width: CONTENT_WIDTH,
    height: 20,
    color: headerColor,
  });
}

function drawCardHeaderLabel(
  page: PDFPage,
  font: PDFFont,
  text: string,
  yTop: number
): void {
  page.drawText(sanitizeText(text.toUpperCase()), {
    x: MARGIN_LEFT + 15,
    y: yTop - 14,
    size: 9,
    font,
    color: COLOR_WHITE,
  });
}

/**
 * Draws row items inside the cards with clean alignments
 */
function drawCardRow(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  label: string,
  value: string,
  y: number,
  options: { isBoldValue?: boolean; valueColor?: RGB } = {}
): number {
  const vColor = options.valueColor || COLOR_DARK_BLUE;
  
  // Etiqueta (Izquierda)
  page.drawText(sanitizeText(label), {
    x: MARGIN_LEFT + 15,
    y,
    size: 10,
    font: fontRegular,
    color: COLOR_TEXT_DARK,
  });

  // Valor (Derecha)
  const safeValue = sanitizeText(value);
  const vFont = options.isBoldValue ? fontBold : fontRegular;
  const valueWidth = vFont.widthOfTextAtSize(safeValue, 10);

  page.drawText(safeValue, {
    x: PAGE_WIDTH - MARGIN_RIGHT - 15 - valueWidth,
    y,
    size: 10,
    font: vFont,
    color: vColor,
  });

  // Línea divisoria interna gris muy tenue
  page.drawLine({
    start: { x: MARGIN_LEFT + 15, y: y - 6 },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT - 15, y: y - 6 },
    thickness: 0.5,
    color: COLOR_LIGHT_GRAY,
  });

  return y - 20;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

export async function generatePDF(data: PDFData): Promise<Uint8Array> {
  // 1. Haces el import dinámico de las clases de pdf-lib
  const { PDFDocument, StandardFonts } = await import('pdf-lib');

  // 2. CREAS la instancia del documento (¡De aquí sale pdfDoc!)
  const pdfDoc: PDFDocumentType = await PDFDocument.create();

  // 3. Ahora sí, usas pdfDoc para embeber todas las fuentes que necesitas
  const fontRegular: PDFFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold: PDFFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontZapf: PDFFont = await pdfDoc.embedFont(StandardFonts.ZapfDingbats); // <- La que agregamos para el check

  // 4. Creas la página usando el documento
  const page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);




  // ========================================================================
  // 1. EMAIL HEADER BLOCK (Fondo Azul Sólido Completo)
  // ========================================================================
  const headerBlockHeight = 85;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerBlockHeight,
    width: PAGE_WIDTH,
    height: headerBlockHeight,
    color: COLOR_DARK_BLUE,
  });

  // Intentar cargar e incrustar el logo
  try {
    const logoPath = new URL('../../public/Enercity_logo_fff.png', import.meta.url).pathname;
    const logoPngBytes: Buffer = readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoPngBytes);
    const logoDims = logoImage.scale(0.45);
    page.drawImage(logoImage, {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 55,
      width: logoDims.width,
      height: logoDims.height,
    });
  } catch (e) {
    // Fallback si no encuentra la imagen en ambiente local: Texto estilizado como el email
    page.drawText('☀️ Enercity', {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 45,
      size: 24,
      font: fontBold,
      color: COLOR_WHITE,
    });
  }

  // Texto secundario del Header (Derecha)
  const subHeaderTxt = 'Tu Presupuesto Personalizado';
  const subHeaderWidth = fontRegular.widthOfTextAtSize(subHeaderTxt, 11);
  page.drawText(subHeaderTxt, {
    x: PAGE_WIDTH - MARGIN_RIGHT - subHeaderWidth,
    y: PAGE_HEIGHT - 42,
    size: 11,
    font: fontRegular,
    color: COLOR_WHITE,
  });

  // Fecha en blanco pequeño abajo a la derecha
  const dateStr = formatDate(data.quoteDate);
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 8);
  page.drawText(dateStr, {
    x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
    y: PAGE_HEIGHT - 65,
    size: 8,
    font: fontRegular,
    color: COLOR_WHITE,
  });

  let y: number = PAGE_HEIGHT - headerBlockHeight - 30;

  // ========================================================================
  // 2. SALUDO CORDIAL (Estilo Email)
  // ========================================================================
  page.drawText(`¡Hola, ${data.customerName}!`, {
    x: MARGIN_LEFT,
    y,
    size: 18,
    font: fontBold,
    color: COLOR_DARK_BLUE,
  });
  y -= 18;

  
const introLine1 = `Gracias por usar nuestro simulador. Hemos preparado tu presupuesto solar basado:`;
const introLine2 = `en tu consumo de ${formatCLP(data.monthlyBill)}/mes en la comuna de ${data.comunaName}.`;

  page.drawText(sanitizeText(introLine1), {
  x: MARGIN_LEFT,
  y: y,
  size: 10,
  font: fontRegular,
  color: COLOR_TEXT_DARK,
});

// 3. Bajamos el cursor para la segunda línea
y -= 15; 

// 4. Dibujamos la segunda línea
page.drawText(sanitizeText(introLine2), {
  x: MARGIN_LEFT,
  y: y,
  size: 10,
  font: fontRegular,
  color: COLOR_TEXT_DARK,
});

// 5. Dejamos el espacio libre necesario para la tarjeta que viene abajo
y -= 35;

  // ========================================================================
  // 3. CARD: RESUMEN DEL SISTEMA (Banda Naranja como el Email)
  // ========================================================================
  const specsCardHeight = 145;
  drawCardBackground(page, y, specsCardHeight, COLOR_ACCENT_ORANGE);
  drawCardHeaderLabel(page, fontBold, 'Resumen del Sistema Recomendado', y);
  
  let cardY = y - 36;
  cardY = drawCardRow(page, fontBold, fontRegular, 'Kit Solicitado', data.kitName, cardY);
  cardY = drawCardRow(page, fontBold, fontRegular, 'Potencia Total', data.kitPower, cardY);
  cardY = drawCardRow(page, fontBold, fontRegular, 'Paneles Solares', `${data.panelCount} unidades de ${data.panelWattage}W`, cardY);
  cardY = drawCardRow(page, fontBold, fontRegular, 'Techumbre / Medidor', `${data.roofType} / ${data.meterLocation}`, cardY);

  y -= (specsCardHeight + 25);

  /// ========================================================================
  // 4. CARD: DETALLE ECONÓMICO E INVERSIÓN (Sin fondo amarillo)
  // ========================================================================
  const priceCardHeight = 90;
  drawCardBackground(page, y, priceCardHeight, COLOR_DARK_BLUE);
  drawCardHeaderLabel(page, fontBold, 'Detalle de Valores', y);

  cardY = y - 36;
  cardY = drawCardRow(page, fontBold, fontRegular, 'Inversión Neto', formatCLP(data.systemPriceNoIva), cardY);
  
  // Renderizado limpio: solo el texto destaca en color naranja, sin el fondo amarillo
  drawCardRow(page, fontBold, fontRegular, 'Inversión Total (IVA inc.)', formatCLP(data.systemPrice), cardY, {
    isBoldValue: true,
    valueColor: COLOR_ACCENT_ORANGE
  });

  y -= (priceCardHeight + 25);
  // ========================================================================
  // 5. SECCIÓN: RETORNO DE INVERSIÓN (Indicadores en verde)
  // ========================================================================
  y = drawSectionHeader(page, fontBold, 'Retorno de Inversión y Ahorro', y);
  
  const roiCardHeight = 125;
  drawCardBackground(page, y, roiCardHeight, COLOR_DARK_BLUE);
  drawCardHeaderLabel(page, fontBold, 'Proyecciones Estimadas', y);

  cardY = y - 36;
  cardY = drawCardRow(page, fontBold, fontRegular, 'Ahorro Mensual Estimado', formatCLP(data.monthlySavings), cardY, { valueColor: COLOR_GREEN, isBoldValue: true });
  cardY = drawCardRow(page, fontBold, fontRegular, 'Ahorro Anual Estimado', formatCLP(data.annualSavings), cardY, { valueColor: COLOR_GREEN });
  cardY = drawCardRow(page, fontBold, fontRegular, 'Período de Retorno (Payback)', `${data.paybackYears} años`, cardY);
  cardY = drawCardRow(page, fontBold, fontRegular, 'Cobertura Energética / Reducción CO2', `${formatPercent(data.coveragePercent)} / ${formatNumber(data.co2Reduction)} kg/año`, cardY);

  y -= (roiCardHeight + 30);

  // ========================================================================
  // 6. QUÉ INCLUYE TU PRESUPUESTO (Estilo Checklist del Email)
  // ========================================================================
  y = drawSectionHeader(page, fontBold, '¿Qué incluye tu presupuesto?', y);

const itemsInclude = [
  'Paneles solares de alta eficiencia con garantía estructural',
  'Inversor certificado por la SEC',
  'Kit de fijación estructural y cableado completo',
  'Trámites de la Ley de Generación Ciudadana (Net Billing)',
  'Conexión, pruebas y puesta en marcha del sistema'
];

for (const item of itemsInclude) {
  // Dibujamos el Checkmark usando ZapfDingbats. 
  // El caracter '4' en esta fuente rinde un "✓" perfecto.
  page.drawText('\u2713', { 
    x: MARGIN_LEFT, 
    y: y, 
    size: 10, 
    font: fontZapf, 
    color: COLOR_GREEN 
  });
  
  // El texto descriptivo se mantiene en Helvetica Regular
  page.drawText(sanitizeText(item), {
    x: MARGIN_LEFT + 18,
    y: y,
    size: 9,
    font: fontRegular,
    color: COLOR_TEXT_DARK,
  });
  
  y -= 15;
}

  // ========================================================================
  // 7. FOOTER & NOTA LEGAL (Estilo caja gris de fondo del Email)
  // ========================================================================
  const footerY = 85;
  
  // Caja contenedora del footer
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: footerY,
    color: COLOR_BG_CARD,
    borderColor: COLOR_LIGHT_GRAY,
    borderWidth: 1
  });

  const disclaimerText = 'Este presupuesto tiene validez por 30 días desde la fecha de emisión. Valores estimados sujetos a confirmación técnica en terreno.';
  const discWidth = fontRegular.widthOfTextAtSize(disclaimerText, 8);
  page.drawText(sanitizeText(disclaimerText), {
    x: (PAGE_WIDTH - discWidth) / 2,
    y: footerY - 25,
    size: 8,
    font: fontRegular,
    color: { red: 0.62, green: 0.68, blue: 0.75, type: 'RGB' } as RGB, // #a0aec0
  });

  const companyInfo = 'Enercity  ·  paneles-solares.cl  ·  contacto@enercity.cl';
  const infoWidth = fontBold.widthOfTextAtSize(companyInfo, 9);
  page.drawText(sanitizeText(companyInfo), {
    x: (PAGE_WIDTH - infoWidth) / 2,
    y: footerY - 45,
    size: 9,
    font: fontBold,
    color: COLOR_DARK_BLUE,
  });

  // ========================================================================
  // Serialize
  // ========================================================================
  return await pdfDoc.save();
}

/**
 * Generates a PDF and triggers a browser download.
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
    link.download = `Presupuesto-Solar-Enercity-${data.customerName.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
  }
}