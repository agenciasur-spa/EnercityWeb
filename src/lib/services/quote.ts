import type { Kit } from '../types/simulation';

export type RoofType = 'Losa' | 'Zinc/Pizarreño' | 'Teja Chilena' | 'Teja Asfáltica' | 'Teja Colonial' | 'Industrial' | 'Otro';
export type MeterType = 'Muro de la casa' | 'Reja' | 'Fuera de la casa (Poste)';
export type QuoteStatus = 'OK' | 'NO_VIABLE' | 'EJECUTIVO' | 'ERROR';
export type ROIClassification = 'ALTA_RETORNO' | 'MEDIO_RETORNO' | 'BAJA_RETORNO';

export interface QuoteInput {
  montoBoleta: number;
  comunaId: number;
  tipoTecho: RoofType;
  tipoMedidor: MeterType;
}

export interface ComunaData {
  id: number;
  nombre: string;
  region: string;
  radiacionGhi: number;
  tarifaEst: number;
  dispatchCost?: number;
}

export interface KitData {
  id: string;
  consumoBruto: number;
  inversorKw: number;
  paneles: number;
  kwp: number;
  precioNetoBase: number;
}

export interface PriceBreakdown {
  precioBase: number;
  factorTecho: number;
  recargoTecho: number;
  costoMedidor: number;
  precioSinIva: number;
  iva: number;
  precioFinal: number;
}

export interface ROICalculation {
  consumoKwhAnual: number;
  generacionAnualKwh: number;
  ahorroAnual: number;
  ahorroMensual: number;
  coberturaPorcentaje: number;
  paybackAnos: number;
}

export interface InvestmentSummary {
  ahorroMensual: number;
  ahorroAnual: number;
  inversionTotal: number;
  anosRecuperacion: number;
  cobertura: number;
  clasificacion: ROIClassification;
}

export interface QuoteResult {
  estado: QuoteStatus;
  mensaje: string | null;
  input: QuoteInput;
  datosComuna?: ComunaData;
  kit?: KitData;
  calculo?: PriceBreakdown & ROICalculation;
  resumenInversion?: InvestmentSummary;
}

export interface QuoteSettings {
  limiteInferior: number;
  limiteSuperior: number;
  factorTeja: number;
  factorZincPizarreño: number;
  factorTejaAsfaltica: number;
  factorTejaColonial: number;
  factorIndustrial: number;
  costoMedidorReja: number;
  costoMedidorPoste: number;
  iva: number;
  performanceRatio: number;
}

const FACTOR_TEJA_CHILENA = 1.14;
const FACTOR_ZINC_PIZARREÑO = 1.07;
const FACTOR_TEJA_ASFALTICA = 1.05;
const FACTOR_TEJA_COLONIAL = 1.12;
const FACTOR_INDUSTRIAL = 1.10;
const COSTO_FIJO_MEDIDOR_REJA = 350000;
const COSTO_FIJO_MEDIDOR_POSTE = 550000;
const IVA = 1.19;
const LIMITE_INFERIOR = 50000;
const LIMITE_SUPERIOR = 230000;
const PERFORMANCE_RATIO = 0.75;

export function getDefaultSettings(): QuoteSettings {
  return {
    limiteInferior: LIMITE_INFERIOR,
    limiteSuperior: LIMITE_SUPERIOR,
    factorTeja: FACTOR_TEJA_CHILENA,
    factorZincPizarreño: FACTOR_ZINC_PIZARREÑO,
    factorTejaAsfaltica: FACTOR_TEJA_ASFALTICA,
    factorTejaColonial: FACTOR_TEJA_COLONIAL,
    factorIndustrial: FACTOR_INDUSTRIAL,
    costoMedidorReja: COSTO_FIJO_MEDIDOR_REJA,
    costoMedidorPoste: COSTO_FIJO_MEDIDOR_POSTE,
    iva: IVA,
    performanceRatio: PERFORMANCE_RATIO,
  };
}

