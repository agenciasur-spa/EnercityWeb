/**
 * pdfGenerator.ts — Self-contained PDF generator for Enercity diagnostic reports.
 *
 * Uses pdf-lib (v1.17.1) via dynamic import. All text in Spanish.
 * US Letter, 2 pages, Helvetica/HelveticaBold, matching the approved brand redesign.
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
import { getWebpayLogoBuffer } from './payment-logo-buffers';

// ---------------------------------------------------------------------------
// Color palette matching the client's reference (COT_HIBRIDO_14_3_kWh.html)
// ---------------------------------------------------------------------------

// Palette matches the approved redesign 1:1 (Cotizacion Enercity v2.dc.html),
// which uses the site's real brand tokens — not the invented navy/amber from
// the previous template.
const COLOR_DARK_BLUE: RGB = { red: 0.0824, green: 0.2745, blue: 0.3765, type: 'RGB' } as RGB; // #154660 (navy)
const COLOR_ACCENT_ORANGE: RGB = { red: 0.9412, green: 0.4941, blue: 0.0157, type: 'RGB' } as RGB; // #F07E04
const COLOR_GREEN: RGB = { red: 0.2902, green: 0.6863, blue: 0.3020, type: 'RGB' } as RGB; // #4AAF4D
const COLOR_LABEL_MUTED: RGB = { red: 0.4431, green: 0.5020, blue: 0.5882, type: 'RGB' } as RGB; // #718096 (eyebrow labels)
const COLOR_TEXT_DARK: RGB = { red: 0.2902, green: 0.3333, blue: 0.4078, type: 'RGB' } as RGB; // #4a5568 (body copy)
const COLOR_LIGHT_GRAY: RGB = { red: 0.8863, green: 0.9098, blue: 0.9412, type: 'RGB' } as RGB; // #e2e8f0 (borders/dividers)
const COLOR_BG_CARD: RGB = { red: 0.9725, green: 0.9804, blue: 0.9882, type: 'RGB' } as RGB; // #f8fafc (light card bg)
const COLOR_FOOTER_MUTED: RGB = { red: 0.6275, green: 0.6824, blue: 0.7529, type: 'RGB' } as RGB; // #a0aec0
const COLOR_WHITE: RGB = { red: 1, green: 1, blue: 1, type: 'RGB' } as RGB;
const COLOR_TRANSFER_BG: RGB = { red: 1, green: 0.9843, blue: 0.9216, type: 'RGB' } as RGB; // #fffbeb
const COLOR_TRANSFER_BORDER: RGB = { red: 0.9961, green: 0.8431, blue: 0.6667, type: 'RGB' } as RGB; // #fed7aa
const COLOR_TRANSFER_TEXT: RGB = { red: 0.5725, green: 0.2510, blue: 0.0549, type: 'RGB' } as RGB; // #92400e
const COLOR_SANTANDER_RED: RGB = { red: 0.9255, green: 0, blue: 0, type: 'RGB' } as RGB; // #EC0000

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

// US Letter — the approved design canvas is authored at "size=letter" (612×792);
// switching from the previous A4 canvas keeps every measurement below a 1:1
// match with the design instead of rescaling everything.
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_LEFT = 44;
const MARGIN_RIGHT = 44;
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

const MONTHS: readonly string[] = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function formatDate(iso: string): string {
  const d: Date = new Date(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()] ?? 'enero'} de ${d.getFullYear()}`;
}

// "1 de septiembre" — no year, used for the "válida hasta" companion date.
function formatShortDate(d: Date): string {
  return `${d.getDate()} de ${MONTHS[d.getMonth()] ?? 'enero'}`;
}

function formatValidUntil(quoteDateIso: string, validUntilIso?: string): string {
  const until = validUntilIso ? new Date(validUntilIso) : new Date(quoteDateIso);
  if (!validUntilIso) until.setDate(until.getDate() + 15);
  return formatShortDate(until);
}

// Chilean decimal comma, trailing zero dropped for whole factors: 1 -> "1,0".
function formatFactor(n: number): string {
  const fixed = n.toFixed(2);
  const trimmed = fixed.endsWith('0') ? fixed.slice(0, -1) : fixed;
  return trimmed.replace('.', ',');
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
function wrapText(page: PDFPage, font: PDFFont, text: string, maxWidth: number, fontSize: number = 9): string[] {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(sanitizeText(candidate), fontSize) > maxWidth && current) {
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
 * Section header: bold title, a thin bottom rule, and an optional muted
 * right-aligned note — e.g. "Fichas técnicas disponibles a solicitud".
 */
function drawSectionHeader(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  text: string,
  y: number,
  rightNote?: string,
  rightNoteColor: RGB = COLOR_LABEL_MUTED,
): number {
  page.drawText(sanitizeText(text), {
    x: MARGIN_LEFT, y, size: 12.5, font: fontBold, color: COLOR_DARK_BLUE,
  });
  if (rightNote) {
    const safeNote = sanitizeText(rightNote);
    const noteWidth = fontRegular.widthOfTextAtSize(safeNote, 8.5);
    page.drawText(safeNote, {
      x: PAGE_WIDTH - MARGIN_RIGHT - noteWidth, y: y + 1, size: 8.5, font: fontRegular, color: rightNoteColor,
    });
  }
  page.drawLine({
    start: { x: MARGIN_LEFT, y: y - 8 }, end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y - 8 },
    thickness: 1, color: COLOR_LIGHT_GRAY,
  });
  return y - 26;
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

