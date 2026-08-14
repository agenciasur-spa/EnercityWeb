import { describe, it, expect } from 'vitest';
import {
  rangesOverlap,
  validateKitData,
  validateFactor,
  validatePrecio,
  validateComunaData,
  checkComunaDuplicate,
} from './admin';

describe('rangesOverlap', () => {
  it('returns false when ranges are completely disjoint (a before b)', () => {
    expect(rangesOverlap(0, 100, 101, 200)).toBe(false);
  });

  it('returns false when ranges are completely disjoint (a after b)', () => {
    expect(rangesOverlap(101, 200, 0, 100)).toBe(false);
  });

  it('returns true when ranges touch at a single boundary (100 and 101)', () => {
    // 0-100 and 100-200 overlap at 100
    expect(rangesOverlap(0, 100, 100, 200)).toBe(true);
  });

  it('returns true when ranges partially overlap', () => {
    expect(rangesOverlap(0, 150, 100, 200)).toBe(true);
  });

  it('returns true when one range fully contains the other', () => {
    expect(rangesOverlap(0, 500, 100, 200)).toBe(true);
    expect(rangesOverlap(100, 200, 0, 500)).toBe(true);
  });

  it('returns true when ranges are identical', () => {
    expect(rangesOverlap(0, 100, 0, 100)).toBe(true);
  });

  it('handles realistic kit boundaries from the seed data', () => {
    // Kit 1: 0-50671, Kit 2: 50672-63338 — should NOT overlap
    expect(rangesOverlap(0, 50671, 50672, 63338)).toBe(false);
    // Kit 3: 63339-76006 overlapping with Kit 2: 50672-63338 — should NOT overlap
    expect(rangesOverlap(50672, 63338, 63339, 76006)).toBe(false);
  });

  it('detects a problematic overlap scenario', () => {
    // If someone edits Kit 1 to extend its upper range to 51000
    // which overlaps Kit 2 (50672-63338)
    expect(rangesOverlap(0, 51000, 50672, 63338)).toBe(true);
  });
});

