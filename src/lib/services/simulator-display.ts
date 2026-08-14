import type { PDFData, EquipmentCard } from '../pdf-types';
import type { EquipmentDetail } from '../../types/simulation';
import { findActiveEquipmentByType, buildEquipmentCard } from './equipment-catalog';

interface PricingDisplay {
  precioLista: number;
  precioTransferencia: number;
  precioFinal: number;
  hasDualPricing: boolean;
  techoDisplay: string;
  medidorDisplay: string;
  batteryCost?: number;
}

export function buildPricingDisplay(result: any): PricingDisplay {
  // precio_lista ya incluye factores + despacho (ver calculate-quote.ts).
  // calculo.precioFinalIva es el monto total a pagar: kit × factores + despacho + batería.
  // OJO: result.precio_transferencia viene "limpio" de despacho/batería desde el
  // backend — no restarlo de nuevo acá (bug histórico que corrompía el monto
  // cuando se agregaba batería).
  const precioLista = result?.precio_lista ?? 0;
  const precioFinal = result?.calculo?.precioFinalIva ?? result?.precio_transferencia ?? 0;
  const precioTransferencia = precioFinal;

  const dispatchCost = result?.dispatch_cost || result?.datosComuna?.dispatchCost || 0;
  const batteryCost = result?.battery_cost || 0;

  const hasDualPricing = precioLista > 0 && precioLista !== precioTransferencia;

  const techoDisplay = result?.factors?.techo_nombre
    ? `${result.factors.techo_nombre}`
    : '';
  const medidorDisplay = result?.factors?.medidor_nombre
    ? `${result.factors.medidor_nombre}`
    : '';

  return {
    precioLista,
    precioTransferencia,
    precioFinal,
    hasDualPricing,
    techoDisplay,
    medidorDisplay,
    batteryCost,
  };
}

export function buildPdfDataFromResult(
  result: any,
  formData: any,
  comunas: Array<{ id: number; nombre: string; activa: boolean; radiacion_ghi?: string; tarifa_est?: string }>,
  equipmentCatalog: EquipmentDetail[] = []
): PDFData {
  const kit = result?.kit;
  const calculo = result?.calculo;
  const resumen = result?.resumenInversion;
  const datosComuna = result?.datosComuna;
  const pricing = buildPricingDisplay(result);
  const dispatchCost = datosComuna?.dispatchCost || result?.dispatch_cost || 0;
  const garantiaText = result?.garantia_text || '';
  const formasPago = Array.isArray(result?.formas_pago) ? result.formas_pago : [];
  const numeroCotizacion = result?.numero_cotizacion || '';
  const batteryCost = pricing.batteryCost || 0;

  const activeInverter = findActiveEquipmentByType(equipmentCatalog, 'inversor');
  const activePanel = findActiveEquipmentByType(equipmentCatalog, 'panel');
  const activeBattery = findActiveEquipmentByType(equipmentCatalog, 'bateria');

  // Build equipment cards (inverter + panels) with catalog data
  const equipment: EquipmentCard[] = [];
  if (kit) {
    const inverterCard = buildEquipmentCard(
      activeInverter,
      'inversor',
      {
        nombre: 'Inversor',
        marca: 'GOODWE',
        modelo: kit.inversorKw ? `${kit.inversorKw}kW` : undefined,
        potenciaWatts: kit.inversorKw ? kit.inversorKw * 1000 : undefined,
      }
    );

    equipment.push({
      tipo: inverterCard.tipo,
      nombre: inverterCard.nombre,
      marca: inverterCard.marca,
      modelo: inverterCard.modelo,
      potenciaWatts: inverterCard.potenciaWatts,
      imagenUrl: inverterCard.imagenUrl,
      fichaTecnicaUrl: inverterCard.fichaTecnicaUrl,
    });

    const panelCard = buildEquipmentCard(
      activePanel,
      'panel',
      {
        nombre: 'Panel Solar',
        marca: 'TRINA SOLAR',
        modelo: kit.paneles ? `${kit.paneles}x${kit.potenciaPanel || 410}W` : undefined,
        potenciaWatts: kit.potenciaPanel,
      }
    );

    equipment.push({
      tipo: panelCard.tipo,
      nombre: panelCard.nombre,
      marca: panelCard.marca,
      modelo: panelCard.modelo,
      potenciaWatts: panelCard.potenciaWatts,
      imagenUrl: panelCard.imagenUrl,
      fichaTecnicaUrl: panelCard.fichaTecnicaUrl,
    });

    // Sistema híbrido: si se agregó batería, sumar una tercera card al PDF.
    if (batteryCost > 0) {
      const batteryCard = buildEquipmentCard(
        activeBattery,
        'bateria',
        { nombre: 'Batería de Respaldo', marca: 'ENERCITY' }
      );

      equipment.push({
        tipo: batteryCard.tipo,
        nombre: batteryCard.nombre,
        marca: batteryCard.marca,
        modelo: batteryCard.modelo,
        potenciaWatts: batteryCard.potenciaWatts,
        imagenUrl: batteryCard.imagenUrl,
        fichaTecnicaUrl: batteryCard.fichaTecnicaUrl,
      });
    }
  }

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
      precioLista: pricing.precioLista > 0 ? pricing.precioLista : undefined,
      precioTransferencia: pricing.precioTransferencia > 0 ? pricing.precioTransferencia : undefined,
      precioFinal: pricing.precioFinal > 0 ? pricing.precioFinal : undefined,
      factorTechoDisplay: pricing.techoDisplay || '',
      factorMedidorDisplay: pricing.medidorDisplay || '',
      equipment,
      dispatchCost,
      batteryCost,
      garantiaText,
      formasPago,
      numeroCotizacion,
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
        precioLista: pricing.precioLista > 0 ? pricing.precioLista : undefined,
        precioTransferencia: pricing.precioTransferencia > 0 ? pricing.precioTransferencia : undefined,
        precioFinal: pricing.precioFinal > 0 ? pricing.precioFinal : undefined,
        factorTechoDisplay: pricing.techoDisplay || '',
      factorMedidorDisplay: pricing.medidorDisplay || '',
      equipment,
      dispatchCost,
      batteryCost,
      garantiaText,
      formasPago,
      numeroCotizacion,
  };
}