export function classifyInvestment(paybackYears: number): ROIClassification {
  if (paybackYears <= 5) return 'ALTA_RETORNO';
  if (paybackYears <= 10) return 'MEDIO_RETORNO';
  return 'BAJA_RETORNO';
}

export function calculateRoofFactor(tipoTecho: RoofType, settings: QuoteSettings): { factorTecho: number; recargoTecho: number } {
  let factorTecho: number = 1;
  let recargoTecho = 0;

  switch (tipoTecho) {
    case 'Zinc/Pizarreño':
      factorTecho = settings.factorZincPizarreño;
      break;
    case 'Teja Chilena':
      factorTecho = settings.factorTeja;
      break;
    case 'Teja Asfáltica':
      factorTecho = settings.factorTejaAsfaltica;
      break;
    case 'Teja Colonial':
      factorTecho = settings.factorTejaColonial;
      break;
    case 'Industrial':
      factorTecho = settings.factorIndustrial;
      break;
  }

  return { factorTecho, recargoTecho };
}

export function calculateMeterCost(tipoMedidor: MeterType, settings: QuoteSettings): number {
  if (tipoMedidor === 'Reja') {
    return settings.costoMedidorReja;
  } else if (tipoMedidor === 'Fuera de la casa (Poste)') {
    return settings.costoMedidorPoste;
  }
  return 0;
}

export function findBestKit(kits: Kit[], montoBoleta: number): Kit | null {
  if (montoBoleta < LIMITE_INFERIOR) {
    return null;
  }

  if (montoBoleta > LIMITE_SUPERIOR) {
    return null;
  }

  const sortedKits = [...kits].sort((a, b) => b.consumoBruto - a.consumoBruto);

  for (const kit of sortedKits) {
    if (kit.consumoBruto <= montoBoleta) {
      return kit;
    }
  }

  return null;
}

export function calculatePriceBreakdown(
  precioBase: number,
  factorTecho: number,
  recargoTecho: number,
  costoMedidor: number,
  iva: number
): PriceBreakdown {
  const precioSinIva = (precioBase * factorTecho) + recargoTecho + costoMedidor;
  const precioFinal = Math.round(precioSinIva * iva);

  return {
    precioBase,
    factorTecho,
    recargoTecho,
    costoMedidor,
    precioSinIva,
    iva: Math.round(precioSinIva * (iva - 1)),
    precioFinal,
  };
}

export function calculateROI(
  montoBoleta: number,
  kwp: number,
  precioFinal: number,
  radiacionGhi: number,
  tarifaEst: number,
  performanceRatio: number,
  dispatchCost: number = 0
): ROICalculation {
  const consumoKwhAnual = (montoBoleta / tarifaEst) * 12;
  const generacionAnualKwh = kwp * radiacionGhi * 365 * performanceRatio;
  const ahorroAnual = Math.min(generacionAnualKwh, consumoKwhAnual) * tarifaEst;
  const ahorroMensual = ahorroAnual / 12;
  const coberturaPorcentaje = Math.min((generacionAnualKwh / consumoKwhAnual) * 100, 95);

  const totalInversion = precioFinal + dispatchCost;
  const paybackAnos = ahorroAnual > 0 ? totalInversion / ahorroAnual : 999;

  return {
    consumoKwhAnual: Math.round(consumoKwhAnual),
    generacionAnualKwh: Math.round(generacionAnualKwh),
    ahorroAnual: Math.round(ahorroAnual),
    ahorroMensual: Math.round(ahorroMensual),
    coberturaPorcentaje: Math.round(coberturaPorcentaje * 10) / 10,
    paybackAnos: Math.round(paybackAnos * 10) / 10,
  };
}

