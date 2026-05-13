import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeArray, normalizeStringArray, validateStringFields } from './content';

// ════════════════════════════════════════════════════════════════
// normalizeArray — validates wrapper-level normalization
// ════════════════════════════════════════════════════════════════

describe('normalizeArray', () => {
  it('returns array as-is when value is already an array', () => {
    const input = [{ label: 'A' }, { label: 'B' }];
    expect(normalizeArray(input)).toEqual(input);
  });

  it('parses JSON string into array', () => {
    const input = '[{"value":"500+"}]';
    expect(normalizeArray(input)).toEqual([{ value: '500+' }]);
  });

  it('returns empty array for JSON string that is not an array', () => {
    expect(normalizeArray('{"key":"value"}')).toEqual([]);
  });

  it('returns empty array for invalid JSON string', () => {
    expect(normalizeArray('not json')).toEqual([]);
  });

  it('returns empty array for null', () => {
    expect(normalizeArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeArray(undefined)).toEqual([]);
  });

  it('returns empty array for number', () => {
    expect(normalizeArray(42)).toEqual([]);
  });

  it('returns empty array for boolean', () => {
    expect(normalizeArray(true)).toEqual([]);
  });

  it('returns empty array for plain object (not array)', () => {
    expect(normalizeArray({ 0: 'I', 1: 'n' })).toEqual([]);
  });

  it('preserves mixed-type arrays', () => {
    const input = ['string', 42, { key: 'val' }, null];
    expect(normalizeArray(input)).toEqual(input);
  });
});

// ════════════════════════════════════════════════════════════════
// normalizeStringArray — the hero function that catches corruption
// ════════════════════════════════════════════════════════════════

