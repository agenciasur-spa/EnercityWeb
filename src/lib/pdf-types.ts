/**
 * PDFData interface — shared between client and server.
 * No server-only imports (fs, pdf-lib, etc.).
 */

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
  // Dual pricing fields (PR 2)
  precioLista?: number; // strikethrough price
  precioTransferencia?: number; // highlighted price
  precioFinal?: number; // final price after factors
  factorTechoDisplay?: string; // "Teja asfáltica (x1.0)"
  factorMedidorDisplay?: string; // "Pegado a la pared (x1.0)"
}