describe('validateKitData', () => {
  const existingKits = [
    { id: 1, rango_desde: 0, rango_hasta: 50671 },
    { id: 2, rango_desde: 50672, rango_hasta: 63338 },
    { id: 3, rango_desde: 63339, rango_hasta: 76006 },
  ];

  it('returns valid when all fields are correct and no overlap', () => {
    const result = validateKitData(
      {
        id: 1,
        rango_desde: 0,
        rango_hasta: 50671,
        precio_lista: 5166937,
        precio_transferencia: 4650243,
      },
      existingKits
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns invalid when rango_desde >= rango_hasta', () => {
    const result = validateKitData(
      {
        id: 1,
        rango_desde: 100,
        rango_hasta: 50,
        precio_lista: 1000,
        precio_transferencia: 900,
      },
      existingKits
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('rango_desde');
  });

  it('returns invalid when rango_desde equals rango_hasta', () => {
    const result = validateKitData(
      {
        id: 1,
        rango_desde: 100,
        rango_hasta: 100,
        precio_lista: 1000,
        precio_transferencia: 900,
      },
      existingKits
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('rango_desde');
  });

  it('returns invalid when precio_lista is zero or negative', () => {
    const result = validateKitData(
      {
        id: 1,
        rango_desde: 0,
        rango_hasta: 50671,
        precio_lista: 0,
        precio_transferencia: 900,
      },
      existingKits
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('precio');
  });

  it('returns invalid when precio_transferencia is negative', () => {
    const result = validateKitData(
      {
        id: 1,
        rango_desde: 0,
        rango_hasta: 50671,
        precio_lista: 1000,
        precio_transferencia: -1,
      },
      existingKits
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('precio');
  });

  it('returns invalid when edited range overlaps another kit (excluding self)', () => {
    // Editing Kit 1 to extend to 55000, which overlaps Kit 2 (50672-63338)
    const result = validateKitData(
      {
        id: 1,
        rango_desde: 0,
        rango_hasta: 55000,
        precio_lista: 1000,
        precio_transferencia: 900,
      },
      existingKits
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('overlap');
  });

  it('does NOT flag overlap against the kit being edited (self-exclusion)', () => {
    // Kit 1's own range (0-50671) should not conflict with itself
    const result = validateKitData(
      {
        id: 1,
        rango_desde: 0,
        rango_hasta: 50671,
        precio_lista: 1000,
        precio_transferencia: 900,
      },
      existingKits
    );
    expect(result.valid).toBe(true);
  });

  it('allows legitimate range changes that do not overlap neighbors', () => {
    // Editing Kit 1 to 0-40000 (shrinking) — no overlap
    const result = validateKitData(
      {
        id: 1,
        rango_desde: 0,
        rango_hasta: 40000,
        precio_lista: 1000,
        precio_transferencia: 900,
      },
      existingKits
    );
    expect(result.valid).toBe(true);
  });
});

describe('validateFactor', () => {
  it('returns valid for factor 1.0 (no surcharge)', () => {
    expect(validateFactor(1.0).valid).toBe(true);
  });

  it('returns valid for factor 1.14 (14% surcharge)', () => {
    expect(validateFactor(1.14).valid).toBe(true);
  });

  it('returns valid for factor 0.95 (discount)', () => {
    expect(validateFactor(0.95).valid).toBe(true);
  });

  it('returns invalid for factor 0', () => {
    const result = validateFactor(0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('factor');
  });

  it('returns invalid for negative factor', () => {
    const result = validateFactor(-0.5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('factor');
  });

  it('returns invalid for NaN', () => {
    const result = validateFactor(NaN);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('factor');
  });
});

describe('validatePrecio', () => {
  it('returns valid for a positive price', () => {
    expect(validatePrecio(4650243).valid).toBe(true);
  });

  it('returns invalid for zero', () => {
    const result = validatePrecio(0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('precio');
  });

  it('returns invalid for negative price', () => {
    const result = validatePrecio(-100);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('precio');
  });

  it('returns invalid for NaN', () => {
    const result = validatePrecio(NaN);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('precio');
  });
});

describe('validateComunaData', () => {
  it('returns valid for complete create data', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacion_ghi: 5.5,
      tarifa_est: 175,
      dispatch_cost: 5000,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns invalid when nombre is missing for create', () => {
    const result = validateComunaData({
      region: 'Metropolitana',
      radiacion_ghi: 5.5,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('nombre es requerido');
  });

  it('returns invalid when region is missing for create', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      radiacion_ghi: 5.5,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('region es requerida');
  });

  it('returns invalid when nombre is empty string', () => {
    const result = validateComunaData({
      nombre: '   ',
      region: 'Metropolitana',
      radiacion_ghi: 5.5,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('nombre no puede estar vacío');
  });

  it('returns invalid when region is empty string', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: '   ',
      radiacion_ghi: 5.5,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('region no puede estar vacía');
  });

  it('returns invalid when radiacion_ghi is out of range (> 10)', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacion_ghi: 15,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('radiacion_ghi debe ser un número entre 0 y 10');
  });

  it('returns invalid when radiacion_ghi is negative', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacion_ghi: -1,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('radiacion_ghi debe ser un número entre 0 y 10');
  });

  it('returns invalid when tarifa_est is zero', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacion_ghi: 5.5,
      tarifa_est: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('tarifa_est debe ser un número positivo');
  });

  it('returns invalid when tarifa_est is negative', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacion_ghi: 5.5,
      tarifa_est: -100,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('tarifa_est debe ser un número positivo');
  });

  it('allows zero dispatch_cost', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacion_ghi: 5.5,
      tarifa_est: 175,
      dispatch_cost: 0,
    });
    expect(result.valid).toBe(true);
  });

  it('allows partial updates (update mode)', () => {
    const result = validateComunaData({
      dispatch_cost: 6000,
    }, true);
    expect(result.valid).toBe(true);
  });

  it('allows valid updates with partial data', () => {
    const result = validateComunaData({
      id: 1,
      dispatch_cost: 6000,
    }, true);
    expect(result.valid).toBe(true);
  });

  it('handles special characters in nombre', () => {
    const result = validateComunaData({
      nombre: 'Ñuñoa',
      region: 'Metropolitana',
      radiacion_ghi: 5.5,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(true);
  });

  it('handles extreme valid radiacion_ghi values', () => {
    const result1 = validateComunaData({
      nombre: 'Arica',
      region: 'Arica y Parinacota',
      radiacion_ghi: 0,
      tarifa_est: 185,
    });
    expect(result1.valid).toBe(true);

    const result2 = validateComunaData({
      nombre: 'Arica',
      region: 'Arica y Parinacota',
      radiacion_ghi: 10,
      tarifa_est: 185,
    });
    expect(result2.valid).toBe(true);
  });

  it('returns invalid for NaN radiacion_ghi', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacion_ghi: NaN,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('radiacion_ghi debe ser un número entre 0 y 10');
  });

  it('returns invalid for NaN tarifa_est', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Metropolitana',
      radiacion_ghi: 5.5,
      tarifa_est: NaN,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('tarifa_est debe ser un número positivo');
  });

  it('returns invalid for invalid region', () => {
    const result = validateComunaData({
      nombre: 'Santiago',
      region: 'Invalid Region',
      radiacion_ghi: 5.5,
      tarifa_est: 175,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('region no válida');
  });

  it('returns invalid for duplicate comuna in same region', () => {
    const existingComunas = [
      { id: 1, nombre: 'Santiago', region: 'Metropolitana', activa: true },
    ];
    const result = validateComunaData(
      {
        nombre: 'Santiago',
        region: 'Metropolitana',
        radiacion_ghi: 5.5,
        tarifa_est: 175,
      },
      false,
      existingComunas
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ya existe una comuna activa');
    expect(result.error).toContain('Santiago');
  });

  it('returns invalid for duplicate with different case in same region', () => {
    const existingComunas = [
      { id: 1, nombre: 'Santiago', region: 'Metropolitana', activa: true },
    ];
    const result = validateComunaData(
      {
        nombre: 'SANTIAGO',
        region: 'Metropolitana',
        radiacion_ghi: 5.5,
        tarifa_est: 175,
      },
      false,
      existingComunas
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ya existe una comuna activa');
  });

  it('returns invalid for duplicate with accents in same region', () => {
    const existingComunas = [
      { id: 1, nombre: 'Nunoa', region: 'Metropolitana', activa: true },
    ];
    const result = validateComunaData(
      {
        nombre: 'Ñuñoa',
        region: 'Metropolitana',
        radiacion_ghi: 5.5,
        tarifa_est: 175,
      },
      false,
      existingComunas
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ya existe una comuna activa');
  });

  it('allows same comuna name in different regions', () => {
    const existingComunas = [
      { id: 1, nombre: 'Santiago', region: 'Metropolitana', activa: true },
    ];
    const result = validateComunaData(
      {
        nombre: 'Santiago',
        region: 'Valparaíso',
        radiacion_ghi: 5.0,
        tarifa_est: 175,
      },
      false,
      existingComunas
    );
    expect(result.valid).toBe(true);
  });

  it('ignores inactive comunas when checking for duplicates', () => {
    const existingComunas = [
      { id: 1, nombre: 'Santiago', region: 'Metropolitana', activa: false },
    ];
    const result = validateComunaData(
      {
        nombre: 'Santiago',
        region: 'Metropolitana',
        radiacion_ghi: 5.5,
        tarifa_est: 175,
      },
      false,
      existingComunas
    );
    expect(result.valid).toBe(true);
  });

  it('allows updating a comuna with its own name and region', () => {
    const existingComunas = [
      { id: 1, nombre: 'Santiago', region: 'Metropolitana', activa: true },
    ];
    const result = validateComunaData(
      {
        id: 1,
        nombre: 'Santiago',
        region: 'Metropolitana',
        radiacion_ghi: 5.5,
        tarifa_est: 175,
      },
      true,
      existingComunas
    );
    expect(result.valid).toBe(true);
  });

  it('returns invalid when updating comuna to duplicate another comuna', () => {
    const existingComunas = [
      { id: 1, nombre: 'Santiago', region: 'Metropolitana', activa: true },
      { id: 2, nombre: 'Providencia', region: 'Metropolitana', activa: true },
    ];
    const result = validateComunaData(
      {
        id: 2,
        nombre: 'Santiago',
        region: 'Metropolitana',
        radiacion_ghi: 5.5,
        tarifa_est: 175,
      },
      true,
      existingComunas
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ya existe una comuna activa');
  });
});
