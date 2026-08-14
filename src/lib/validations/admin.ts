/**
 * Pure validation functions for admin panel mutations.
 * These are extracted from API endpoints so they can be unit-tested
 * without Supabase dependencies.
 */

import {
  isValidChileanRegion,
  normalizeComunaName,
  normalizeRegion,
} from '../constants/regions';

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

interface ComunaDuplicateCheck {
  exists: boolean;
  existingId?: number;
  existingNombre?: string;
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
 * Check if a comuna name is a duplicate of an existing active comuna in the same region.
 * Compares normalized name + region (trim, case-insensitive, accent-insensitive).
 *
 * @param nombre - The comuna name to check
 * @param region - The region to check
 * @param existingComunas - Array of existing comunas to check against
 * @param excludeId - Optional ID to exclude (for updates)
 * @returns Object indicating if duplicate exists and details
 */
export function checkComunaDuplicate(
  nombre: string,
  region: string,
  existingComunas: Array<{ id: number; nombre: string; region: string; activa: boolean }>,
  excludeId?: number
): ComunaDuplicateCheck {
  const normalizedNombre = normalizeComunaName(nombre);
  const normalizedRegion = normalizeRegion(region);

  if (!normalizedRegion) {
    return { exists: false }; // Invalid region, will be caught by region validation
  }

  const duplicate = existingComunas.find(
    (comuna) => {
      // Skip if excluding this ID (for updates)
      if (excludeId && comuna.id === excludeId) return false;

      // Only check against active records
      if (!comuna.activa) return false;

      // Check if region matches (normalized)
      const comunaRegion = normalizeRegion(comuna.region);
      if (comunaRegion !== normalizedRegion) return false;

      // Check if name matches (normalized)
      return normalizeComunaName(comuna.nombre) === normalizedNombre;
    }
  );

  return {
    exists: !!duplicate,
    existingId: duplicate?.id,
    existingNombre: duplicate?.nombre,
  };
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

/**
 * Validate comuna data for create/update operations.
 */
export function validateComunaData(
  data: Record<string, unknown>,
  isUpdate = false,
  existingComunas: Array<{ id: number; nombre: string; region: string; activa: boolean }> = []
): ValidationResult {
  const { id, nombre, region, radiacion_ghi, tarifa_est } = data;

  if (nombre !== undefined) {
    if (typeof nombre !== 'string') {
      return { valid: false, error: 'nombre debe ser un texto' };
    }
    if (nombre.trim().length === 0) {
      return { valid: false, error: 'nombre no puede estar vacío' };
    }
  } else if (!isUpdate) {
    return { valid: false, error: 'nombre es requerido' };
  }

  if (region !== undefined) {
    if (typeof region !== 'string') {
      return { valid: false, error: 'region debe ser un texto' };
    }
    if (region.trim().length === 0) {
      return { valid: false, error: 'region no puede estar vacía' };
    }
    if (!isValidChileanRegion(region)) {
      return {
        valid: false,
        error: 'region no válida. Debe ser una de las regiones oficiales de Chile.'
      };
    }
  } else if (!isUpdate) {
    return { valid: false, error: 'region es requerida' };
  }

  // Check for duplicates only when both nombre and region are provided and active records exist
  if (nombre !== undefined && region !== undefined && existingComunas.length > 0) {
    const nombreStr = String(nombre);
    const regionStr = String(region);

    // Only check duplicate if region is valid
    if (!isValidChileanRegion(regionStr)) {
      // Invalid region will be caught by region validation, skip duplicate check
    } else {
      const duplicateCheck = checkComunaDuplicate(
        nombreStr,
        regionStr,
        existingComunas,
        typeof id === 'number' ? id : undefined
      );

      if (duplicateCheck.exists) {
        return {
          valid: false,
          error: `Ya existe una comuna activa con el nombre "${duplicateCheck.existingNombre}" en la región ${regionStr}.`
        };
      }
    }
  }

  if (radiacion_ghi !== undefined) {
    const ghi = Number(radiacion_ghi);
    if (isNaN(ghi) || ghi < 0 || ghi > 10) {
      return { valid: false, error: 'radiacion_ghi debe ser un número entre 0 y 10' };
    }
  }

  if (tarifa_est !== undefined) {
    const tarifa = Number(tarifa_est);
    if (isNaN(tarifa) || tarifa <= 0) {
      return { valid: false, error: 'tarifa_est debe ser un número positivo' };
    }
  }

  return { valid: true };
}
