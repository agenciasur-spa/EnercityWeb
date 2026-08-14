import { describe, it, expect } from 'vitest';
import { buildPricingDisplay, buildPdfDataFromResult } from './simulator-display';
import { findActiveEquipmentByType, buildEquipmentCard } from './equipment-catalog';
import type { PDFData } from '../pdf-types';
import type { EquipmentDetail } from '../../types/simulation';

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

    // precioTransferencia/precioFinal reflect the full amount the customer
    // pays (calculo.precioFinalIva already includes despacho + batería) —
    // result.precio_transferencia alone is the "clean" kit price and is no
    // longer re-derived/subtracted on the client.
    expect(display.precioLista).toBe(5166937);
    expect(display.precioTransferencia).toBe(5300243);
    expect(display.precioFinal).toBe(5300243);
    expect(display.hasDualPricing).toBe(true);
  });

  it('detects when all prices are the same (no dual pricing)', () => {
    const result = makeQuoteResult({
      precio_lista: 4650243,
      precio_transferencia: 4650243,
      precio_final: 4650243,
      calculo: { ...makeQuoteResult().calculo, precioFinalIva: 4650243 },
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

    expect(display.techoDisplay).toBe('Teja Chilena');
    expect(display.medidorDisplay).toBe('Reja');
  });

  it('returns empty factors when factors field is missing', () => {
    const result = makeQuoteResult();
    delete (result as any).factors;
    const display = buildPricingDisplay(result);

    expect(display.techoDisplay).toBe('');
    expect(display.medidorDisplay).toBe('');
  });

  it('does not double-subtract battery cost from the displayed price', () => {
    // Regression test: precio_transferencia arrives from the backend already
    // net of battery/dispatch cost; calculo.precioFinalIva is the full amount.
    // The display used to subtract battery_cost a second time here, producing
    // a corrupted constant total unrelated to any kit/region value.
    const result = makeQuoteResult({
      precio_transferencia: 4650243,
      battery_cost: 8968806,
      calculo: { ...makeQuoteResult().calculo, precioFinalIva: 4650243 + 8968806 },
    });
    const display = buildPricingDisplay(result);

    expect(display.precioTransferencia).toBe(4650243 + 8968806);
    expect(display.batteryCost).toBe(8968806);
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
    expect(pdf.precioTransferencia).toBe(5300243);
    expect(pdf.precioFinal).toBe(5300243);
    expect(pdf.factorTechoDisplay).toBe('Teja Chilena');
    expect(pdf.factorMedidorDisplay).toBe('Reja');
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
    delete (result as any).dispatch_cost;

    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas);

    // precioLista has no fallback source (undefined). precioTransferencia
    // falls back to calculo.precioFinalIva, same source as precioFinal/systemPrice.
    expect(pdf.precioLista).toBeUndefined();
    expect(pdf.precioTransferencia).toBe(5300243);
    expect(pdf.systemPrice).toBe(5300243);
    expect(pdf.factorTechoDisplay).toBe('');
  });

  it('includes equipment cards with catalog URLs when available', () => {
    const result = makeQuoteResult();
    const equipmentCatalog: EquipmentDetail[] = [
      {
        id: 1,
        tipo: 'inversor',
        nombre: 'Inversor GoodWe Premium',
        marca: 'GoodWe',
        modelo: 'GW3000-NS',
        potenciaWatts: 3000,
        imagenUrl: 'https://example.com/inverter.jpg',
        fichaTecnicaUrl: 'https://example.com/inverter-specs.pdf',
        activo: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 2,
        tipo: 'panel',
        nombre: 'Panel Trina Solar Vertex',
        marca: 'Trina Solar',
        modelo: 'Vertex S+ 410W',
        potenciaWatts: 410,
        imagenUrl: 'https://example.com/panel.jpg',
        fichaTecnicaUrl: 'https://example.com/panel-specs.pdf',
        activo: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas, equipmentCatalog);

    expect(pdf.equipment).toHaveLength(2);
    expect(pdf.equipment![0]).toMatchObject({
      tipo: 'inversor',
      nombre: 'Inversor GoodWe Premium',
      marca: 'GoodWe',
      imagenUrl: 'https://example.com/inverter.jpg',
      fichaTecnicaUrl: 'https://example.com/inverter-specs.pdf',
    });
    expect(pdf.equipment![1]).toMatchObject({
      tipo: 'panel',
      nombre: 'Panel Trina Solar Vertex',
      marca: 'Trina Solar',
      imagenUrl: 'https://example.com/panel.jpg',
      fichaTecnicaUrl: 'https://example.com/panel-specs.pdf',
    });
  });

  it('falls back to fixed labels when catalog data is missing', () => {
    const result = makeQuoteResult();
    const emptyCatalog: EquipmentDetail[] = [];

    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas, emptyCatalog);

    expect(pdf.equipment).toHaveLength(2);
    expect(pdf.equipment![0]).toMatchObject({
      tipo: 'inversor',
      nombre: 'Inversor',
      marca: 'GOODWE',
      modelo: '4kW',
      potenciaWatts: 4000,
      imagenUrl: undefined,
      fichaTecnicaUrl: undefined,
    });
    expect(pdf.equipment![1]).toMatchObject({
      tipo: 'panel',
      nombre: 'Panel Solar',
      marca: 'TRINA SOLAR',
      modelo: '10x410W',
      potenciaWatts: undefined,
      imagenUrl: undefined,
      fichaTecnicaUrl: undefined,
    });
  });

  it('only uses active equipment from catalog', () => {
    const result = makeQuoteResult();
    const mixedCatalog: EquipmentDetail[] = [
      {
        id: 1,
        tipo: 'inversor',
        nombre: 'Active Inverter',
        marca: 'GoodWe',
        modelo: 'GW3000-NS',
        potenciaWatts: 3000,
        imagenUrl: 'https://example.com/active.jpg',
        fichaTecnicaUrl: 'https://example.com/active.pdf',
        activo: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 2,
        tipo: 'inversor',
        nombre: 'Inactive Inverter',
        marca: 'GoodWe',
        modelo: 'GW5000-NS',
        potenciaWatts: 5000,
        imagenUrl: 'https://example.com/inactive.jpg',
        fichaTecnicaUrl: 'https://example.com/inactive.pdf',
        activo: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas, mixedCatalog);

    expect(pdf.equipment![0].imagenUrl).toBe('https://example.com/active.jpg');
    expect(pdf.equipment![0].nombre).toBe('Active Inverter');
  });

  it('preserves On-Grid-only output (inverter + panels, no battery/hybrid)', () => {
    const result = makeQuoteResult();
    const equipmentCatalog: EquipmentDetail[] = [
      {
        id: 1,
        tipo: 'inversor',
        nombre: 'Inverter',
        marca: 'GoodWe',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        tipo: 'panel',
        nombre: 'Panel',
        marca: 'Trina',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas, equipmentCatalog);

    expect(pdf.equipment).toHaveLength(2);
    expect(pdf.equipment![0].tipo).toBe('inversor');
    expect(pdf.equipment![1].tipo).toBe('panel');
    expect(pdf.equipment.every(eq => eq.tipo === 'inversor' || eq.tipo === 'panel')).toBe(true);
  });

  it('adds a third "bateria" equipment card for hybrid quotes', () => {
    const result = makeQuoteResult({ battery_cost: 8968806, battery_required: true });
    const equipmentCatalog: EquipmentDetail[] = [
      {
        id: 3,
        tipo: 'bateria',
        nombre: 'Batería Powerwall',
        marca: 'Tesla',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas, equipmentCatalog);

    expect(pdf.equipment).toHaveLength(3);
    expect(pdf.equipment![2]).toMatchObject({ tipo: 'bateria', nombre: 'Batería Powerwall', marca: 'Tesla' });
  });

  it('omits the battery card when no battery was quoted', () => {
    const result = makeQuoteResult();
    const equipmentCatalog: EquipmentDetail[] = [
      {
        id: 3,
        tipo: 'bateria',
        nombre: 'Batería Powerwall',
        marca: 'Tesla',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const pdf: PDFData = buildPdfDataFromResult(result, formData, comunas, equipmentCatalog);

    expect(pdf.equipment).toHaveLength(2);
  });
});