export async function calculateQuote(
  input: QuoteInput,
  kits: Kit[],
  settings: QuoteSettings
): Promise<QuoteResult> {
  const { montoBoleta, tipoTecho, tipoMedidor } = input;

  if (montoBoleta < settings.limiteInferior) {
    return {
      estado: 'NO_VIABLE',
      mensaje: `El monto mínimo para un sistema solar es de $${settings.limiteInferior.toLocaleString('es-CL')}. Contáctanos para otras opciones.`,
      input,
    };
  }

  if (montoBoleta > settings.limiteSuperior) {
    return {
      estado: 'EJECUTIVO',
      mensaje: 'Tu consumo es alto. Un ejecutivo te contactará para personalizar tu solución.',
      input,
    };
  }

  const kit = findBestKit(kits, montoBoleta);

  if (!kit) {
    return {
      estado: 'ERROR',
      mensaje: 'No se encontró un kit compatible.',
      input,
    };
  }

  const precioBase = kit.precioNetoBase;
  const kwp = kit.kwp;

  const { factorTecho, recargoTecho } = calculateRoofFactor(tipoTecho, settings);
  const costoMedidor = calculateMeterCost(tipoMedidor, settings);

  const priceBreakdown = calculatePriceBreakdown(
    precioBase,
    factorTecho,
    recargoTecho,
    costoMedidor,
    settings.iva
  );

  return {
    estado: 'OK',
    mensaje: null,
    input,
    kit: {
      id: kit.id,
      consumoBruto: kit.consumoBruto,
      inversorKw: kit.inversorKw,
      paneles: kit.paneles,
      kwp,
      precioNetoBase: kit.precioNetoBase,
    },
    calculo: {
      ...priceBreakdown,
      consumoKwhAnual: 0,
      generacionAnualKwh: 0,
      ahorroAnual: 0,
      ahorroMensual: 0,
      coberturaPorcentaje: 0,
      paybackAnos: 0,
    },
  };
}

export function calculateQuoteWithROI(
  input: QuoteInput,
  kits: Kit[],
  settings: QuoteSettings,
  comuna: ComunaData
): QuoteResult {
  const { montoBoleta, tipoTecho, tipoMedidor } = input;
  const { radiacionGhi, tarifaEst, dispatchCost = 0 } = comuna;

  if (montoBoleta < settings.limiteInferior) {
    return {
      estado: 'NO_VIABLE',
      mensaje: `El monto mínimo para un sistema solar es de $${settings.limiteInferior.toLocaleString('es-CL')}. Contáctanos para otras opciones.`,
      input,
    };
  }

  if (montoBoleta > settings.limiteSuperior) {
    return {
      estado: 'EJECUTIVO',
      mensaje: 'Tu consumo es alto. Un ejecutivo te contactará para personalizar tu solución.',
      input,
    };
  }

  const kit = findBestKit(kits, montoBoleta);

  if (!kit) {
    return {
      estado: 'ERROR',
      mensaje: 'No se encontró un kit compatible.',
      input,
    };
  }

  const precioBase = kit.precioNetoBase;
  const kwp = kit.kwp;

  const { factorTecho, recargoTecho } = calculateRoofFactor(tipoTecho, settings);
  const costoMedidor = calculateMeterCost(tipoMedidor, settings);

  const priceBreakdown = calculatePriceBreakdown(
    precioBase,
    factorTecho,
    recargoTecho,
    costoMedidor,
    settings.iva
  );

  const roi = calculateROI(
    montoBoleta,
    kwp,
    priceBreakdown.precioFinal,
    radiacionGhi,
    tarifaEst,
    settings.performanceRatio,
    dispatchCost
  );

  const clasificacion = classifyInvestment(roi.paybackAnos);

  return {
    estado: 'OK',
    mensaje: null,
    input,
    datosComuna: comuna,
    kit: {
      id: kit.id,
      consumoBruto: kit.consumoBruto,
      inversorKw: kit.inversorKw,
      paneles: kit.paneles,
      kwp,
      precioNetoBase: kit.precioNetoBase,
    },
    calculo: {
      ...priceBreakdown,
      ...roi,
    },
    resumenInversion: {
      ahorroMensual: roi.ahorroMensual,
      ahorroAnual: roi.ahorroAnual,
      inversionTotal: priceBreakdown.precioFinal + dispatchCost,
      anosRecuperacion: roi.paybackAnos,
      cobertura: roi.coberturaPorcentaje,
      clasificacion,
    },
  };
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}