import { describe, it, expect } from 'vitest';
import { buildPricingDisplay, buildPdfDataFromResult } from './simulator-display';
import type { PDFData } from '../pdf-types';

// New API response shape
function makeQuoteResult(overrides: any = {}) {
  return {
    estado: 'OK',
    mensaje: undefined,
    kit: {
      id: 4,
      paneles: 10,
      potenciaTotalSistema: 5.5,
      inversorKw: 4.0,
      generacionAnual: 7500,
      rangoDesde: 70000,
      rangoHasta: 90000,
    },
    precio_lista: 5166937,
    precio_transferencia: 4650243,
    precio_final: 5300243,
    factors: {
      techo_nombre: 'Teja Chilena',
      techo_factor: 1.14,
      medidor_nombre: 'Reja',
      medidor_factor: 1.05,
    },
    roi: {
      ahorro_mensual: 62000,
      ahorro_anual: 744000,
      payback_years: 7.1,
      cobertura_porcentaje: 85.5,
    },
    // Backward compat fields
    calculo: {
      precioBase: 4650243,
      factorTecho: 1.14,
      recargoTecho: 0,
      costoMedidor: 0,
      precioSinIva: 5300243,
      iva: 0,
      precioFinal: 5300243,
      precioFinalIva: 5300243,
      consumoKwhAnual: 4000,
      generacionAnualKwh: 7500,
      ahorroAnual: 744000,
      ahorroMensual: 62000,
      coberturaPorcentaje: 85.5,
      paybackAnos: 7.1,
    },
    resumenInversion: {
      ahorroMensual: 62000,
      ahorroAnual: 744000,
      inversionTotal: 5300243,
      anosRecuperacion: 7.1,
      cobertura: 85.5,
      clasificacion: 'MEDIO_RETORNO',
    },
    datosComuna: {
      id: 1,
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacionGhi: 5.0,
      tarifaEst: 150,
    },
    ...overrides,
  };
}

describe('buildPricingDisplay', () => {
  it('returns dual pricing from new response fields', () => {
    const result = makeQuoteResult();
    const display = buildPricingDisplay(result);

    expect(display.precioLista).toBe(5166937);
    expect(display.precioTransferencia).toBe(4650243);
    expect(display.precioFinal).toBe(5300243);
    expect(display.hasDualPricing).toBe(true);
  });

  it('detects when all prices are the same (no dual pricing)', () => {
    const result = makeQuoteResult({
      precio_lista: 4650243,
      precio_transferencia: 4650243,
      precio_final: 4650243,
    });
    const display = buildPricingDisplay(result);

    expect(display.hasDualPricing).toBe(false);
    expect(display.precioLista).toBe(4650243);
  });

  it('falls back to backward compat calculo fields when new fields missing', () => {
    const result = makeQuoteResult();
    delete (result as any).precio_lista;
    delete (result as any).precio_transferencia;

    const display = buildPricingDisplay(result);

    expect(display.precioFinal).toBe(5300243);
    expect(display.hasDualPricing).toBe(false);
  });

  it('includes factor display strings', () => {
    const result = makeQuoteResult();
    const display = buildPricingDisplay(result);

    expect(display.techoDisplay).toBe('Teja Chilena (x1.14)');
    expect(display.medidorDisplay).toBe('Reja (x1.05)');
  });

  it('returns empty factors when factors field is missing', () => {
    const result = makeQuoteResult();
    delete (result as any).factors;
    const display = buildPricingDisplay(result);

    expect(display.techoDisplay).toBe('');
    expect(display.medidorDisplay).toBe('');
  });
});

describe('buildPdfDataFromResult', () => {
  const formData = {
    comunaId: 1,
    montoBoleta: 80000,
    techoId: 2,
    medidorId: 2,
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    telefono: '912345678',
    website: '',
  };

  const comunas = [{ id: 1, nombre: 'Santiago', activa: true, radiacion_ghi: '5.0', tarifa_est: '150' }];

  it('maps new dual pricing fields to PDFData', () => {
    const result = makeQuoteResult();
    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    expect(pdf.precioLista).toBe(5166937);
    expect(pdf.precioTransferencia).toBe(4650243);
    expect(pdf.precioFinal).toBe(5300243);
    expect(pdf.factorTechoDisplay).toBe('Teja Chilena (x1.14)');
    expect(pdf.factorMedidorDisplay).toBe('Reja (x1.05)');
  });

  it('preserves all existing PDFData fields', () => {
    const result = makeQuoteResult();
    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    expect(pdf.customerName).toBe('Juan Pérez');
    expect(pdf.customerEmail).toBe('juan@example.com');
    expect(pdf.customerPhone).toBe('912345678');
    expect(pdf.kitName).toBe('Kit 5.5 kWP — 10 paneles');
    expect(pdf.kitPower).toBe('5.5 kWP');
    expect(pdf.panelCount).toBe(10);
    expect(pdf.comunaName).toBe('Santiago');
    expect(pdf.monthlyBill).toBe(80000);
    expect(pdf.annualSavings).toBe(744000);
    expect(pdf.monthlySavings).toBe(62000);
    expect(pdf.systemPrice).toBe(5300243);
    expect(pdf.systemPriceNoIva).toBe(5300243);
    expect(pdf.paybackYears).toBe(7.1);
    expect(pdf.coveragePercent).toBe(85.5);
    expect(pdf.co2Reduction).toBe(3750); // 7500 * 0.5
    expect(pdf.investmentClassification).toBe('MEDIO_RETORNO');
    expect(pdf.roi25Years).toBe(18600000); // 744000 * 25
  });

  it('falls back to calculo fields when new fields missing', () => {
    const result = makeQuoteResult();
    delete (result as any).precio_lista;
    delete (result as any).precio_transferencia;
    delete (result as any).factors;

    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    // Falls back to calculo.precioBase for lista/transferencia
    expect(pdf.precioLista).toBe(4650243);
    expect(pdf.precioTransferencia).toBe(4650243);
    expect(pdf.systemPrice).toBe(5300243);
    expect(pdf.factorTechoDisplay).toBe('');
  });
});
