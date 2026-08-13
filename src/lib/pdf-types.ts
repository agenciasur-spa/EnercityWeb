/**
 * PDFData interface — shared between client and server.
 * No server-only imports (fs, pdf-lib, etc.).
 */

export interface PDFData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  nuevaAddress?: string;
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
  numeroCotizacion?: string;
  // Dual pricing fields (PR 2)
  precioLista?: number; // strikethrough price
  precioTransferencia?: number; // highlighted price
  precioFinal?: number; // final price after factors
  factorTechoDisplay?: string; // "Teja asfáltica (x1.0)"
  factorMedidorDisplay?: string; // "Pegado a la pared (x1.0)"
  // Equipment cards for On-Grid PDF (PR 3)
  equipment?: EquipmentCard[];
  dispatchCost?: number; // Regional fixed dispatch cost (PR 3)
  batteryCost?: number; // Battery storage cost (PR 4)
  garantiaText?: string; // Admin-editable installation guarantee (PR 5)
  formasPago?: string[]; // Admin-editable payment methods
}

export interface EquipmentCard {
  tipo: 'inversor' | 'panel';
  nombre: string;
  marca: string;
  modelo?: string;
  potenciaWatts?: number;
  descripcion?: string;
  garantia?: string;
  imagenUrl?: string;
  fichaTecnicaUrl?: string;
}
