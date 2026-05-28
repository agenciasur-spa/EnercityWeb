import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function svgToPng(svgPath) {
  const svgBuffer = fs.readFileSync(svgPath);
  const pngBuffer = await sharp(svgBuffer)
    .resize(250, 90, { fit: 'contain' })
    .png()
    .toBuffer();
  return pngBuffer;
}

const COLOR_ENERCITY_BLUE = rgb(0.082, 0.275, 0.376); // #154660
const COLOR_ACCENT_ORANGE = rgb(0.941, 0.31, 0.016); // #F07E04
const COLOR_SUCCESS_GREEN = rgb(0.29, 0.686, 0.302); // #4AAF4D
const COLOR_BORDER_LIGHT = rgb(0.886, 0.91, 0.941); // #e2e8f0
const COLOR_TEXT_DARK = rgb(0.29, 0.333, 0.408); // #4a5568
const COLOR_TEXT_MEDIUM = rgb(0.443, 0.502, 0.588); // #718096
const COLOR_CARD_BG = rgb(0.973, 0.976, 0.98); // #f8fafc
const COLOR_WHITE = rgb(1.0, 1.0, 1.0);

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

async function main() {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Cargar logo SVG y convertir a PNG
  const logoPath = join(__dirname, '../../desing/logos/Enercity_logo_color.svg');
  const logoPngBytes = await svgToPng(logoPath);
  const logoImage = await pdfDoc.embedPng(logoPngBytes);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 50;

  // ========================================================================
  // 1. HEADER CON FONDO Y LOGO
  // ========================================================================
  const headerHeight = 70;

  // Fondo del header
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    color: COLOR_ENERCITY_BLUE,
  });

  // Logo
  const logoDims = logoImage.scale(0.15); // Ajusta escala
  page.drawImage(logoImage, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - headerHeight / 2 - logoDims.height / 2 + 10,
    width: logoDims.width,
    height: logoDims.height,
  });

  // Fecha
  const dateStr = '15 de enero de 2026';
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 10);
  page.drawText(dateStr, {
    x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
    y: PAGE_HEIGHT - headerHeight / 2 - 5,
    size: 10,
    font: fontRegular,
    color: COLOR_WHITE,
  });

  // Línea separadora naranja
  y = PAGE_HEIGHT - headerHeight;
  page.drawLine({
    start: { x: 0, y },
    end: { x: PAGE_WIDTH, y },
    thickness: 2,
    color: COLOR_ACCENT_ORANGE,
  });
  y -= 24;

  // ========================================================================
  // 2. CARD: CLIENTE (con bordes redondeados)
  // ========================================================================
  drawCard(page, y, 'Datos del Cliente', [
    ['Nombre: ', 'Juan Pérez'],
    ['Email: ', 'juan.perez@ejemplo.cl'],
    ['Teléfono: ', '+56 9 1234 5678'],
  ], fontBold, fontRegular);

  y -= 16;

  // ========================================================================
  // 3. CARD: SISTEMA
  // ========================================================================
  drawCard(page, y, 'Especificaciones del Sistema', [
    ['Kit: ', 'Kit 5kW Residencial Premium'],
    ['Potencia: ', '5.0 kWp'],
    ['Paneles: ', '12 paneles de 420W'],
    ['Tipo de techo: ', 'Teja'],
    ['Ubicación medidor: ', 'Exterior (Pared)'],
  ], fontBold, fontRegular);

  y -= 16;

  // ========================================================================
  // 4. CARD: PRECIO (Fondo naranja para destacar)
  // ========================================================================
  const cardHeight = 80;
  const cardY = y;
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: cardY - cardHeight,
    width: CONTENT_WIDTH,
    height: cardHeight,
    color: COLOR_ACCENT_ORANGE,
    borderColor: COLOR_ACCENT_ORANGE,
    borderWidth: 1,
    borderRadius: 12,
  });

  y = cardY - 20;
  page.drawText('Detalle de Precio', {
    x: MARGIN_LEFT + 20,
    y,
    size: 14,
    font: fontBold,
    color: COLOR_WHITE,
  });

  y -= 24;
  page.drawText('Precio total (con IVA): ', {
    x: MARGIN_LEFT + 20,
    y,
    size: 10,
    font: fontBold,
    color: COLOR_WHITE,
  });
  page.drawText('$2.500.000', {
    x: PAGE_WIDTH - MARGIN_RIGHT - 20 - fontBold.widthOfTextAtSize('$2.500.000', 10),
    y,
    size: 18,
    font: fontBold,
    color: COLOR_WHITE,
  });

  y = cardY - cardHeight - 16;

  // ========================================================================
  // 5. CARD: ROI (VERDES)
  // ========================================================================
  drawCard(page, y, 'Retorno de Inversión', [
    ['Ahorro mensual: ', '$31.600', true],
    ['Ahorro anual: ', '$380.000', true],
    ['Período de retorno: ', '5.5 años'],
    ['Cobertura energética: ', '85%'],
    ['Reducción CO2: ', '2.100 kg/año', true],
  ], fontBold, fontRegular);

  y -= 16;

  // ========================================================================
  // 6. DISCLAIMER
  // ========================================================================
  page.drawText('Nota Legal', {
    x: MARGIN_LEFT,
    y: y - 20,
    size: 14,
    font: fontBold,
    color: COLOR_ENERCITY_BLUE,
  });

  y -= 40;
  const disclaimerText = 'Esta cotización tiene carácter informativo y es válida por 30 días desde la fecha de emisión.';
  page.drawText(disclaimerText, {
    x: MARGIN_LEFT,
    y,
    size: 8,
    font: fontRegular,
    color: COLOR_TEXT_MEDIUM,
  });

  // ========================================================================
  // 7. FOOTER
  // ========================================================================
  y = 80;
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 0.5,
    color: COLOR_BORDER_LIGHT,
  });
  y -= 16;

  page.drawText('Enercity  |  contacto@enercity.cl  |  www.enercity.cl', {
    x: MARGIN_LEFT,
    y,
    size: 9,
    font: fontRegular,
    color: COLOR_TEXT_MEDIUM,
  });

  // Save
  const pdfBytes = await pdfDoc.save();
  const outputPath = join(__dirname, '../../test-pdf-with-cards-logo.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`✅ PDF generado: ${outputPath}`);
}

