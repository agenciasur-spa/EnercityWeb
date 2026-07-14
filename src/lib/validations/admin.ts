/**
 * Pure validation functions for admin panel mutations.
 * These are extracted from API endpoints so they can be unit-tested
 * without Supabase dependencies.
 */

interface KitForValidation {
  id: number;
  rango_desde: number;
  rango_hasta: number;
  precio_lista: number;
  precio_transferencia: number;
}

interface ExistingKit {
  id: number;
  rango_desde: number;
  rango_hasta: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Check whether two numeric ranges [aDesde, aHasta] and [bDesde, bHasta] overlap.
 * Ranges are inclusive on both ends.
 */
export function rangesOverlap(
  aDesde: number,
  aHasta: number,
  bDesde: number,
  bHasta: number
): boolean {
  return aDesde <= bHasta && bDesde <= aHasta;
}

/**
 * Validate a kit update payload against existing kits.
 * Checks:
 * 1. rango_desde < rango_hasta
 * 2. precio_lista > 0 and precio_transferencia > 0
 * 3. Range does not overlap any other kit (excluding the kit being edited)
 */
export function validateKitData(
  kit: KitForValidation,
  allKits: ExistingKit[]
): ValidationResult {
  if (kit.rango_desde >= kit.rango_hasta) {
    return {
      valid: false,
      error: 'rango_desde must be less than rango_hasta',
    };
  }

  const listaResult = validatePrecio(kit.precio_lista);
  if (!listaResult.valid) {
    return { valid: false, error: `precio_lista: ${listaResult.error}` };
  }

  const transferResult = validatePrecio(kit.precio_transferencia);
  if (!transferResult.valid) {
    return { valid: false, error: `precio_transferencia: ${transferResult.error}` };
  }

  const overlapping = allKits.find(
    (other) =>
      other.id !== kit.id &&
      rangesOverlap(kit.rango_desde, kit.rango_hasta, other.rango_desde, other.rango_hasta)
  );

  if (overlapping) {
    return {
      valid: false,
      error: `Range overlap detected with kit id ${overlapping.id} (range ${overlapping.rango_desde}-${overlapping.rango_hasta})`,
    };
  }

  return { valid: true };
}

/**
 * Validate that a factor is a positive number.
 */
export function validateFactor(factor: number): ValidationResult {
  if (isNaN(factor) || factor <= 0) {
    return { valid: false, error: 'factor must be a positive number' };
  }
  return { valid: true };
}

/**
 * Validate that a price is a positive number.
 */
export function validatePrecio(precio: number): ValidationResult {
  if (isNaN(precio) || precio <= 0) {
    return { valid: false, error: 'precio must be a positive number' };
  }
  return { valid: true };
}
