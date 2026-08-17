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
import { PDFName } from 'pdf-lib';

import type { PDFData, EquipmentCard } from './pdf-types.js';

// Re-export PDFData for convenience
export type { PDFData } from './pdf-types.js';

// Import logo as raw buffer — Vite inlines this at build time
import { getLogoBuffer } from './logo-buffer';
import { getWebpayLogoBuffer, getSantanderLogoBuffer, getChecklistIconBuffer } from './payment-logo-buffers';

// ---------------------------------------------------------------------------
// Color palette matching the client's reference (COT_HIBRIDO_14_3_kWh.html)
// ---------------------------------------------------------------------------

const COLOR_DARK_BLUE: RGB = { red: 0.102, green: 0.153, blue: 0.251, type: 'RGB' } as RGB; // #1a2740 (--navy)
const COLOR_ACCENT_ORANGE: RGB = { red: 0.969, green: 0.580, blue: 0.114, type: 'RGB' } as RGB; // #f7941d (--orange)
const COLOR_GREEN: RGB = { red: 0.114, green: 0.722, blue: 0.455, type: 'RGB' } as RGB; // #1db874 (--green)
const COLOR_TEXT_DARK: RGB = { red: 0.420, green: 0.447, blue: 0.502, type: 'RGB' } as RGB; // #6b7280 (--text-gray)
const COLOR_BG_CARD: RGB = { red: 0.957, green: 0.961, blue: 0.969, type: 'RGB' } as RGB; // #f4f5f7 (--gray-bg)
const COLOR_LIGHT_GRAY: RGB = { red: 0.902, green: 0.910, blue: 0.922, type: 'RGB' } as RGB; // #e6e8eb (--card-border)
const COLOR_WHITE: RGB = { red: 1, green: 1, blue: 1, type: 'RGB' } as RGB;
const COLOR_PILL_BG: RGB = { red: 0.933, green: 0.945, blue: 0.961, type: 'RGB' } as RGB; // #eef1f5 (.warranty bg)
const COLOR_BRAND_GOODWE: RGB = { red: 0.757, green: 0.071, blue: 0.122, type: 'RGB' } as RGB; // #c1121f
const COLOR_BRAND_TRINA: RGB = { red: 0, green: 0.447, blue: 0.737, type: 'RGB' } as RGB; // #0072bc

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

/**
 * Word-wraps text to fit a max width, splitting on spaces.
 */
function wrapText(page: PDFPage, font: PDFFont, text: string, maxWidth: number): string[] {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(sanitizeText(candidate), 9) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
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
  // Small orange accent bar before the title, matching the reference design
  page.drawRectangle({
    x: MARGIN_LEFT, y: y - 9, width: 3, height: 11, color: COLOR_ACCENT_ORANGE,
  });
  page.drawText(sanitizeText(text.toUpperCase()), {
    x: MARGIN_LEFT + 9,
    y: y - 5,
    size: 11,
    font,
    color: COLOR_DARK_BLUE,
  });

  return y - 25;
}

/**
 * Draws a full container block (Card) with a colored top header band.
 * x/width let callers position multiple cards side by side instead of always
 * spanning the full content width (they used to be hardcoded here, which made
 * grids of cards draw on top of each other).
 */
function drawCardBackground(
  page: PDFPage,
  x: number,
  yTop: number,
  width: number,
  height: number,
  headerColor: RGB = COLOR_DARK_BLUE
): void {
  // Cuerpo de la tarjeta
  page.drawRectangle({
    x,
    y: yTop - height,
    width,
    height: height,
    color: COLOR_BG_CARD,
    borderColor: COLOR_LIGHT_GRAY,
    borderWidth: 1,
  });

  // Banda superior de la tarjeta (Estilo Email)
  page.drawRectangle({
    x,
    y: yTop - 20,
    width,
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
// URL/Image fetching helpers
// ---------------------------------------------------------------------------

interface FetchImageResult {
  bytes: Uint8Array;
  contentType: string;
}

async function fetchImageWithSafety(url: string): Promise<FetchImageResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'image/png, image/jpeg, image/*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || (!contentType.includes('image/png') && !contentType.includes('image/jpeg'))) {
      return null;
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) { // 5MB limit
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
      return null;
    }

    return { bytes: new Uint8Array(buffer), contentType };
  } catch {
    return null;
  }
}

