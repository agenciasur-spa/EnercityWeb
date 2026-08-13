import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = {
  order: vi.fn(function() { return this; }),
  eq: vi.fn(function() { return this; }),
  then: vi.fn(function(resolve) { resolve({ data: [], error: null }); })
};

const mockFrom = vi.fn(() => ({
  select: vi.fn(() => mockQuery)
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('../../../lib/auth', () => ({
  getAdminUser: vi.fn(),
}));

const { GET, PUT } = await import('./dispatch-costs');
const { getAdminUser } = await import('../../../lib/auth');

describe('/api/admin/dispatch-costs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result).toEqual({ error: 'No autorizado' });
      expect(getAdminUser).toHaveBeenCalledWith(request);
    });

    it('returns comunas when user is authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      const mockData = [
        { id: 1, nombre: 'Santiago', region: 'Región Metropolitana', dispatch_cost: 5000 },
        { id: 2, nombre: 'Providencia', region: 'Región Metropolitana', dispatch_cost: 5000 },
      ];
      
      // Override the then method to return our mock data
      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockData, error: null });
      });

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(getAdminUser).toHaveBeenCalledWith(request);
      expect(mockFrom).toHaveBeenCalledWith('comunas');
      expect(response.status).toBe(200);
      expect(result).toEqual({ comunas: mockData });
    });

    it('returns 500 on database error', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      mockQuery.then.mockImplementation(function(resolve, reject) {
        reject(new Error('DB fail'));
      });

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Error interno del servidor');
    });

    it('returns empty array when no data found', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: null, error: null });
      });

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({ comunas: [] });
    });
  });

  describe('PUT', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ comunaId: 1, dispatchCost: 6000 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result).toEqual({ error: 'No autorizado' });
    });

    it('returns 400 when missing required fields', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ comunaId: 1 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Faltan campos requeridos');
    });

    it('updates dispatch cost successfully when authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) }));
      mockFrom.mockReturnValue({ update: mockUpdate });

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ comunaId: 1, dispatchCost: 6000 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(mockFrom).toHaveBeenCalledWith('comunas');
      expect(response.status).toBe(200);
      expect(result).toEqual({ success: true });
    });
  });
});