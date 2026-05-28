import { generatePDF } from '../lib/pdfGenerator.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dummyData = {
  customerName: 'Juan Pérez',
  customerEmail: 'juan.perez@ejemplo.cl',
  customerPhone: '+56 9 1234 5678',
  customerAddress: 'Av. Providencia 1234, Depto 502',
  kitName: 'Kit 5kW Residencial Premium',
  kitPower: '5.0 kWp',
  panelCount: 12,
  panelWattage: 420,
  roofType: 'Teja',
  meterLocation: 'Exterior (Pared)',
  comunaName: 'Providencia',
  regionName: 'Región Metropolitana',
  monthlyBill: 45000,
  annualSavings: 380000,
  monthlySavings: 31600,
  systemPrice: 2500000,
  systemPriceNoIva: 2100840,
  paybackYears: 5.5,
  coveragePercent: 85,
  co2Reduction: 2100,
  investmentClassification: 'ALTA_RETORNO',
  roi25Years: 9500000,
  quoteDate: new Date().toISOString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

async function main() {
  try {
    console.log('🔄 Generando PDF de prueba...');
    const pdfBytes = await generatePDF(dummyData);

    const outputPath = join(__dirname, '../../test-diagnostic-new-colors.pdf');
    fs.writeFileSync(outputPath, pdfBytes);

    console.log(`✅ PDF generado exitosamente en: ${outputPath}`);
    console.log('📂 Abre el archivo para revisar los nuevos colores.');
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
  }
}

main();