async function embedRemoteImage(
  pdfDoc: PDFDocumentType,
  url: string
): Promise<{ image: any; width: number; height: number } | null> {
  const result = await fetchImageWithSafety(url);
  if (!result) {
    return null;
  }

  try {
    let image;
    if (result.contentType.includes('image/png')) {
      image = await pdfDoc.embedPng(result.bytes);
    } else if (result.contentType.includes('image/jpeg')) {
      image = await pdfDoc.embedJpg(result.bytes);
    } else {
      return null;
    }

    return {
      image,
      width: image.width,
      height: image.height,
    };
  } catch {
    return null;
  }
}

/**
 * Draws a clickable link annotation on the page
 */
function drawClickableLink(
  page: PDFPage,
  url: string,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  try {
    const linkAnnotation = page.doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y - height, x + width, y],
      Border: [0, 0, 0],
      C: [0.94, 0.49, 0.02], // Accent orange color
      A: {
        Type: 'Action',
        S: 'URI',
        URI: url,
      },
    });

    const annotations = page.node.get(PDFName.of('Annots'));
    if (annotations) {
      const existingAnnots = annotations.asArray();
      page.node.set(
        PDFName.of('Annots'),
        page.doc.context.obj([...existingAnnots, linkAnnotation])
      );
    } else {
      page.node.set(
        PDFName.of('Annots'),
        page.doc.context.obj([linkAnnotation])
      );
    }
  } catch {
    // Silently fail if annotation creation fails
  }
}

// ---------------------------------------------------------------------------
// Equipment Card Drawing for On-Grid PDF
// ---------------------------------------------------------------------------

const PILL_HEIGHT = 14;

/**
 * Draws a small rounded-look badge (e.g. "Garantía: 10 años").
 */
function drawPill(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  yTop: number,
  textColor: RGB
): void {
  const safeText = sanitizeText(text);
  const pillWidth = font.widthOfTextAtSize(safeText, 7.5) + 16;
  page.drawRectangle({
    x, y: yTop - PILL_HEIGHT, width: pillWidth, height: PILL_HEIGHT,
    color: COLOR_PILL_BG,
  });
  page.drawText(safeText, {
    x: x + 8, y: yTop - PILL_HEIGHT + 4.5, size: 7.5, font, color: textColor,
  });
}

/**
 * Brand wordmark color — matches the client's reference, which colors known
 * equipment brands (GoodWe red, Trina blue) and falls back to navy otherwise.
 */
function brandColor(marca: string): RGB {
  const m = marca.toLowerCase();
  if (m.includes('goodwe')) return COLOR_BRAND_GOODWE;
  if (m.includes('trina')) return COLOR_BRAND_TRINA;
  return COLOR_DARK_BLUE;
}

/**
 * Draws a light placeholder box where the equipment photo would go, used
 * while the admin hasn't set a real imagenUrl yet (or it failed to load).
 */
function drawImagePlaceholder(
  page: PDFPage,
  x: number,
  yTop: number,
  width: number,
  height: number,
  font: PDFFont
): void {
  page.drawRectangle({
    x, y: yTop - height, width, height,
    color: { red: 0.95, green: 0.95, blue: 0.95, type: 'RGB' } as RGB,
    borderColor: COLOR_LIGHT_GRAY, borderWidth: 1,
  });
  const label = 'IMAGEN';
  const labelWidth = font.widthOfTextAtSize(label, 7);
  page.drawText(label, {
    x: x + (width - labelWidth) / 2, y: yTop - height / 2 - 3, size: 7, font, color: COLOR_TEXT_DARK,
  });
}

/**
 * Draws an equipment card matching the client's reference layout: eyebrow +
 * title + description + warranty pill inside the card body, a centered
 * product photo, the brand wordmark, and a full-width "Ficha técnica" footer
 * bar at the bottom (clickable when a ficha técnica URL is set).
 */
