import { describe, it, expect } from 'vitest';
import {
  findKitByConsumoAnual,
  calculateFinalPrice,
  calculateROI,
  classifyInvestment,
} from './pricing';
import { ROI_CONSTANTS } from '../constants/roi';
import type { Kit } from '../types/simulation';

const mockKits: Kit[] = [
  { id: 1, consumoBruto: 0, amperajeNecesario: '', inversorKw: 2, paneles: 4, kwp: 2.44, precioNetoBase: 4650243, rangoDesde: 0, rangoHasta: 50671, precioLista: 5166937, precioTransferencia: 4650243, potenciaPanel: 610, potenciaTotalSistema: 2.44, generacionAnual: 3416 },
  { id: 2, consumoBruto: 0, amperajeNecesario: '', inversorKw: 2, paneles: 5, kwp: 3.05, precioNetoBase: 4904428, rangoDesde: 50672, rangoHasta: 63338, precioLista: 5449364, precioTransferencia: 4904428, potenciaPanel: 610, potenciaTotalSistema: 3.05, generacionAnual: 4270 },
];

describe('findKitByConsumoAnual', () => {
  it('returns null when consumoAnual is below the minimum range', () => {
    // Negative consumption — no kit should match
    const result = findKitByConsumoAnual(mockKits, -1);
    expect(result).toBeNull();
  });

  it('matches kit 1 when consumoAnual is exactly at the lower boundary (0)', () => {
    const result = findKitByConsumoAnual(mockKits, 0);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
  });

  it('matches kit 1 when consumoAnual is at the upper boundary of range 1 (50671)', () => {
    const result = findKitByConsumoAnual(mockKits, 50671);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
  });

  it('matches kit 2 when consumoAnual is at the lower boundary of range 2 (50672)', () => {
    const result = findKitByConsumoAnual(mockKits, 50672);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(2);
  });

  it('matches kit 2 for a value in the middle of range 2 (57000)', () => {
    const result = findKitByConsumoAnual(mockKits, 57000);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(2);
  });

  it('matches kit 2 at the upper boundary of range 2 (63338)', () => {
    const result = findKitByConsumoAnual(mockKits, 63338);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(2);
  });

  it('returns null when consumoAnual is above all kit ranges (999999)', () => {
    const result = findKitByConsumoAnual(mockKits, 999999);
    expect(result).toBeNull();
  });

  it('returns null for an empty kits array', () => {
    const result = findKitByConsumoAnual([], 30000);
    expect(result).toBeNull();
  });

  it('handles kits with missing rangoDesde by defaulting to 0', () => {
    const kits: Kit[] = [
      { id: 9, consumoBruto: 0, amperajeNecesario: '', inversorKw: 3, paneles: 6, kwp: 3.66, precioNetoBase: 5000000, rangoHasta: 100000 },
    ];
    const result = findKitByConsumoAnual(kits, 50000);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(9);
  });

  it('handles kits with missing rangoHasta by defaulting to Infinity', () => {
    const kits: Kit[] = [
      { id: 10, consumoBruto: 0, amperajeNecesario: '', inversorKw: 5, paneles: 12, kwp: 7.32, precioNetoBase: 8000000, rangoDesde: 50000 },
    ];
    const result = findKitByConsumoAnual(kits, 200000);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(10);
  });
});

describe('calculateFinalPrice', () => {
  it('returns the base price when both factors are 1.0', () => {
    const result = calculateFinalPrice(4650243, 1.0, 1.0);
    expect(result).toBe(4650243);
  });

  it('applies techo factor multiplicatively', () => {
    const result = calculateFinalPrice(4650243, 1.14, 1.0);
    expect(result).toBe(Math.round(4650243 * 1.14));
  });

  it('applies medidor factor multiplicatively', () => {
    const result = calculateFinalPrice(4650243, 1.0, 1.05);
    expect(result).toBe(Math.round(4650243 * 1.05));
  });

  it('applies both factors combined', () => {
    const result = calculateFinalPrice(4650243, 1.14, 1.05);
    expect(result).toBe(Math.round(4650243 * 1.14 * 1.05));
  });

  it('rounds to nearest integer', () => {
    const result = calculateFinalPrice(4904428, 1.12, 1.07);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(Math.round(4904428 * 1.12 * 1.07));
  });
});

