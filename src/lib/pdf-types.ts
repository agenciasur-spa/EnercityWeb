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
}