function drawCard(page, y, title, rows, fontBold, fontRegular) {
  const rowHeight = 16;
  const padding = 16;
  const cardHeight = 30 + (rows.length * rowHeight) + (padding * 2);

  // Fondo del card
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - cardHeight,
    width: CONTENT_WIDTH,
    height: cardHeight,
    color: COLOR_CARD_BG,
    borderColor: COLOR_BORDER_LIGHT,
    borderWidth: 1,
    borderRadius: 12,
  });

  // Título
  page.drawText(title, {
    x: MARGIN_LEFT + padding,
    y: y - padding,
    size: 14,
    font: fontBold,
    color: COLOR_ENERCITY_BLUE,
  });

  y -= padding + 20;

  // Filas
  rows.forEach(([label, value, isGreen]) => {
    page.drawText(label, {
      x: MARGIN_LEFT + padding,
      y,
      size: 10,
      font: fontBold,
      color: COLOR_TEXT_MEDIUM,
    });

    const valueWidth = fontRegular.widthOfTextAtSize(value, 10);
    page.drawText(value, {
      x: PAGE_WIDTH - MARGIN_RIGHT - padding - valueWidth,
      y,
      size: 10,
      font: fontRegular,
      color: isGreen ? COLOR_SUCCESS_GREEN : COLOR_TEXT_DARK,
    });

    y -= rowHeight;
  });
}

main().catch(console.error);