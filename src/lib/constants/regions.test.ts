import { describe, it, expect } from 'vitest';
import {
  isValidChileanRegion,
  normalizeRegion,
  normalizeComunaName,
  areComunaNamesEqual,
} from './regions';

describe('regions.ts', () => {
  describe('isValidChileanRegion', () => {
    it('validates official Chilean regions', () => {
      expect(isValidChileanRegion('Metropolitana')).toBe(true);
      expect(isValidChileanRegion('Arica y Parinacota')).toBe(true);
      expect(isValidChileanRegion('Magallanes y de la Antártica Chilena')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isValidChileanRegion('metropolitana')).toBe(true);
      expect(isValidChileanRegion('METROPOLITANA')).toBe(true);
      expect(isValidChileanRegion('MeTrOpOlItAnA')).toBe(true);
    });

    it('handles whitespace', () => {
      expect(isValidChileanRegion('  Metropolitana  ')).toBe(true);
      expect(isValidChileanRegion('Metropolitana\n')).toBe(true);
      expect(isValidChileanRegion('\tMetropolitana')).toBe(true);
    });

    it('rejects invalid regions', () => {
      expect(isValidChileanRegion('Invalid Region')).toBe(false);
      expect(isValidChileanRegion('Santiago')).toBe(false);
      expect(isValidChileanRegion('')).toBe(false);
      expect(isValidChileanRegion('Región Metropolitana')).toBe(false); // Not canonical form
    });

    it('rejects non-string values', () => {
      expect(isValidChileanRegion(null as any)).toBe(false);
      expect(isValidChileanRegion(undefined as any)).toBe(false);
      expect(isValidChileanRegion(123 as any)).toBe(false);
      expect(isValidChileanRegion({} as any)).toBe(false);
    });
  });

  describe('normalizeRegion', () => {
    it('returns canonical form for valid regions', () => {
      expect(normalizeRegion('metropolitana')).toBe('Metropolitana');
      expect(normalizeRegion('METROPOLITANA')).toBe('Metropolitana');
      expect(normalizeRegion('  Metropolitana  ')).toBe('Metropolitana');
      expect(normalizeRegion('Arica y Parinacota')).toBe('Arica y Parinacota');
    });

    it('returns null for invalid regions', () => {
      expect(normalizeRegion('Invalid')).toBe(null);
      expect(normalizeRegion('')).toBe(null);
      expect(normalizeRegion('Santiago')).toBe(null);
    });

    it('handles null/undefined', () => {
      expect(normalizeRegion(null as any)).toBe(null);
      expect(normalizeRegion(undefined as any)).toBe(null);
    });
  });

  describe('normalizeComunaName', () => {
    it('normalizes to lowercase', () => {
      expect(normalizeComunaName('SANTIAGO')).toBe('santiago');
      expect(normalizeComunaName('Santiago')).toBe('santiago');
      expect(normalizeComunaName('saNtIaGo')).toBe('santiago');
    });

    it('removes accents', () => {
      expect(normalizeComunaName('Ñuñoa')).toBe('nunoa');
      expect(normalizeComunaName('Peñalolén')).toBe('penalolen');
      expect(normalizeComunaName('Concepción')).toBe('concepcion');
      expect(normalizeComunaName('Valparaíso')).toBe('valparaiso');
      expect(normalizeComunaName('Talcahuano')).toBe('talcahuano');
      expect(normalizeComunaName('Rancagua')).toBe('rancagua');
    });

    it('trims whitespace', () => {
      expect(normalizeComunaName('  Santiago  ')).toBe('santiago');
      expect(normalizeComunaName('Santiago\n')).toBe('santiago');
      expect(normalizeComunaName('\tSantiago')).toBe('santiago');
    });

    it('normalizes multiple spaces to single space', () => {
      expect(normalizeComunaName('San  Pedro')).toBe('san pedro');
      expect(normalizeComunaName('San   Pedro   de  Atacama')).toBe('san pedro de atacama');
    });

    it('handles null/undefined', () => {
      expect(normalizeComunaName(null as any)).toBe('');
      expect(normalizeComunaName(undefined as any)).toBe('');
    });

    it('handles non-string values', () => {
      expect(normalizeComunaName(123 as any)).toBe('');
      expect(normalizeComunaName({} as any)).toBe('');
    });
  });

  describe('areComunaNamesEqual', () => {
    it('compares names case-insensitively', () => {
      expect(areComunaNamesEqual('Santiago', 'SANTIAGO')).toBe(true);
      expect(areComunaNamesEqual('santiago', 'Santiago')).toBe(true);
      expect(areComunaNamesEqual('SANTIAGO', 'santiago')).toBe(true);
    });

    it('compares names accent-insensitively', () => {
      expect(areComunaNamesEqual('Ñuñoa', 'Nunoa')).toBe(true);
      expect(areComunaNamesEqual('Peñalolén', 'Penalolen')).toBe(true);
      expect(areComunaNamesEqual('Concepción', 'Concepcion')).toBe(true);
    });

    it('compares names with trimmed whitespace', () => {
      expect(areComunaNamesEqual('  Santiago  ', 'Santiago')).toBe(true);
      expect(areComunaNamesEqual('Santiago', '\tSantiago\n')).toBe(true);
    });

    it('returns false for different names', () => {
      expect(areComunaNamesEqual('Santiago', 'Valparaíso')).toBe(false);
      expect(areComunaNamesEqual('Ñuñoa', 'Providencia')).toBe(false);
    });

    it('handles null/undefined', () => {
      expect(areComunaNamesEqual(null as any, 'Santiago')).toBe(false);
      expect(areComunaNamesEqual('Santiago', undefined as any)).toBe(false);
      expect(areComunaNamesEqual(null as any, undefined as any)).toBe(false);
    });
  });
});