describe('normalizeStringArray', () => {
  describe('plain strings (ideal format)', () => {
    it('returns strings as-is', () => {
      const input = ['Ingeniería de precisión', 'Instalaciones certificadas'];
      expect(normalizeStringArray(input)).toEqual(input);
    });

    it('handles empty array', () => {
      expect(normalizeStringArray([])).toEqual([]);
    });

    it('handles single string', () => {
      expect(normalizeStringArray(['hello'])).toEqual(['hello']);
    });
  });

  describe('admin format: {text:"..."} objects', () => {
    it('extracts text from {text:"..."} objects', () => {
      const input = [
        { text: 'Ingeniería de precisión para hogares e industrias' },
        { text: 'Instalaciones certificadas bajo estricta normativa SEC' },
      ];
      const result = normalizeStringArray(input);
      expect(result).toEqual([
        'Ingeniería de precisión para hogares e industrias',
        'Instalaciones certificadas bajo estricta normativa SEC',
      ]);
    });

    it('extracts text from single {text:"..."} object', () => {
      expect(normalizeStringArray([{ text: 'solo uno' }])).toEqual(['solo uno']);
    });

    it('handles {text:""} empty text', () => {
      expect(normalizeStringArray([{ text: '' }])).toEqual(['']);
    });
  });

  describe('corrupted indexed objects: {"0":"I","1":"n",...}', () => {
    it('reconstructs string from indexed object', () => {
      const input = [
        { '0': 'I', '1': 'n', '2': 'g', '3': 'e', '4': 'n', '5': 'i', '6': 'e', '7': 'r', '8': 'í', '9': 'a' },
      ];
      const result = normalizeStringArray(input);
      expect(result).toEqual(['Ingeniería']);
    });

    it('reconstructs string with spaces', () => {
      const input = [
        { '0': 'H', '1': 'o', '2': 'l', '3': 'a', '4': ' ', '5': 'm', '6': 'u', '7': 'n', '8': 'd', '9': 'o' },
      ];
      expect(normalizeStringArray(input)).toEqual(['Hola mundo']);
    });

    it('handles mixed corrupted + valid strings', () => {
      const input = [
        { '0': 'I', '1': 'n', '2': 'g' },
        'ROI documentado',
      ];
      const result = normalizeStringArray(input);
      expect(result).toEqual(['Ing', 'ROI documentado']);
    });
  });

  describe('corrupted indexed objects with extra keys (like "text")', () => {
    it('reconstructs from indexed object that also has "text" key', () => {
      // This is the EXACT corruption we saw in production
      const input = [
        { '0': 'I', '1': 'n', '2': 'g', 'text': '' },
        { '0': 'I', '1': 'n', '2': 's', 'text': '' },
        'ROI documentado',
      ];
      const result = normalizeStringArray(input);
      expect(result).toEqual(['Ing', 'Ins', 'ROI documentado']);
    });
  });

  describe('JSON string input', () => {
    it('parses JSON string containing array of strings', () => {
      const input = '["foo","bar","baz"]';
      expect(normalizeStringArray(input)).toEqual(['foo', 'bar', 'baz']);
    });

    it('parses JSON string containing array of {text:"..."} objects', () => {
      const input = '[{"text":"foo"},{"text":"bar"}]';
      expect(normalizeStringArray(input)).toEqual(['foo', 'bar']);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for null', () => {
      expect(normalizeStringArray(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(normalizeStringArray(undefined)).toEqual([]);
    });

    it('returns empty array for non-array non-string', () => {
      expect(normalizeStringArray(42)).toEqual([]);
    });

    it('converts non-string non-object items to string', () => {
      expect(normalizeStringArray([42, true, null])).toEqual(['42', 'true', '']);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// validateStringFields — detects corrupted fields
// ════════════════════════════════════════════════════════════════

describe('validateStringFields', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('does not log error for valid string fields', () => {
    validateStringFields({ headline: 'Hello', subheadline: 'World' }, 'hero');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('does not log for null/undefined fields', () => {
    validateStringFields({ a: null, b: undefined, c: 'ok' }, 'test');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('does not log for array fields', () => {
    validateStringFields({ features: ['a', 'b'] }, 'test');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs error for object fields that should be strings', () => {
    validateStringFields({ headline: { '0': 'H', '1': 'i' } }, 'hero');
    expect(consoleSpy).toHaveBeenCalled();
    const logged = consoleSpy.mock.calls[0][0];
    expect(logged).toContain('CMS VALIDATION ERROR');
    expect(logged).toContain('hero.headline');
  });

  it('logs error for indexed corrupted objects', () => {
    const corrupted = { '0': 'I', '1': 'n', '2': 'g' };
    validateStringFields({ features: corrupted } as Record<string, unknown>, 'projects_section');
    expect(consoleSpy).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// Integration: full section data shapes from production
// ════════════════════════════════════════════════════════════════

describe('CMS data contract — section shapes', () => {
  describe('projects_section.features', () => {
    it('normalizes production data with plain strings', () => {
      const features = [
        'Ingeniería de precisión para hogares e industrias',
        'Instalaciones certificadas bajo estricta normativa SEC',
        'ROI documentado y monitoreo de ahorro en tiempo real',
      ];
      const result = normalizeStringArray(features);
      expect(result).toHaveLength(3);
      result.forEach((item) => {
        expect(typeof item).toBe('string');
      });
    });

    it('normalizes admin-saved {text:"..."} format', () => {
      const features = [
        { text: 'Ingeniería de precisión para hogares e industrias' },
        { text: 'Instalaciones certificadas bajo estricta normativa SEC' },
        { text: 'ROI documentado y monitoreo de ahorro en tiempo real' },
      ];
      const result = normalizeStringArray(features);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('Ingeniería de precisión para hogares e industrias');
    });

    it('recovers from the EXACT production corruption', () => {
      // This is the real data that caused "Internal server error"
      const corruptedFeatures = [
        {
          '0': 'I', '1': 'n', '2': 'g', '3': 'e', '4': 'n', '5': 'i',
          '6': 'e', '7': 'r', '8': 'í', '9': 'a', '10': ' ', '11': 'd',
          '12': 'e', '13': ' ', '14': 'p', '15': 'r', '16': 'e', '17': 'c',
          '18': 'i', '19': 's', '20': 'i', '21': 'ó', '22': 'n', '23': ' ',
          '24': 'p', '25': 'a', '26': 'r', '27': 'a', '28': ' ', '29': 'h',
          '30': 'o', '31': 'g', '32': 'a', '33': 'r', '34': 'e', '35': 's',
          '36': ' ', '37': 'e', '38': ' ', '39': 'i', '40': 'n', '41': 'd',
          '42': 'u', '43': 's', '44': 't', '45': 'r', '46': 'i', '47': 'a',
          '48': 's',
          text: '',
        },
        {
          '0': 'I', '1': 'n', '2': 's', '3': 't', '4': 'a', '5': 'l',
          '6': 'a', '7': 'c', '8': 'i', '9': 'o', '10': 'n', '11': 'e',
          '12': 's', '13': ' ', '14': 'c', '15': 'e', '16': 'r', '17': 't',
          '18': 'i', '19': 'f', '20': 'i', '21': 'c', '22': 'a', '23': 'd',
          '24': 'a', '25': 's', '26': ' ', '27': 'b', '28': 'a', '29': 'j',
          '30': 'o', '31': ' ', '32': 'e', '33': 's', '34': 't', '35': 'r',
          '36': 'i', '37': 'c', '38': 't', '39': 'a', '40': ' ', '41': 'n',
          '42': 'o', '43': 'r', '44': 'm', '45': 'a', '46': 't', '47': 'i',
          '48': 'v', '49': 'a', '50': ' ', '51': 'S', '52': 'E', '53': 'C',
          text: '',
        },
        'ROI documentado y monitoreo de ahorro en tiempo real',
      ];
      const result = normalizeStringArray(corruptedFeatures);
      expect(result).toEqual([
        'Ingeniería de precisión para hogares e industrias',
        'Instalaciones certificadas bajo estricta normativa SEC',
        'ROI documentado y monitoreo de ahorro en tiempo real',
      ]);
    });
  });

  describe('hero.cardStats', () => {
    it('accepts valid object array', () => {
      const cardStats = [
        { value: '500+', label: 'Proyectos Instalados' },
        { value: '15MW', label: 'Capacidad Generada' },
      ];
      const result = normalizeArray<{ value: string; label: string }>(cardStats);
      expect(result).toEqual(cardStats);
    });
  });

  describe('guarantees.cards', () => {
    it('accepts valid object array', () => {
      const cards = [
        { title: 'Inversión Protegida', subtitle: 'Hasta 120 meses', description: '...', tag: 'ROI', icon: 'ShieldCheck', color: '#F07E04' },
      ];
      const result = normalizeArray(cards);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Inversión Protegida');
    });
  });

  describe('contact_cta.benefits', () => {
    it('accepts valid object array', () => {
      const benefits = [
        { icon: 'Globe', text: 'Consultoría técnica' },
        { icon: 'BarChart3', text: 'Análisis de rentabilidad' },
      ];
      const result = normalizeArray(benefits);
      expect(result).toEqual(benefits);
    });
  });

  describe('footer.socials', () => {
    it('accepts valid object array', () => {
      const socials = [
        { icon: 'Facebook', href: '#', label: 'Facebook' },
        { icon: 'Linkedin', href: '#', label: 'LinkedIn' },
      ];
      const result = normalizeArray(socials);
      expect(result).toEqual(socials);
    });
  });

  describe('nav_links', () => {
    it('all items have required string fields', () => {
      const links = [
        { id: '1', location: 'navbar', label: 'Inicio', href: '#inicio', sort_order: 1, active: true },
      ];
      links.forEach((link) => {
        expect(typeof link.id).toBe('string');
        expect(typeof link.label).toBe('string');
        expect(typeof link.href).toBe('string');
      });
    });
  });

  describe('comunas', () => {
    it('all items have required fields', () => {
      const comunas = [
        { id: 1, nombre: 'Santiago', region: 'Metropolitana', activa: true, radiacion_ghi: 5.5, tarifa_est: 175 },
      ];
      comunas.forEach((c) => {
        expect(typeof c.nombre).toBe('string');
        expect(typeof c.region).toBe('string');
        expect(typeof c.radiacion_ghi).toBe('number');
        expect(typeof c.tarifa_est).toBe('number');
      });
    });
  });

  describe('settings', () => {
    it('all values are strings', () => {
      const settings = [
        { key: 'iva', value: '1.19', label: 'Factor IVA 19%' },
        { key: 'email_from_address', value: 'presupuestos@enercity.cl', label: 'Email' },
      ];
      settings.forEach((s) => {
        expect(typeof s.key).toBe('string');
        expect(typeof s.value).toBe('string');
      });
    });
  });
});
