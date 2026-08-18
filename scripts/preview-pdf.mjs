// Quick local preview of the quote PDF template — generates a PDF from mock
// data (no DB/network needed) so layout/spacing changes can be eyeballed fast.
//
// Usage:
//   npm run pdf:preview                 → hybrid quote (battery + dual pricing)
//   npm run pdf:preview -- --ongrid     → on-grid only (2 equipment cards, single price)
//   npm run pdf:preview -- --open       → also opens the PDF (macOS `open`)
//
// Output goes to .pdf-preview/quote.pdf (+ page PNGs if `pdftoppm` is on PATH).

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { generatePDF } from '../src/lib/pdfGenerator_new.ts';

const args = process.argv.slice(2);
const variant = args.includes('--ongrid') ? 'ongrid' : 'hybrid';
const shouldOpen = args.includes('--open');

const BASE_DATA = {
  customerName: 'Cristian Briones',
  customerEmail: 'cristian.briones@example.com',
  customerPhone: '912345678',
  kitName: 'Kit 4.88 kWP — 8 paneles',
  kitPower: '4,88 kWp',
  panelCount: 8,
  panelWattage: 610,
  roofType: 'Teja asfáltica',
  meterLocation: 'Pegado a la pared',
  comunaName: 'Rancagua',
  regionName: "Región del Libertador General Bernardo O'Higgins",
  monthlyBill: 100000,
  annualSavings: 1200000,
  monthlySavings: 100000,
  paybackYears: 8.8,
  coveragePercent: 91,
  co2Reduction: 3416, // generación anual real = co2Reduction * 2, ver pdfGenerator_new.ts
  investmentClassification: 'MEDIO_RETORNO',
  roi25Years: 30000000,
  quoteDate: new Date('2026-08-17').toISOString(),
  numeroCotizacion: '2026-0029',
  garantiaText: '',
};

const VARIANTS = {
  hybrid: {
    ...BASE_DATA,
    systemPrice: 10021399,
    systemPriceNoIva: 8421344,
    precioLista: 10548841,
    precioTransferencia: 10021399,
    precioFinal: 10021399,
    dispatchCost: 50000,
    batteryCost: 2500000,
    equipment: [
      { tipo: 'panel', nombre: 'Trina Solar 610 W', marca: 'Trina Solar', modelo: '610 W', descripcion: 'Garantía de fábrica 25 años de rendimiento', fichaTecnicaUrl: 'https://example.com/panel.pdf' },
      { tipo: 'inversor', nombre: 'GoodWe 5 kW', marca: 'GoodWe', modelo: '5 kW', descripcion: 'Monitoreo remoto desde la app · 10 años', fichaTecnicaUrl: 'https://example.com/inversor.pdf' },
      { tipo: 'bateria', nombre: 'Batería Powerwall 15kWh', marca: 'Tesla', descripcion: 'Energía disponible ante cortes de suministro' },
    ],
  },
  ongrid: {
    ...BASE_DATA,
    kitPower: '3,5 kWp',
    panelCount: 6,
    panelWattage: 585,
    systemPrice: 6500000,
    systemPriceNoIva: 5462184,
    dispatchCost: 0,
    batteryCost: 0,
    equipment: [
      { tipo: 'panel', nombre: 'Trina Solar 585 W', marca: 'Trina Solar', modelo: '585 W', descripcion: 'Garantía de fábrica 25 años' },
      { tipo: 'inversor', nombre: 'GoodWe 3.5 kW', marca: 'GoodWe', modelo: '3.5 kW', descripcion: 'Monitoreo remoto desde la app' },
    ],
  },
};

const data = VARIANTS[variant];

mkdirSync('.pdf-preview', { recursive: true });
const pdfPath = '.pdf-preview/quote.pdf';

const bytes = await generatePDF(data);
writeFileSync(pdfPath, bytes);
console.log(`✓ PDF generado (variante "${variant}"): ${pdfPath} (${bytes.length} bytes)`);

try {
  execFileSync('pdftoppm', ['-png', '-r', '150', pdfPath, '.pdf-preview/page'], { stdio: 'ignore' });
  console.log('✓ Páginas renderizadas: .pdf-preview/page-1.png, .pdf-preview/page-2.png');
} catch {
  console.log('  (pdftoppm no encontrado — instalá poppler con `brew install poppler` para previsualizar como imagen)');
}

if (shouldOpen) {
  try {
    execFileSync('open', [pdfPath]);
  } catch {
    console.log(`  No pude abrir el PDF automáticamente. Abrilo manualmente: ${pdfPath}`);
  }
}
