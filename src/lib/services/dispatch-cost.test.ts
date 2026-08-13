import { describe, it, expect, beforeEach } from 'vitest';
import { buildPdfDataFromResult } from './simulator-display';
import type { PDFData } from '../pdf-types';

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
      potenciaPanel: 550,
      rangoDesde: 70000,
      rangoHasta: 90000,
    },
    precio_lista: 5166937,
    precio_transferencia: 4650243,
    precio_final: 4850243,
    dispatch_cost: 200000,
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
    calculo: {
      precioBase: 4650243,
      factorTecho: 1.14,
      recargoTecho: 0,
      costoMedidor: 0,
      precioSinIva: 4850243,
      iva: 0,
      precioFinal: 4850243,
      precioFinalIva: 4850243,
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
      inversionTotal: 4850243,
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
      dispatchCost: 200000,
    },
    ...overrides,
  };
}

describe('buildPdfDataFromResult with dispatch cost', () => {
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

  it('includes dispatch cost in PDF data', () => {
    const result = makeQuoteResult();
    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    expect(pdf.dispatchCost).toBe(200000);
  });

  it('defaults dispatch cost to 0 when not provided', () => {
    const result = makeQuoteResult({ dispatch_cost: 0, datosComuna: { ...makeQuoteResult().datosComuna, dispatchCost: 0 } });
    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    expect(pdf.dispatchCost).toBe(0);
  });

  it('includes equipment cards for inverter and panels', () => {
    const result = makeQuoteResult();
    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    expect(pdf.equipment).toHaveLength(2);
    expect(pdf.equipment?.[0].tipo).toBe('inversor');
    expect(pdf.equipment?.[0].marca).toBe('GOODWE');
    expect(pdf.equipment?.[1].tipo).toBe('panel');
    expect(pdf.equipment?.[1].marca).toBe('TRINA SOLAR');
  });

  it('includes inverter details from kit', () => {
    const result = makeQuoteResult();
    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    const inverter = pdf.equipment?.find(e => e.tipo === 'inversor');
    expect(inverter).toBeDefined();
    expect(inverter?.modelo).toBe('4kW');
    expect(inverter?.potenciaWatts).toBe(4000);
  });

  it('includes panel details from kit', () => {
    const result = makeQuoteResult();
    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    const panel = pdf.equipment?.find(e => e.tipo === 'panel');
    expect(panel).toBeDefined();
    expect(panel?.modelo).toBe('10x550W');
    expect(panel?.potenciaWatts).toBe(550);
  });

  it('handles missing kit gracefully with empty equipment array', () => {
    const result = { ...makeQuoteResult(), kit: undefined };
    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    expect(pdf.equipment).toEqual([]);
  });
});