describe('calculateROI', () => {
  it('produces deterministic output for known inputs', () => {
    const result = calculateROI(3.05, 4270, 5000000, 60000, 0);

    // consumoKwhAnual = (60000 / 180) * 12 = 4000
    expect(result.consumoKwhAnual).toBe(4000);
    // generacionEstimada = 4270 (generacionAnual > 0, so use it directly)
    expect(result.generacionAnualKwh).toBe(4270);
    // ahorroAnual = min(4270, 4000) * 180 = 4000 * 180 = 720000
    expect(result.ahorroAnual).toBe(720000);
    // ahorroMensual = 720000 / 12 = 60000
    expect(result.ahorroMensual).toBe(60000);
    // cobertura = min((4270 / 4000) * 100, 95) = 95
    expect(result.coberturaPorcentaje).toBe(95);
    // payback = 5000000 / 720000 = 6.94 → 6.9
    expect(result.paybackAnos).toBe(6.9);
  });

  it('includes dispatch cost in payback calculation', () => {
    const result = calculateROI(3.05, 4270, 5000000, 60000, 200000);

    // With 200,000 dispatch cost, total investment = 5,200,000
    // payback = 5200000 / 720000 = 7.22 → 7.2
    expect(result.paybackAnos).toBe(7.2);
  });

  it('falls back to estimated generation when generacionAnual is 0', () => {
    // potenciaTotalSistema = 2.44 kW
    // generacionEstimada = 2.44 * 1600 * 365 * 0.75 / 1000 = 1068.72 → 1069
    const result = calculateROI(2.44, 0, 4000000, 50000, 0);
    expect(result.generacionAnualKwh).toBe(1069);
  });

  it('returns payback of 999 when ahorroAnual is 0 (montoBoleta = 0)', () => {
    const result = calculateROI(3.05, 4270, 5000000, 0, 100000);
    expect(result.paybackAnos).toBe(999);
    expect(result.ahorroAnual).toBe(0);
    expect(result.coberturaPorcentaje).toBe(0);
  });

  it('caps cobertura at 95 percent', () => {
    const result = calculateROI(14.3, 20000, 30000000, 40000);
    expect(result.coberturaPorcentaje).toBeLessThanOrEqual(95);
  });

  it('rounds all numeric outputs to integers or 1 decimal', () => {
    const result = calculateROI(3.05, 4270, 5000000, 60000);
    expect(Number.isInteger(result.consumoKwhAnual)).toBe(true);
    expect(Number.isInteger(result.generacionAnualKwh)).toBe(true);
    expect(Number.isInteger(result.ahorroAnual)).toBe(true);
    expect(Number.isInteger(result.ahorroMensual)).toBe(true);
    // cobertura and payback: at most 1 decimal
    const coberturaDecimals = (String(result.coberturaPorcentaje).split('.')[1] || '').length;
    const paybackDecimals = (String(result.paybackAnos).split('.')[1] || '').length;
    expect(coberturaDecimals).toBeLessThanOrEqual(1);
    expect(paybackDecimals).toBeLessThanOrEqual(1);
  });

  it('uses ROI_CONSTANTS for radiacion, tarifa, and performance ratio', () => {
    // When generacionAnual = 0, the estimated generation uses ROI_CONSTANTS
    // gen = potencia * radiacionGhi * 365 * pr / 1000
    const potencia = 5.0;
    const expected = Math.round(potencia * ROI_CONSTANTS.radiacionGhi * 365 * ROI_CONSTANTS.performanceRatio / 1000);
    const result = calculateROI(potencia, 0, 8000000, 70000, 0);
    expect(result.generacionAnualKwh).toBe(expected);
  });
});

describe('classifyInvestment', () => {
  it('returns ALTA_RETORNO when payback <= 5', () => {
    expect(classifyInvestment(0)).toBe('ALTA_RETORNO');
    expect(classifyInvestment(3)).toBe('ALTA_RETORNO');
    expect(classifyInvestment(5)).toBe('ALTA_RETORNO');
  });

  it('returns MEDIO_RETORNO when payback is between 5 (exclusive) and 10', () => {
    expect(classifyInvestment(6)).toBe('MEDIO_RETORNO');
    expect(classifyInvestment(7.5)).toBe('MEDIO_RETORNO');
    expect(classifyInvestment(10)).toBe('MEDIO_RETORNO');
  });

  it('returns BAJA_RETORNO when payback > 10', () => {
    expect(classifyInvestment(11)).toBe('BAJA_RETORNO');
    expect(classifyInvestment(20)).toBe('BAJA_RETORNO');
    expect(classifyInvestment(999)).toBe('BAJA_RETORNO');
  });
});
