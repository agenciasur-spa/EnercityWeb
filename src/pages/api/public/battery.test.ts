import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
      })),
    })),
  },
}));

const { GET } = await import('./battery');

describe('/api/public/battery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  describe('GET', () => {
    it('returns active battery', async () => {
      const mockData = { id: 1, etiqueta: 'Batería 15 kWh', precio_neto: 8968806, activo: true };
      mockMaybeSingle.mockResolvedValue({ data: mockData, error: null });

      const url = new URL('http://localhost/api/public/battery');
      const response = await GET({ url } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({ battery: mockData });
    });

    it('returns 404 when no active battery found', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const url = new URL('http://localhost/api/public/battery');
      const response = await GET({ url } as any);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toContain('No hay batería activa configurada');
    });

    it('returns 500 on database error', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      const url = new URL('http://localhost/api/public/battery');
      const response = await GET({ url } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
    });
  });
});