/**
 * Draws a rectangle with rounded corners via an SVG path — pdf-lib's
 * drawRectangle has no borderRadius option, and passing one (as an earlier
 * script did) is silently ignored. `y` is the TOP edge, same convention as
 * every yTop used in this file: verified empirically that drawSvgPath
 * anchors the path at the given (x, y) and extends it downward from there,
 * unlike drawRectangle (which takes the bottom-left corner).
 */
function drawRoundedRect(
  page: PDFPage,
  opts: { x: number; y: number; width: number; height: number; radius: number; color?: RGB; borderColor?: RGB; borderWidth?: number }
): void {
  const { x, y, width: w, height: h, color, borderColor, borderWidth } = opts;
  const r = Math.max(0, Math.min(opts.radius, w / 2, h / 2));
  const d = r === 0
    ? `M 0 0 H ${w} V ${h} H 0 Z`
    : `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r}`
    + ` V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h}`
    + ` H ${r} A ${r} ${r} 0 0 1 0 ${h - r}`
    + ` V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  page.drawSvgPath(d, { x, y, color, borderColor, borderWidth });
}

/**
 * Light placeholder shown where an equipment photo would go, while the
 * admin hasn't set a real imagenUrl yet (or it failed to load).
 */
function drawImagePlaceholder(page: PDFPage, x: number, yTop: number, width: number, height: number, font: PDFFont): void {
  const label = 'IMAGEN';
  const labelWidth = font.widthOfTextAtSize(label, 7.5);
  page.drawText(label, {
    x: x + (width - labelWidth) / 2, y: yTop - height / 2 - 3, size: 7.5, font, color: COLOR_LABEL_MUTED,
  });
}

const EQUIPMENT_CARD_HEIGHT = 205;
const EQUIPMENT_IMAGE_BOX_HEIGHT = 100;

/**
 * Equipment card matching the redesign: rounded card, a light image
 * container on top, then an orange eyebrow + bold name + short description.
 * The visible "Ficha técnica" footer bar from the previous template is gone
 * (the redesign says "disponibles a solicitud" once in the section header
 * instead) — the whole card stays clickable to the ficha técnica URL when
 * one is set, just without a visible affordance for it.
 */
async function drawEquipmentCardV2(
  page: PDFPage,
  pdfDoc: PDFDocumentType,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  equipment: EquipmentCard,
  x: number,
  yTop: number,
  width: number,
  titlePrefix?: string,
): Promise<void> {
  const padX = 16;
  const padImg = 12;
  const height = EQUIPMENT_CARD_HEIGHT;
  const imageBoxH = EQUIPMENT_IMAGE_BOX_HEIGHT;

  drawRoundedRect(page, { x, y: yTop, width, height, radius: 10, color: COLOR_WHITE, borderColor: COLOR_LIGHT_GRAY, borderWidth: 1 });

  page.drawRectangle({ x: x + 1, y: yTop - imageBoxH, width: width - 2, height: imageBoxH - 1, color: COLOR_BG_CARD });
  page.drawLine({
    start: { x, y: yTop - imageBoxH }, end: { x: x + width, y: yTop - imageBoxH },
    thickness: 1, color: COLOR_LIGHT_GRAY,
  });

  if (equipment.imagenUrl) {
    const embeddedImage = await embedRemoteImage(pdfDoc, equipment.imagenUrl).catch(() => null);
    if (embeddedImage) {
      const availW = width - padImg * 2;
      const availH = imageBoxH - padImg * 2;
      const scale = Math.min(availW / embeddedImage.width, availH / embeddedImage.height);
      const scaledW = embeddedImage.width * scale;
      const scaledH = embeddedImage.height * scale;
      page.drawImage(embeddedImage.image, {
        x: x + (width - scaledW) / 2,
        y: yTop - imageBoxH + (imageBoxH - scaledH) / 2,
        width: scaledW,
        height: scaledH,
      });
    } else {
      drawImagePlaceholder(page, x, yTop, width, imageBoxH, fontRegular);
    }
  } else {
    drawImagePlaceholder(page, x, yTop, width, imageBoxH, fontRegular);
  }

  let cy = yTop - imageBoxH - 14;

  const eyebrowLabel = equipment.tipo === 'inversor'
    ? 'Inversor'
    : equipment.tipo === 'bateria'
      ? 'Batería de respaldo'
      : 'Panel solar';
  page.drawText(sanitizeText(eyebrowLabel.toUpperCase()), {
    x: x + padX, y: cy, size: 9, font: fontBold, color: COLOR_ACCENT_ORANGE,
  });
  cy -= 16;

  const titleText = titlePrefix ? `${titlePrefix} ${equipment.nombre}` : equipment.nombre;
  const titleLines = wrapText(page, fontBold, titleText, width - padX * 2, 12.5).slice(0, 2);
  for (const line of titleLines) {
    page.drawText(sanitizeText(line), {
      x: x + padX, y: cy, size: 12.5, font: fontBold, color: COLOR_DARK_BLUE,
    });
    cy -= 15;
  }
  cy -= 1;

  const descText = equipment.descripcion || (equipment.garantia ? `Garantía de ${equipment.garantia}` : undefined);
  if (descText) {
    const descLines = wrapText(page, fontRegular, descText, width - padX * 2).slice(0, 2);
    for (const line of descLines) {
      page.drawText(sanitizeText(line), {
        x: x + padX, y: cy, size: 9, font: fontRegular, color: COLOR_LABEL_MUTED,
      });
      cy -= 12;
    }
  }

  if (equipment.fichaTecnicaUrl) {
    page.drawText(sanitizeText('Ver ficha técnica >'), {
      x: x + padX, y: yTop - height + 16, size: 8.5, font: fontBold, color: COLOR_ACCENT_ORANGE,
    });
    drawClickableLink(page, equipment.fichaTecnicaUrl, x, yTop, width, height);
  }
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

function drawPageFooter(
  page: PDFPage,
  fontRegular: PDFFont,
  leftText: string,
  pageLabel: string,
  maxLeftWidth: number = CONTENT_WIDTH * 0.64,
): void {
  const FOOTER_Y = 40;
  page.drawLine({
    start: { x: MARGIN_LEFT, y: FOOTER_Y + 20 }, end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: FOOTER_Y + 20 },
    thickness: 1, color: COLOR_LIGHT_GRAY,
  });
  const leftLines = wrapText(page, fontRegular, leftText, maxLeftWidth).slice(0, 4);
  let ly = FOOTER_Y + 4;
  for (const line of leftLines) {
    page.drawText(sanitizeText(line), { x: MARGIN_LEFT, y: ly, size: 7.5, font: fontRegular, color: COLOR_FOOTER_MUTED });
    ly -= 10;
  }
  const safeLabel = sanitizeText(pageLabel);
  const labelW = fontRegular.widthOfTextAtSize(safeLabel, 7.5);
  page.drawText(safeLabel, {
    x: PAGE_WIDTH - MARGIN_RIGHT - labelW, y: FOOTER_Y + 4, size: 7.5, font: fontRegular, color: COLOR_FOOTER_MUTED,
  });
}

export async function generatePDF(data: PDFData): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const pdfDoc: PDFDocumentType = await PDFDocument.create();

  const fontRegular: PDFFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold: PDFFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cBlue = COLOR_DARK_BLUE;
  const cOrange = COLOR_ACCENT_ORANGE;
  const cGreen = COLOR_GREEN;
  const cLabel = COLOR_LABEL_MUTED;
  const cText = COLOR_TEXT_DARK;
  const cBorder = COLOR_LIGHT_GRAY;
  const cBgCard = COLOR_BG_CARD;
  const cWhite = COLOR_WHITE;

  const hasBattery = Boolean(data.equipment?.some((e) => e.tipo === 'bateria') || (data.batteryCost && data.batteryCost > 0));
  const inverterCard = data.equipment?.find((e) => e.tipo === 'inversor');
  const panelCard = data.equipment?.find((e) => e.tipo === 'panel');

  // =========================================================================
  // PAGE 1 — Diagnóstico
  // =========================================================================
  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const HEADER_H = 90;
  const HEADER_PAD_TOP = 19;
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_H, width: PAGE_WIDTH, height: HEADER_H, color: cBlue });
  const HEADER_RULE_H = 3;
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_H - HEADER_RULE_H, width: PAGE_WIDTH, height: HEADER_RULE_H, color: cOrange });

  try {
    const logoImage = await pdfDoc.embedPng(new Uint8Array(getLogoBuffer()));
    const logoH = 28;
    const logoScale = logoH / logoImage.height;
    page.drawImage(logoImage, {
      x: MARGIN_LEFT, y: PAGE_HEIGHT - HEADER_PAD_TOP - logoH,
      width: logoImage.width * logoScale, height: logoH,
    });
  } catch {
    page.drawText('Enercity', { x: MARGIN_LEFT, y: PAGE_HEIGHT - HEADER_PAD_TOP - 20, size: 20, font: fontBold, color: cWhite });
  }
  page.drawText(sanitizeText('DIAGNÓSTICO SOLAR · PRESUPUESTO CERTIFICADO SEC'), {
    x: MARGIN_LEFT, y: PAGE_HEIGHT - HEADER_PAD_TOP - 28 - 12, size: 7.5, font: fontBold, color: cOrange,
  });

  const cotNum = data.numeroCotizacion || '2026-0000';
  const dateLine = `${formatDate(data.quoteDate)} · válida hasta el ${formatValidUntil(data.quoteDate, data.validUntil)}`;
  {
    const label = 'N° COTIZACIÓN';
    const labelW = fontBold.widthOfTextAtSize(label, 8);
    page.drawText(label, { x: PAGE_WIDTH - MARGIN_RIGHT - labelW, y: PAGE_HEIGHT - HEADER_PAD_TOP - 8, size: 8, font: fontBold, color: cWhite, opacity: 0.55 });
    const numW = fontBold.widthOfTextAtSize(sanitizeText(cotNum), 17);
    page.drawText(sanitizeText(cotNum), { x: PAGE_WIDTH - MARGIN_RIGHT - numW, y: PAGE_HEIGHT - HEADER_PAD_TOP - 28, size: 17, font: fontBold, color: cWhite });
    const safeDateLine = sanitizeText(dateLine);
    const dateW = fontRegular.widthOfTextAtSize(safeDateLine, 8);
    page.drawText(safeDateLine, { x: PAGE_WIDTH - MARGIN_RIGHT - dateW, y: PAGE_HEIGHT - HEADER_PAD_TOP - 42, size: 8, font: fontRegular, color: cWhite, opacity: 0.7 });
  }

  let y = PAGE_HEIGHT - HEADER_H - HEADER_RULE_H - 22.5;

  // --- Preparada para / Boleta mensual -------------------------------------
  const colGap = 28;
  const colLeftW = (CONTENT_WIDTH - colGap) * (1.25 / 2.25);
  const colRightX = MARGIN_LEFT + colLeftW + colGap;

  page.drawText(sanitizeText('PREPARADA PARA'), { x: MARGIN_LEFT, y, size: 8, font: fontBold, color: cLabel });
  page.drawText(sanitizeText('BOLETA MENSUAL ACTUAL'), { x: colRightX, y, size: 8, font: fontBold, color: cLabel });
  page.drawLine({ start: { x: colRightX - 14, y: y - 46 }, end: { x: colRightX - 14, y: y + 8 }, thickness: 1, color: cBorder });
  y -= 20;

  page.drawText(sanitizeText(data.customerName || 'Cliente'), { x: MARGIN_LEFT, y, size: 19, font: fontBold, color: cBlue });
  page.drawText(sanitizeText(formatCLP(data.monthlyBill)), { x: colRightX, y, size: 19, font: fontBold, color: cBlue });
  y -= 16;

  const regionText = data.regionName || data.comunaName || 'Región no especificada';
  page.drawText(sanitizeText(regionText), { x: MARGIN_LEFT, y, size: 9.5, font: fontRegular, color: cText });
  page.drawText(sanitizeText('Base del dimensionamiento del kit'), { x: colRightX, y, size: 9.5, font: fontRegular, color: cText });
  y -= 14;

  const factorLineParts = [
    data.roofType ? `Techo ${data.roofType}` : undefined,
    data.meterLocation ? `Medidor ${data.meterLocation}` : undefined,
  ].filter((p): p is string => Boolean(p));
  if (factorLineParts.length > 0) {
    page.drawText(sanitizeText(factorLineParts.join('  ·  ')), { x: MARGIN_LEFT, y, size: 9.5, font: fontRegular, color: cText });
  }
  y -= 28;

  // --- Kit recomendado (navy rounded card) ---------------------------------
  const kitCardH = 96;
  drawRoundedRect(page, { x: MARGIN_LEFT, y, width: CONTENT_WIDTH, height: kitCardH, radius: 10, color: cBlue });

  const kitDividerX = MARGIN_LEFT + CONTENT_WIDTH * 0.7;
  page.drawLine({
    start: { x: kitDividerX, y: y - kitCardH + 20 }, end: { x: kitDividerX, y: y - 20 },
    thickness: 1, color: cWhite, opacity: 0.18,
  });

  page.drawText(sanitizeText('KIT RECOMENDADO'), {
    x: MARGIN_LEFT + 24, y: y - 26, size: 8, font: fontBold, color: cOrange,
  });
  page.drawText(sanitizeText(`${data.kitPower || 'XX kWp'} · ${data.panelCount || 0} paneles`), {
    x: MARGIN_LEFT + 24, y: y - 46, size: 20, font: fontBold, color: cWhite,
  });
  const kitDescParts = [
    `Sistema ${hasBattery ? 'híbrido on grid' : 'on grid'}`,
    inverterCard ? `inversor ${inverterCard.marca}${inverterCard.modelo ? ' ' + inverterCard.modelo : ''}` : undefined,
    panelCard ? `paneles ${panelCard.marca}${panelCard.modelo ? ' ' + panelCard.modelo : ''}` : undefined,
    hasBattery ? 'batería de respaldo' : undefined,
  ].filter((p): p is string => Boolean(p));
  const kitDescLine = kitDescParts.join(' · ');
  const kitDescMaxW = kitDividerX - (MARGIN_LEFT + 24) - 10;
  const kitDescLines = wrapText(page, fontRegular, kitDescLine, kitDescMaxW).slice(0, 2);
  let kdy = y - 62;
  for (const line of kitDescLines) {
    page.drawText(sanitizeText(line), { x: MARGIN_LEFT + 24, y: kdy, size: 9, font: fontRegular, color: cWhite, opacity: 0.72 });
    kdy -= 12;
  }

  const annualGenKwh = data.co2Reduction > 0 ? data.co2Reduction * 2 : data.panelCount * data.panelWattage;
  const genValueText = sanitizeText(formatNumber(annualGenKwh));
  const genValueW = fontBold.widthOfTextAtSize(genValueText, 26);
  const genColX = kitDividerX + (PAGE_WIDTH - MARGIN_RIGHT - kitDividerX) / 2;
  page.drawText(genValueText, { x: genColX - genValueW / 2, y: y - kitCardH / 2 + 5, size: 26, font: fontBold, color: cOrange });
  const genLabelText = sanitizeText('kWh generados al año');
  const genLabelW = fontBold.widthOfTextAtSize(genLabelText, 7.5);
  page.drawText(genLabelText, { x: genColX - genLabelW / 2, y: y - kitCardH / 2 - 11, size: 7.5, font: fontBold, color: cWhite, opacity: 0.6 });

  y -= (kitCardH + 22);

  // --- Equipos del proyecto — 3 cards ---------------------------------------
  if (data.equipment && data.equipment.length > 0) {
    const cardCount = Math.min(data.equipment.length, 3);
    const cardGap = 14;
    const cardW = (CONTENT_WIDTH - cardGap * (cardCount - 1)) / cardCount;

    y = drawSectionHeader(page, fontBold, fontRegular, 'Equipos del proyecto', y, 'Fichas técnicas disponibles a solicitud');
    const rowTopY = y;
    for (let i = 0; i < cardCount; i++) {
      const cx = MARGIN_LEFT + i * (cardW + cardGap);
      const titlePrefix = data.equipment[i].tipo === 'panel' && data.panelCount ? `${data.panelCount} ×` : undefined;
      await drawEquipmentCardV2(page, pdfDoc, fontBold, fontRegular, data.equipment[i], cx, rowTopY, cardW, titlePrefix);
    }
    y = rowTopY - EQUIPMENT_CARD_HEIGHT - 22;
  }

  // --- Resumen de tu inversión — 4 stats ------------------------------------
  const retornoLabel = getClassificationLabel(data.investmentClassification || '').toUpperCase();
  y = drawSectionHeader(page, fontBold, fontRegular, 'Resumen de tu inversión', y, retornoLabel || undefined, cGreen);

  const summaryStats = [
    { value: formatCLP(data.annualSavings), color: cGreen, label: 'Ahorro estimado por año' },
    { value: `${data.paybackYears.toFixed(1).replace('.', ',')} años`, color: cBlue, label: 'Recuperación de la inversión' },
    { value: formatPercent(data.coveragePercent), color: cBlue, label: 'Cobertura de tu consumo' },
    { value: formatCLP(data.roi25Years), color: cBlue, label: 'Ahorro acumulado a 25 años' },
  ];
  const statGap = 22;
  const statColW = (CONTENT_WIDTH - statGap * 3) / 4;
  for (let si = 0; si < summaryStats.length; si++) {
    const sx = MARGIN_LEFT + si * (statColW + statGap);
    if (si > 0) {
      page.drawLine({ start: { x: sx - statGap / 2, y: y - 52 }, end: { x: sx - statGap / 2, y: y + 4 }, thickness: 1, color: cBorder });
    }
    page.drawText(sanitizeText(summaryStats[si].value), { x: sx, y: y - 18, size: 18, font: fontBold, color: summaryStats[si].color });
    const labelLines = wrapText(page, fontRegular, summaryStats[si].label, statColW).slice(0, 2);
    let sly = y - 32;
    for (const line of labelLines) {
      page.drawText(sanitizeText(line), { x: sx, y: sly, size: 8, font: fontRegular, color: cLabel });
      sly -= 10;
    }
  }
  y -= (52 + 14);

  // --- Qué incluye tu proyecto — 5 items ------------------------------------
  y = drawSectionHeader(page, fontBold, fontRegular, 'Qué incluye tu proyecto', y);
  const incluyeItems = [
    'Asesoría personalizada',
    'Diseño e instalación',
    'Certificación SEC (TE4)',
    'Monitoreo remoto en la app',
    'Servicio post venta',
  ];
  const incluyeGap = 14;
  const incluyeColW = (CONTENT_WIDTH - incluyeGap * (incluyeItems.length - 1)) / incluyeItems.length;
  for (let ii = 0; ii < incluyeItems.length; ii++) {
    const ix = MARGIN_LEFT + ii * (incluyeColW + incluyeGap);
    page.drawRectangle({ x: ix, y: y - 3, width: 20, height: 3, color: cGreen });
    const lines = wrapText(page, fontBold, incluyeItems[ii], incluyeColW).slice(0, 2);
    let ly = y - 17;
    for (const line of lines) {
      page.drawText(sanitizeText(line), { x: ix, y: ly, size: 8.5, font: fontBold, color: cText });
      ly -= 11;
    }
  }

  drawPageFooter(page, fontRegular, 'Enercity SpA · ventas@enercity.cl · +56 9 2902 8578 · enercity.cl', 'Página 1 de 2');

  // =========================================================================
  // PAGE 2 — Inversión y formas de pago
  // =========================================================================
  page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - 48;

  page.drawText(sanitizeText('Inversión y formas de pago'), { x: MARGIN_LEFT, y, size: 13, font: fontBold, color: cBlue });
  const p2Note = sanitizeText(`Cotización N° ${cotNum} · ${data.customerName || 'Cliente'}`);
  const p2NoteW = fontRegular.widthOfTextAtSize(p2Note, 8.5);
  page.drawText(p2Note, { x: PAGE_WIDTH - MARGIN_RIGHT - p2NoteW, y: y + 1, size: 8.5, font: fontRegular, color: COLOR_FOOTER_MUTED });
  y -= 32;

  // --- Precio de lista / Precio con transferencia ---------------------------
  const precioLista = data.precioLista ?? data.systemPrice ?? 0;
  const precioTransferencia = data.precioTransferencia ?? data.precioFinal ?? data.systemPrice ?? 0;
  const hasDualPricing = Boolean(data.precioLista && data.precioLista > 0 && data.precioLista !== precioTransferencia);
  const priceCardH = 118;
  const priceGap = 14;
  const priceLeftW = hasDualPricing ? (CONTENT_WIDTH - priceGap) * (1 / 2.2) : CONTENT_WIDTH;
  const priceRightW = CONTENT_WIDTH - priceLeftW - priceGap;

  if (hasDualPricing) {
    // Left: Precio de lista (muted, strikethrough)
    drawRoundedRect(page, { x: MARGIN_LEFT, y, width: priceLeftW, height: priceCardH, radius: 10, color: cBgCard, borderColor: cBorder, borderWidth: 1 });
    page.drawText(sanitizeText('PRECIO DE LISTA'), { x: MARGIN_LEFT + 22, y: y - 34, size: 8, font: fontBold, color: cLabel });
    const listaText = sanitizeText(formatCLP(precioLista));
    page.drawText(listaText, { x: MARGIN_LEFT + 22, y: y - 58, size: 24, font: fontBold, color: cLabel });
    const listaW = fontBold.widthOfTextAtSize(listaText, 24);
    page.drawLine({ start: { x: MARGIN_LEFT + 22, y: y - 51 }, end: { x: MARGIN_LEFT + 22 + listaW, y: y - 51 }, thickness: 1.5, color: cLabel });
    const listaSubLines = wrapText(page, fontRegular, 'Llave en mano, IVA incluido · incluye factores de techo y despacho regional', priceLeftW - 44).slice(0, 2);
    let lsy = y - 76;
    for (const line of listaSubLines) {
      page.drawText(sanitizeText(line), { x: MARGIN_LEFT + 22, y: lsy, size: 8.5, font: fontRegular, color: cText });
      lsy -= 11;
    }

    // Right: Precio con transferencia (highlighted)
    const rx = MARGIN_LEFT + priceLeftW + priceGap;
    drawRoundedRect(page, { x: rx, y, width: priceRightW, height: priceCardH, radius: 10, color: COLOR_TRANSFER_BG, borderColor: COLOR_TRANSFER_BORDER, borderWidth: 1 });
    page.drawText(sanitizeText('PRECIO CON TRANSFERENCIA'), { x: rx + 22, y: y - 24, size: 8, font: fontBold, color: COLOR_TRANSFER_TEXT });

    const savings = Math.max(0, precioLista - precioTransferencia);
    if (savings > 0) {
      const badgeText = sanitizeText(`Ahorras ${formatCLP(savings)}`);
      const badgeW = fontBold.widthOfTextAtSize(badgeText, 7.5) + 20;
      const badgeX = rx + priceRightW - 22 - badgeW;
      drawRoundedRect(page, { x: badgeX, y: y - 16, width: badgeW, height: 18, radius: 6, color: cOrange });
      const badgePadTop = 6;
      page.drawText(badgeText, { x: badgeX + 10, y: y - 21.5 - badgePadTop, size: 7.5, font: fontBold, color: cWhite });
    }

    page.drawText(sanitizeText(formatCLP(precioTransferencia)), { x: rx + 22, y: y - 68, size: 36, font: fontBold, color: cOrange });
    page.drawText(sanitizeText('Pago contado por transferencia bancaria, IVA incluido.'), {
      x: rx + 22, y: y - 78, size: 9, font: fontBold, color: COLOR_TRANSFER_TEXT,
    });
  } else {
    drawRoundedRect(page, { x: MARGIN_LEFT, y, width: priceLeftW, height: priceCardH, radius: 10, color: cBgCard, borderColor: cBorder, borderWidth: 1 });
    page.drawText(sanitizeText('PRECIO FINAL (IVA INCLUIDO)'), { x: MARGIN_LEFT + 22, y: y - 34, size: 8, font: fontBold, color: cLabel });
    page.drawText(sanitizeText(formatCLP(precioTransferencia)), { x: MARGIN_LEFT + 22, y: y - 66, size: 32, font: fontBold, color: cBlue });
    page.drawText(sanitizeText(`(${formatCLP(data.systemPriceNoIva || 0)} + IVA)`), { x: MARGIN_LEFT + 22, y: y - 84, size: 9, font: fontRegular, color: cText });
  }
  y -= (priceCardH + 30);

  // --- Formas de pago ---------------------------------------------------
  const cuotaBase = precioLista || precioTransferencia;
  const cuota12 = Math.round(cuotaBase / 12);
  const cuota48 = Math.round(cuotaBase / 48);
  y = drawSectionHeader(page, fontBold, fontRegular, 'Formas de pago', y, `Cuotas calculadas sobre el precio de lista de ${formatCLP(cuotaBase)}`);

  const payGap = 14;
  const payColW = (CONTENT_WIDTH - payGap) / 2;
  const payRow1H = 108;

  // Webpay card
  drawRoundedRect(page, { x: MARGIN_LEFT, y, width: payColW, height: payRow1H, radius: 10, borderColor: cBorder, borderWidth: 1 });
  page.drawText(sanitizeText('TARJETA DE CRÉDITO'), { x: MARGIN_LEFT + 18, y: y - 22, size: 7.5, font: fontBold, color: cOrange });
  page.drawText(sanitizeText(`12 × ${formatCLP(cuota12)}`), { x: MARGIN_LEFT + 18, y: y - 42, size: 17, font: fontBold, color: cBlue });
  page.drawText(sanitizeText('Hasta 12 cuotas sin interés con cualquier banco'), { x: MARGIN_LEFT + 18, y: y - 56, size: 8, font: fontRegular, color: cLabel });
  page.drawLine({ start: { x: MARGIN_LEFT + 18, y: y - 68 }, end: { x: MARGIN_LEFT + payColW - 18, y: y - 68 }, thickness: 1, color: COLOR_LIGHT_GRAY });
  try {
    const webpayLogo = await pdfDoc.embedPng(getWebpayLogoBuffer());
    const targetH = 20;
    const wpW = 176 * (targetH / 95);
    page.drawImage(webpayLogo, { x: MARGIN_LEFT + 18, y: y - 68 - 12 - targetH, width: wpW, height: targetH });
    page.drawText(sanitizeText('Pago seguro en línea'), { x: MARGIN_LEFT + 18 + wpW + 10, y: y - 68 - 12 - targetH / 2 - 3, size: 7.5, font: fontRegular, color: COLOR_FOOTER_MUTED });
  } catch {
    // logo optional
  }

  // Santander card
  const santX = MARGIN_LEFT + payColW + payGap;
  drawRoundedRect(page, { x: santX, y, width: payColW, height: payRow1H, radius: 10, borderColor: cBorder, borderWidth: 1 });
  page.drawText(sanitizeText('TARJETA SANTANDER'), { x: santX + 18, y: y - 22, size: 7.5, font: fontBold, color: cOrange });
  page.drawText(sanitizeText(`48 × ${formatCLP(cuota48)}`), { x: santX + 18, y: y - 42, size: 17, font: fontBold, color: cBlue });
  page.drawText(sanitizeText('Hasta 48 cuotas sin interés con tarjetas Santander'), { x: santX + 18, y: y - 56, size: 8, font: fontRegular, color: cLabel });
  page.drawLine({ start: { x: santX + 18, y: y - 68 }, end: { x: santX + payColW - 18, y: y - 68 }, thickness: 1, color: COLOR_LIGHT_GRAY });
  page.drawText(sanitizeText('Banco Santander'), { x: santX + 18, y: y - 68 - 20, size: 10.5, font: fontBold, color: COLOR_SANTANDER_RED });
  page.drawText(sanitizeText('Despacho gratis · acumula millas'), { x: santX + 18, y: y - 68 - 32, size: 7.5, font: fontRegular, color: COLOR_FOOTER_MUTED });

  y -= (payRow1H + payGap);

  // Financiamiento Enercity (full width, navy border)
  const finH = 64;
  drawRoundedRect(page, { x: MARGIN_LEFT, y, width: CONTENT_WIDTH, height: finH, radius: 10, borderColor: cBlue, borderWidth: 1 });
  page.drawText(sanitizeText('FINANCIAMIENTO ENERCITY'), { x: MARGIN_LEFT + 20, y: y - 22, size: 7.5, font: fontBold, color: cOrange });
  page.drawText(sanitizeText('Sin inversión inicial'), { x: MARGIN_LEFT + 20, y: y - 42, size: 17, font: fontBold, color: cBlue });
  page.drawText(sanitizeText('Plazos de 10 a 25 años · cuota mensual comparable a tu boleta actual'), {
    x: MARGIN_LEFT + 20, y: y - 55, size: 8, font: fontRegular, color: cLabel,
  });
  page.drawLine({ start: { x: MARGIN_LEFT + CONTENT_WIDTH - 130, y: y - 14 }, end: { x: MARGIN_LEFT + CONTENT_WIDTH - 130, y: y - finH + 14 }, thickness: 1, color: COLOR_LIGHT_GRAY });
  page.drawText(sanitizeText('DESDE'), { x: MARGIN_LEFT + CONTENT_WIDTH - 110, y: y - 24, size: 7.5, font: fontBold, color: COLOR_FOOTER_MUTED });
  page.drawText(sanitizeText('10 años'), { x: MARGIN_LEFT + CONTENT_WIDTH - 110, y: y - 42, size: 15, font: fontBold, color: cBlue });

  y -= (finH + 26);

  // --- Doble garantía Enercity ----------------------------------------------
  y = drawSectionHeader(page, fontBold, fontRegular, 'Doble garantía Enercity', y);
  const garColW = (CONTENT_WIDTH - 14) / 2;
  const garH = 82;

  drawRoundedRect(page, { x: MARGIN_LEFT, y, width: garColW, height: garH, radius: 10, color: cBgCard, borderColor: cBorder, borderWidth: 1 });
  page.drawText(sanitizeText('INVERSIÓN PROTEGIDA'), { x: MARGIN_LEFT + 18, y: y - 22, size: 7.5, font: fontBold, color: cGreen });
  page.drawText(sanitizeText('Hasta 120 meses'), { x: MARGIN_LEFT + 18, y: y - 40, size: 13, font: fontBold, color: cBlue });
  const gar1Lines = wrapText(page, fontRegular, 'Enercity garantiza la instalación y los equipos hasta la recuperación total de tu inversión, con un máximo de 10 años.', garColW - 36).slice(0, 3);
  let g1y = y - 54;
  for (const line of gar1Lines) {
    page.drawText(sanitizeText(line), { x: MARGIN_LEFT + 18, y: g1y, size: 8, font: fontRegular, color: cText });
    g1y -= 10;
  }

  const gar2X = MARGIN_LEFT + garColW + 14;
  drawRoundedRect(page, { x: gar2X, y, width: garColW, height: garH, radius: 10, color: cBgCard, borderColor: cBorder, borderWidth: 1 });
  page.drawText(sanitizeText('GARANTÍA DE FÁBRICA'), { x: gar2X + 18, y: y - 22, size: 7.5, font: fontBold, color: cGreen });
  page.drawText(sanitizeText('12 a 25 años'), { x: gar2X + 18, y: y - 40, size: 13, font: fontBold, color: cBlue });
  const gar2Text = data.garantiaText && data.garantiaText.trim().length > 0
    ? data.garantiaText
    : 'Equipos respaldados directamente por sus fabricantes según componente, con gestión completa a cargo de Enercity.';
  const gar2Lines = wrapText(page, fontRegular, gar2Text, garColW - 36).slice(0, 3);
  let g2y = y - 54;
  for (const line of gar2Lines) {
    page.drawText(sanitizeText(line), { x: gar2X + 18, y: g2y, size: 8, font: fontRegular, color: cText });
    g2y -= 10;
  }

  y -= (garH + 26);

  // --- CTA card ---------------------------------------------------------
  const ctaH = 66;
  drawRoundedRect(page, { x: MARGIN_LEFT, y, width: CONTENT_WIDTH, height: ctaH, radius: 10, color: cBlue });
  page.drawText(sanitizeText('¿Avanzamos con tu proyecto?'), { x: MARGIN_LEFT + 22, y: y - 28, size: 14, font: fontBold, color: cWhite });
  page.drawText(sanitizeText('Coordinamos la visita técnica y entregamos el diseño definitivo en 48 horas.'), {
    x: MARGIN_LEFT + 22, y: y - 44, size: 9, font: fontRegular, color: cWhite, opacity: 0.72,
  });
  const ctaPhone = sanitizeText('+56 9 2902 8578');
  const ctaPhoneW = fontBold.widthOfTextAtSize(ctaPhone, 12);
  page.drawText(ctaPhone, { x: PAGE_WIDTH - MARGIN_RIGHT - 22 - ctaPhoneW, y: y - 26, size: 12, font: fontBold, color: cOrange });
  const ctaEmail = sanitizeText('ventas@enercity.cl');
  const ctaEmailW = fontRegular.widthOfTextAtSize(ctaEmail, 9);
  page.drawText(ctaEmail, { x: PAGE_WIDTH - MARGIN_RIGHT - 22 - ctaEmailW, y: y - 41, size: 9, font: fontRegular, color: cWhite, opacity: 0.85 });

  drawPageFooter(
    page, fontRegular,
    'Estimación basada en radiación de la comuna, tarifa eléctrica vigente y performance ratio de 0,75. Valores sujetos a visita técnica. Validez de la cotización: 15 días desde la emisión. Enercity SpA · Av. Pedro de Valdivia 273, of. 1611, Providencia, Santiago.',
    'Página 2 de 2',
    CONTENT_WIDTH * 0.78,
  );

  return await pdfDoc.save();
}
