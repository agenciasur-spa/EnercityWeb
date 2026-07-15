import type { PDFData } from '../pdf-types';

interface PricingDisplay {
  precioLista: number;
  precioTransferencia: number;
  precioFinal: number;
  hasDualPricing: boolean;
  techoDisplay: string;
  medidorDisplay: string;
}

export function buildPricingDisplay(result: any): PricingDisplay {
  const precioLista = result?.precio_lista ?? result?.calculo?.precioBase ?? 0;
  const precioTransferencia = result?.precio_transferencia ?? result?.calculo?.precioBase ?? 0;
  const precioFinal = result?.precio_final ?? result?.calculo?.precioFinalIva ?? result?.calculo?.precioFinal ?? 0;

  const hasDualPricing =
    (result?.precio_lista != null || result?.precio_transferencia != null) &&
    (precioLista !== precioTransferencia || precioTransferencia !== precioFinal);

  const techoDisplay = result?.factors?.techo_nombre
    ? `${result.factors.techo_nombre} (x${result.factors.techo_factor})`
    : '';
  const medidorDisplay = result?.factors?.medidor_nombre
    ? `${result.factors.medidor_nombre} (x${result.factors.medidor_factor})`
    : '';

  return {
    precioLista,
    precioTransferencia,
    precioFinal,
    hasDualPricing,
    techoDisplay,
    medidorDisplay,
  };
}

export function buildPdfDataFromResult(
  result: any,
  formData: any,
  comunas: Array<{ id: number; nombre: string; activa: boolean; radiacion_ghi?: string; tarifa_est?: string }>
): PDFData {
  const kit = result?.kit;
  const calculo = result?.calculo;
  const resumen = result?.resumenInversion;
  const datosComuna = result?.datosComuna;
  const pricing = buildPricingDisplay(result);

  if (!kit || !calculo || !resumen) {
    // Return minimal data so callers can handle gracefully
    return {
      customerName: formData.nombre ?? '',
      customerEmail: formData.email ?? '',
      customerPhone: formData.telefono ?? '',
      kitName: '',
      kitPower: '',
      panelCount: 0,
      panelWattage: 0,
      roofType: '',
      meterLocation: '',
      comunaName: datosComuna?.nombre ?? comunas.find((c) => c.id === formData.comunaId)?.nombre ?? '',
      regionName: datosComuna?.region,
      monthlyBill: formData.montoBoleta ?? 0,
      annualSavings: 0,
      monthlySavings: 0,
      systemPrice: 0,
      systemPriceNoIva: 0,
      paybackYears: 0,
      coveragePercent: 0,
      co2Reduction: 0,
      investmentClassification: '',
      roi25Years: 0,
      quoteDate: new Date().toISOString(),
      precioLista: pricing.precioLista || undefined,
      precioTransferencia: pricing.precioTransferencia || undefined,
      precioFinal: pricing.precioFinal || undefined,
      factorTechoDisplay: pricing.techoDisplay || '',
      factorMedidorDisplay: pricing.medidorDisplay || '',
    };
  }

  const panelWattage = kit.paneles > 0 ? Math.round((kit.potenciaTotalSistema * 1000) / kit.paneles) : 0;

  return {
    customerName: formData.nombre ?? '',
    customerEmail: formData.email ?? '',
    customerPhone: formData.telefono ?? '',
    kitName: `Kit ${kit.potenciaTotalSistema} kWP — ${kit.paneles} paneles`,
    kitPower: `${kit.potenciaTotalSistema} kWP`,
    panelCount: kit.paneles,
    panelWattage,
    roofType: result?.factors?.techo_nombre ?? '',
    meterLocation: result?.factors?.medidor_nombre ?? '',
    comunaName: datosComuna?.nombre ?? comunas.find((c) => c.id === formData.comunaId)?.nombre ?? '',
    regionName: datosComuna?.region,
    monthlyBill: formData.montoBoleta ?? 0,
    annualSavings: resumen.ahorroAnual ?? 0,
    monthlySavings: resumen.ahorroMensual ?? 0,
    systemPrice: pricing.precioFinal || calculo.precioFinalIva || 0,
    systemPriceNoIva: pricing.precioFinal || calculo.precioSinIva || 0,
    paybackYears: resumen.anosRecuperacion ?? 0,
    coveragePercent: resumen.cobertura ?? 0,
    co2Reduction: Math.round((calculo.generacionAnualKwh ?? 0) * 0.5),
    investmentClassification: resumen.clasificacion ?? '',
    roi25Years: (resumen.ahorroAnual ?? 0) * 25,
    quoteDate: new Date().toISOString(),
      precioLista: pricing.precioLista || undefined,
      precioTransferencia: pricing.precioTransferencia || undefined,
      precioFinal: pricing.precioFinal || undefined,
      factorTechoDisplay: pricing.techoDisplay || '',
      factorMedidorDisplay: pricing.medidorDisplay || '',
  };
}
