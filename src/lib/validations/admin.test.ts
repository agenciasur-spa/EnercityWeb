import { describe, it, expect } from 'vitest';
import {
  rangesOverlap,
  validateKitData,
  validateFactor,
  validatePrecio,
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
