/**
 * Canonical list of Chilean regions in official display names.
 * Source: Oficina Nacional de Estadísticas (INE) and official government nomenclature.
 */

export const CHILEAN_REGIONS = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  'Libertador General Bernardo O\'Higgins',
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén del General Carlos Ibáñez del Campo',
  'Magallanes y de la Antártica Chilena',
] as const;

export type ChileanRegion = typeof CHILEAN_REGIONS[number];

/**
 * Check if a string is a valid Chilean region (case-insensitive).
 */
export function isValidChileanRegion(region: string): region is ChileanRegion {
  if (!region || typeof region !== 'string') return false;
  return CHILEAN_REGIONS.some(
    canonicalRegion => canonicalRegion.toLowerCase() === region.trim().toLowerCase()
  );
}

/**
 * Normalize a region string to canonical form (case-sensitive).
 * Returns the canonical region name if valid, otherwise returns null.
 */
export function normalizeRegion(region: string): ChileanRegion | null {
  if (!region || typeof region !== 'string') return null;
  
  const lowerTrimmed = region.trim().toLowerCase();
  const canonicalRegion = CHILEAN_REGIONS.find(
    r => r.toLowerCase() === lowerTrimmed
  );
  
  return canonicalRegion || null;
}

/**
 * Normalize a comuna name for duplicate checking:
 * - Trim whitespace
 * - Convert to lowercase
 * - Remove accents (ñ → n, á → a, etc.)
 */
export function normalizeComunaName(nombre: string): string {
  if (!nombre || typeof nombre !== 'string') return '';
  
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if two comuna names are the same (normalized comparison).
 */
export function areComunaNamesEqual(nombre1: string, nombre2: string): boolean {
  if (!nombre1 || !nombre2 || typeof nombre1 !== 'string' || typeof nombre2 !== 'string') {
    return false;
  }
  return normalizeComunaName(nombre1) === normalizeComunaName(nombre2);
}