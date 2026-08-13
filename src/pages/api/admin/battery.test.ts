import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTerminal = vi.fn();

vi.mock('../../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockTerminal })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ single: mockTerminal })),
        })),
      })),
    })),
  },
}));

vi.mock('../../../lib/auth', () => ({
  getAdminUser: vi.fn(),
}));

const { GET, PUT } = await import('./battery');
const { getAdminUser } = await import('../../../lib/auth');

describe('/api/admin/battery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTerminal.mockResolvedValue({ data: null, error: null });
  });

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/battery');
      const request = new Request(url);
      const response = await GET({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result).toEqual({ error: 'No autorizado' });
    });

    it('returns active battery when user is authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({ id: '123', email: 'admin@test.com', role: 'admin' });

      const mockData = { id: 1, etiqueta: 'Batería 15 kWh', precio_neto: 8968806, activo: true };
      mockTerminal.mockResolvedValue({ data: mockData, error: null });

      const url = new URL('http://localhost/api/admin/battery');
      const request = new Request(url);
      const response = await GET({ request } as any);
      const result = await response.json();

      expect(getAdminUser).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
      expect(result).toEqual({ battery: mockData });
    });

    it('returns 500 on database error', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({ id: '123', email: 'admin@test.com', role: 'admin' });
      mockTerminal.mockResolvedValue({ data: null, error: { message: 'DB fail' } });

      const url = new URL('http://localhost/api/admin/battery');
      const request = new Request(url);
      const response = await GET({ request } as any);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/battery');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ id: 1, etiqueta: 'Batería 20 kWh', precioNeto: 10000000 }),
      });
      const response = await PUT({ request } as any);

      expect(response.status).toBe(401);
    });

    it('returns 400 when missing required fields', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({ id: '123', email: 'admin@test.com', role: 'admin' });

      const url = new URL('http://localhost/api/admin/battery');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ etiqueta: 'Batería 20 kWh' }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Falta el campo id');
    });

    it('updates battery successfully when authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({ id: '123', email: 'admin@test.com', role: 'admin' });

      const mockData = { id: 1, etiqueta: 'Batería 20 kWh', precio_neto: 10000000, activo: true };
      mockTerminal.mockResolvedValue({ data: mockData, error: null });

      const url = new URL('http://localhost/api/admin/battery');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ id: 1, etiqueta: 'Batería 20 kWh', precioNeto: 10000000 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({ battery: mockData });
    });
  });
});
