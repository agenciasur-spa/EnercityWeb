import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = {
  order: vi.fn(function() { return this; }),
  then: vi.fn(function(resolve) { resolve({ data: [], error: null }); })
};

const mockUpdateChain = {
  eq: vi.fn(function() { return this; }),
  select: vi.fn(function() { return this; }),
  single: vi.fn(function() { return this; }),
  then: vi.fn(function(resolve) { resolve({ data: null, error: null }); })
};

const mockFrom = vi.fn(() => ({
  select: vi.fn(() => mockQuery),
  update: vi.fn(() => mockUpdateChain),
}));

vi.mock('../../../lib/supabase-admin', () => ({
  supabaseAdmin: {
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

    it('returns one row per region when user is authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      const mockData = [
        { id: 1, region: 'Antofagasta', dispatch_cost: 15000 },
        { id: 2, region: 'Metropolitana', dispatch_cost: 5000 },
      ];

      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockData, error: null });
      });

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(getAdminUser).toHaveBeenCalledWith(request);
      expect(mockFrom).toHaveBeenCalledWith('region_dispatch_costs');
      expect(response.status).toBe(200);
      expect(result).toEqual({ regions: mockData });
    });

    it('returns 500 on database error', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: null, error: { message: 'DB fail' } });
      });

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('DB fail');
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
      expect(result).toEqual({ regions: [] });
    });
  });

  describe('PUT', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ region: 'Antofagasta', dispatchCost: 6000 }),
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
        body: JSON.stringify({ region: 'Antofagasta' }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Faltan campos requeridos');
    });

    it('updates dispatch cost per region successfully when authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      mockUpdateChain.then.mockImplementation(function(resolve) {
        resolve({ data: { id: 1, region: 'Antofagasta', dispatch_cost: 6000 }, error: null });
      });

      const url = new URL('http://localhost/api/admin/dispatch-costs');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ region: 'Antofagasta', dispatchCost: 6000 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(mockFrom).toHaveBeenCalledWith('region_dispatch_costs');
      expect(response.status).toBe(200);
      expect(result).toEqual({ success: true, region: { id: 1, region: 'Antofagasta', dispatch_cost: 6000 } });
    });
  });
});