async function drawEquipmentCard(
  page: PDFPage,
  pdfDoc: PDFDocumentType,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  equipment: EquipmentCard,
  x: number,
  y: number,
  width: number,
  height: number,
  titlePrefix?: string
): Promise<number> {
  const padding = 10;
  const imageHeight = 65;
  const footerH = 15;

  page.drawRectangle({
    x, y: y - height, width, height,
    color: COLOR_WHITE, borderColor: COLOR_LIGHT_GRAY, borderWidth: 1,
  });

  let cy = y - padding - 7;

  // Eyebrow: brand + equipment type
  const eyebrowLabel = equipment.tipo === 'inversor'
    ? 'Inversor'
    : equipment.tipo === 'bateria'
      ? 'Batería'
      : 'Paneles';
  const eyebrow = `${eyebrowLabel} ${equipment.marca}`;
  page.drawText(sanitizeText(eyebrow.toUpperCase()), {
    x: x + padding, y: cy, size: 7.5, font: fontBold, color: COLOR_ACCENT_ORANGE,
  });
  cy -= 11;

  // Title (single line — truncated if it doesn't fit)
  const titleText = titlePrefix ? `${titlePrefix} ${equipment.nombre}` : equipment.nombre;
  const [titleLine] = wrapText(page, fontBold, titleText, width - padding * 2);
  page.drawText(sanitizeText(titleLine ?? titleText), {
    x: x + padding, y: cy, size: 10.5, font: fontBold, color: COLOR_DARK_BLUE,
  });
  cy -= 12;

  // Description (admin-editable, single line — truncated if longer)
  if (equipment.descripcion) {
    const [firstLine] = wrapText(page, fontRegular, equipment.descripcion, width - padding * 2);
    if (firstLine) {
      page.drawText(sanitizeText(firstLine), {
        x: x + padding, y: cy, size: 7.5, font: fontRegular, color: COLOR_TEXT_DARK,
      });
      cy -= 10;
    }
  }
  cy -= 4;

  // Warranty pill
  if (equipment.garantia) {
    drawPill(page, fontBold, `Garantía: ${equipment.garantia}`, x + padding, cy, COLOR_DARK_BLUE);
    cy -= PILL_HEIGHT + 6;
  } else {
    cy -= 2;
  }

  // Product photo, centered in the card width
  if (equipment.imagenUrl) {
    const embeddedImage = await embedRemoteImage(pdfDoc, equipment.imagenUrl).catch(() => null);
    if (embeddedImage) {
      const availableWidth = width - padding * 2;
      const scale = Math.min(availableWidth / embeddedImage.width, imageHeight / embeddedImage.height);
      const scaledWidth = embeddedImage.width * scale;
      const scaledHeight = embeddedImage.height * scale;
      page.drawImage(embeddedImage.image, {
        x: x + (width - scaledWidth) / 2,
        y: cy - imageHeight + (imageHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });
    } else {
      drawImagePlaceholder(page, x + padding, cy, width - padding * 2, imageHeight, fontRegular);
    }
  } else {
    drawImagePlaceholder(page, x + padding, cy, width - padding * 2, imageHeight, fontRegular);
  }
  cy -= imageHeight + 6;

  // Footer bar: "Ficha técnica" (clickable when a URL is set)
  page.drawLine({
    start: { x, y: y - height + footerH }, end: { x: x + width, y: y - height + footerH },
    thickness: 1, color: COLOR_LIGHT_GRAY,
  });
  page.drawRectangle({
    x, y: y - height, width, height: footerH, color: COLOR_BG_CARD,
  });
  const footerText = 'Ficha técnica';
  const footerTextWidth = fontBold.widthOfTextAtSize(sanitizeText(footerText), 8);
  page.drawText(sanitizeText(footerText), {
    x: x + (width - footerTextWidth) / 2, y: y - height + 5, size: 8, font: fontBold, color: COLOR_DARK_BLUE,
  });
  if (equipment.fichaTecnicaUrl) {
    drawClickableLink(page, equipment.fichaTecnicaUrl, x, y - height + footerH, width, footerH);
  }

  return y - height - 10;
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
  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Reserve room for the footer so content never overlaps it. If a section
  // wouldn't fit in what's left of the page, spill it onto a fresh page
  // instead of drawing past the bottom margin.
  const FOOTER_RESERVE = 70;
  function checkPageBreak(_neededHeight: number): void {
    // No-op: force single-page layout
  }

  // Color shortcuts
  const cBlue = COLOR_DARK_BLUE;
  const cOrange = COLOR_ACCENT_ORANGE;
  const cGreen = COLOR_GREEN;
  const cText = COLOR_TEXT_DARK;
  const cGray = { red: 0.788, green: 0.812, blue: 0.859, type: 'RGB' } as RGB; // #c9cfdb — muted text on navy
  const cWhite = COLOR_WHITE;
  const cBgGray = COLOR_BG_CARD;
  const cDarkGreen = COLOR_GREEN;

  // ========================================================================
  // 1. HEADER — Logo + Cotización Nº + Fecha
  // ========================================================================
  page.drawRectangle({
    x: 0, y: PAGE_HEIGHT - 85, width: PAGE_WIDTH, height: 85,
    color: cBlue,
  });
  page.drawLine({
    start: { x: 0, y: PAGE_HEIGHT - 86 }, end: { x: PAGE_WIDTH, y: PAGE_HEIGHT - 86 },
    thickness: 3, color: cOrange,
  });

  try {
    const logoImage = await pdfDoc.embedPng(new Uint8Array(getLogoBuffer()));
    const logoDims = logoImage.scale(0.40);
    page.drawImage(logoImage, {
      x: MARGIN_LEFT, y: PAGE_HEIGHT - 55,
      width: logoDims.width, height: logoDims.height,
    });
  } catch {
    page.drawText('Enercity', { x: MARGIN_LEFT, y: PAGE_HEIGHT - 45, size: 24, font: fontBold, color: cWhite });
  }

  // Cotización Nº + Fecha (right side)
  const cotNum = data.numeroCotizacion || '2026-0000';
  page.drawText(`Cotización Nº ${cotNum}`, {
    x: PAGE_WIDTH - MARGIN_RIGHT - 180, y: PAGE_HEIGHT - 38, size: 11, font: fontBold, color: cWhite,
  });
  page.drawText(`Fecha: ${formatDate(data.quoteDate)}`, {
    x: PAGE_WIDTH - MARGIN_RIGHT - 180, y: PAGE_HEIGHT - 55, size: 9, font: fontRegular, color: cWhite,
  });

  let y = PAGE_HEIGHT - 85 - 20;

  // ========================================================================
  // 2. CLIENTE — Nombre + Región
  // ========================================================================
  page.drawText(sanitizeText(data.customerName || 'Cliente'), {
    x: MARGIN_LEFT, y, size: 14, font: fontBold, color: cBlue,
  });
  y -= 16;
  const regionText = data.regionName || data.comunaName || 'Región no especificada';
  const clientSubtitleParts = [
    data.nuevaAddress,
    `Región: ${regionText}`,
    data.roofType ? `Tipo de techo: ${data.roofType}` : undefined,
  ].filter((part): part is string => Boolean(part));
  page.drawText(sanitizeText(clientSubtitleParts.join('  ·  ')), {
    x: MARGIN_LEFT, y, size: 9, font: fontRegular, color: cText,
  });
  y -= 12;

  // ========================================================================
  // 3. PROYECTO SOLAR RECOMENDADO
  // ========================================================================
  const recoH = 46;
  const badgeText = `ON GRID - ${data.kitPower || 'XX kWP'}`;
  const badgeW = fontBold.widthOfTextAtSize(sanitizeText(badgeText), 12) + 24;
  page.drawRectangle({
    x: MARGIN_LEFT, y: y - recoH, width: CONTENT_WIDTH, height: recoH, color: cBgGray,
  });
  page.drawText(sanitizeText('PROYECTO SOLAR RECOMENDADO'), {
    x: MARGIN_LEFT + 16, y: y - 18, size: 9, font: fontBold, color: cBlue,
  });
  page.drawText(sanitizeText(`En base a tu boleta actual de ${formatCLP(data.monthlyBill)} / mes`), {
    x: MARGIN_LEFT + 16, y: y - 32, size: 9, font: fontRegular, color: cText,
  });
  page.drawRectangle({
    x: PAGE_WIDTH - MARGIN_RIGHT - 16 - badgeW, y: y - recoH / 2 - 11, width: badgeW, height: 22, color: cOrange,
  });
  page.drawText(sanitizeText(badgeText), {
    x: PAGE_WIDTH - MARGIN_RIGHT - 16 - badgeW + 12, y: y - recoH / 2 - 4, size: 11, font: fontBold, color: cBlue,
  });
  y -= (recoH + 10);

  // ========================================================================
  // 4. EQUIPO Y GARANTÍAS — 2 cards side-by-side with descripcion + garantia
  // ========================================================================
  if (data.equipment && data.equipment.length > 0) {
    const cardCount = Math.min(data.equipment.length, 3);
    const cardGap = 15;
    const cardW = (CONTENT_WIDTH - cardGap * (cardCount - 1)) / cardCount;
    const cardH = 162;
    checkPageBreak(25 + cardH + 15);
    y = drawSectionHeader(page, fontBold, 'Equipo y Garantías', y);
    const rowStartY = y;
    for (let i = 0; i < cardCount; i++) {
      const cx = MARGIN_LEFT + i * (cardW + cardGap);
      const titlePrefix = data.equipment[i].tipo === 'panel' && data.panelCount ? `${data.panelCount} ×` : undefined;
      // All cards share the same starting y — they sit side by side, not stacked.
      await drawEquipmentCard(page, pdfDoc, fontBold, fontRegular, data.equipment[i], cx, rowStartY, cardW, cardH, titlePrefix);
    }
    y = rowStartY - cardH - 10;
  }

  // ========================================================================
  // 5. ¿QUÉ INCLUYE TU PROYECTO SOLAR? — bullet items, wrapped & centered
  // ========================================================================
  const incluyeItems = [
    'Asesoría personalizada',
    'Diseño e instalación',
    'Certificación SEC (TE4)',
    'Monitoreo remoto App',
    'Servicio Post Venta',
  ];
  const itemGapX = 20;
  const bulletR = 2.5;
  const textGap = 8;
  const rowGapY = 18;
  const boxPadX = 16;
  const boxPadY = 12;
  const maxRowWidth = CONTENT_WIDTH - boxPadX * 2;

  const incluyeRows: { text: string; width: number }[][] = [];
  let incluyeRow: { text: string; width: number }[] = [];
  let incluyeRowWidth = 0;
  for (const item of incluyeItems) {
    const tw = fontBold.widthOfTextAtSize(sanitizeText(item), 9);
    const itemWidth = bulletR * 2 + textGap + tw;
    const wouldBeWidth = incluyeRow.length > 0 ? incluyeRowWidth + itemGapX + itemWidth : itemWidth;
    if (wouldBeWidth > maxRowWidth && incluyeRow.length > 0) {
      incluyeRows.push(incluyeRow);
      incluyeRow = [];
      incluyeRowWidth = 0;
    }
    incluyeRow.push({ text: item, width: itemWidth });
    incluyeRowWidth = incluyeRow.length > 1 ? incluyeRowWidth + itemGapX + itemWidth : itemWidth;
  }
  if (incluyeRow.length > 0) incluyeRows.push(incluyeRow);

  const incluyeBoxHeight = incluyeRows.length * rowGapY + boxPadY * 2 - 4;
  checkPageBreak(25 + incluyeBoxHeight + 8);
  y = drawSectionHeader(page, fontBold, '¿Qué incluye tu proyecto solar?', y);

  page.drawRectangle({
    x: MARGIN_LEFT, y: y - incluyeBoxHeight, width: CONTENT_WIDTH, height: incluyeBoxHeight,
    color: cWhite, borderColor: COLOR_LIGHT_GRAY, borderWidth: 1,
  });
  let incluyeRowY = y - boxPadY - 7;
  for (const row of incluyeRows) {
    const rowWidth = row.reduce((sum, it, i) => sum + it.width + (i > 0 ? itemGapX : 0), 0);
    let itemX = MARGIN_LEFT + (CONTENT_WIDTH - rowWidth) / 2;
    for (const it of row) {
      page.drawEllipse({ x: itemX + bulletR, y: incluyeRowY + 3, xScale: bulletR, yScale: bulletR, color: cOrange });
      page.drawText(sanitizeText(it.text), {
        x: itemX + bulletR * 2 + textGap, y: incluyeRowY, size: 9, font: fontBold, color: cBlue,
      });
      itemX += it.width + itemGapX;
    }
    incluyeRowY -= rowGapY;
  }
  y -= (incluyeBoxHeight + 8);

  // ========================================================================
  // 6. CARACTERÍSTICAS Y RENDIMIENTO — 4 stat boxes
  // ========================================================================
  checkPageBreak(105);
  y = drawSectionHeader(page, fontBold, 'Características y Rendimiento', y);

  const statBoxW = (CONTENT_WIDTH - 15 * 3) / 4;
  const statBoxH = 50;
  const stats = [
    { label: 'ENERGÍA GENERADA', value: `${formatNumber(data.co2Reduction * 2 || data.panelCount * data.panelWattage)} kWh`, sub: 'anuales proyectados' },
    { label: 'AHORRO TOTAL', value: formatCLP(data.annualSavings), sub: '/ año en boleta' },
    { label: 'RETORNO INVERSIÓN', value: `${data.paybackYears} Años`, sub: 'recuperación inversión' },
    { label: 'INYECCIÓN NET BILLING', value: 'Ley 20.571', sub: 'excedentes a la red' },
  ];

  for (let si = 0; si < 4; si++) {
    const sx = MARGIN_LEFT + si * (statBoxW + 15);
    const cx = sx + statBoxW / 2;
    page.drawRectangle({
      x: sx, y: y - statBoxH, width: statBoxW, height: statBoxH,
      color: cWhite, borderColor: COLOR_LIGHT_GRAY, borderWidth: 1,
    });

    const labelLines = wrapText(page, fontBold, stats[si].label, statBoxW - 10);
    let ly = y - 14;
    for (const line of labelLines.slice(0, 2)) {
      const safeLine = sanitizeText(line);
      const lw = fontBold.widthOfTextAtSize(safeLine, 6.5);
      page.drawText(safeLine, { x: cx - lw / 2, y: ly, size: 6.5, font: fontBold, color: cText });
      ly -= 8;
    }
    ly -= 5;

    const safeValue = sanitizeText(stats[si].value);
    const vw = fontBold.widthOfTextAtSize(safeValue, 12);
    page.drawText(safeValue, { x: cx - vw / 2, y: ly, size: 12, font: fontBold, color: cBlue });
    ly -= 14;

    const safeSub = sanitizeText(stats[si].sub);
    const sw = fontBold.widthOfTextAtSize(safeSub, 7);
    page.drawText(safeSub, { x: cx - sw / 2, y: ly, size: 7, font: fontBold, color: cGreen });
  }
  y -= (statBoxH + 10);

  // ========================================================================
  // 7. MÉTODOS DE PAGO — dark card + 3 payment options
  // ========================================================================
  checkPageBreak(200);
  y = drawSectionHeader(page, fontBold, 'Métodos de Pago', y);

  const payCardH = 55;
  // Solid dark card — drawCardBackground's light body + thin colored band
  // doesn't give enough contrast for the white price text.
  page.drawRectangle({
    x: MARGIN_LEFT, y: y - payCardH, width: CONTENT_WIDTH, height: payCardH, color: cBlue,
  });

  // Left: Precio Final
  const precioIva = data.systemPrice || data.precioFinal || 0;
  const precioSinIva = data.systemPriceNoIva || 0;
  page.drawText('PRECIO FINAL (IVA INCLUIDO)', {
    x: MARGIN_LEFT + 15, y: y - 14, size: 7, font: fontBold, color: cGray,
  });
  page.drawText(formatCLP(precioIva), {
    x: MARGIN_LEFT + 15, y: y - 28, size: 16, font: fontBold, color: cWhite,
  });
  page.drawText(`(${formatCLP(precioSinIva)} + IVA)`, {
    x: MARGIN_LEFT + 15, y: y - 42, size: 7, font: fontRegular, color: cGray,
  });

  // Right: Valor transferencia (green box)
  const transfPrice = data.precioTransferencia || precioSinIva;
  const greenBoxW = 200;
  const greenX = PAGE_WIDTH - MARGIN_RIGHT - greenBoxW - 15;
  page.drawRectangle({ x: greenX, y: y - payCardH + 8, width: greenBoxW, height: payCardH - 16, color: cDarkGreen });
  page.drawText('PAGO TRANSFERENCIA', {
    x: greenX + 12, y: y - 22, size: 7, font: fontBold, color: cWhite,
  });
  page.drawText(formatCLP(transfPrice), {
    x: greenX + 12, y: y - 38, size: 14, font: fontBold, color: cWhite,
  });

  y -= (payCardH + 8);

  // 3 payment option cards
  const optW = (CONTENT_WIDTH - 15 * 2) / 3;
  const optH = 60;

  const cuota12 = Math.round(precioIva / 12);
  const cuota48 = Math.round(precioIva / 48);

  // 12 cuotas
  const optCards = [
    {
      title: 'TARJETA DE CRÉDITO',
      big: `12 x ${formatCLP(cuota12)}`,
      desc: 'Hasta 12 cuotas sin interés',
      sub: 'con cualquier banco · Webpay',
    },
    {
      title: 'TARJETA DE CRÉDITO',
      big: `48 x ${formatCLP(cuota48)}`,
      desc: 'Hasta 48 cuotas sin interés',
      sub: 'con Banco Santander',
    },
    {
      title: 'FINANCIAMIENTO ENERCITY',
      big: 'Sin inversión inicial',
      desc: 'Desde 10 a 25 años',
      sub: 'Cuotas accesibles · Respuesta inmediata',
    },
  ];

  // Logo badges shown in the top-right corner of each payment card
  const optLogoSpecs = [
    { buffer: getWebpayLogoBuffer(), w: 176, h: 95, targetH: 16 },
    { buffer: getSantanderLogoBuffer(), w: 259, h: 127, targetH: 16 },
    { buffer: getChecklistIconBuffer(), w: 59, h: 54, targetH: 20 },
  ];

  for (let oi = 0; oi < 3; oi++) {
    const ox = MARGIN_LEFT + oi * (optW + 15);
    drawCardBackground(page, ox, y, optW, optH, cBgGray);
    page.drawText(sanitizeText(optCards[oi].title), {
      x: ox + 12, y: y - 13, size: 7, font: fontBold, color: cBlue,
    });
    const bigSize = oi === 2 ? 10 : 12;
    page.drawText(sanitizeText(optCards[oi].big), {
      x: ox + 12, y: y - 28, size: bigSize, font: fontBold, color: oi === 2 ? cGreen : cOrange,
    });
    page.drawText(sanitizeText(optCards[oi].desc), {
      x: ox + 12, y: y - 42, size: 7, font: fontRegular, color: cText,
    });
    page.drawText(sanitizeText(optCards[oi].sub), {
      x: ox + 12, y: y - 54, size: 7, font: fontRegular, color: cGray,
    });

    const logoSpec = optLogoSpecs[oi];
    const logoImage = await pdfDoc.embedPng(logoSpec.buffer);
    const logoW = logoSpec.w * (logoSpec.targetH / logoSpec.h);
    page.drawImage(logoImage, {
      x: ox + optW - 12 - logoW,
      y: y - 12 - logoSpec.targetH,
      width: logoW,
      height: logoSpec.targetH,
    });
  }
  y -= (optH + 8);

  // Garantía de instalación (admin-editable, if present)
  if (data.garantiaText && data.garantiaText.trim().length > 0) {
    const gLines = wrapText(page, fontRegular, data.garantiaText, CONTENT_WIDTH - 30);
    checkPageBreak(25 + Math.min(gLines.length, 6) * 14 + 10);
    y = drawSectionHeader(page, fontBold, 'Garantía de Instalación', y);
    for (const line of gLines.slice(0, 3)) {
      page.drawText(sanitizeText(line), {
        x: MARGIN_LEFT, y, size: 8, font: fontRegular, color: cText,
      });
      y -= 12;
    }
    y -= 5;
  }

  // ========================================================================
  // 8. FOOTER — ventas@enercity.cl + 15 días
  // ========================================================================
  const footerY = 55;
  const footerTeam = 'Equipo de Ventas Enercity';
  page.drawText(sanitizeText(footerTeam), {
    x: MARGIN_LEFT, y: footerY, size: 8, font: fontBold, color: cBlue,
  });
  const footerTeamW = fontBold.widthOfTextAtSize(sanitizeText(footerTeam), 8);
  page.drawText(sanitizeText(' · Email: ventas@enercity.cl | Tel: +56 9 2902 8578 | Providencia, Santiago, Chile'), {
    x: MARGIN_LEFT + footerTeamW, y: footerY, size: 7, font: fontRegular, color: cText,
  });
  page.drawText(sanitizeText('*Tarifas de energía de referencia estimadas. Validez de la cotización: 15 días desde la fecha de emisión.'), {
    x: MARGIN_LEFT, y: footerY - 13, size: 6, font: fontRegular, color: cText,
  });

  // ========================================================================
  // Serialize
  // ========================================================================
  return await pdfDoc.save();
}
