import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = {
  order: vi.fn(function() { return this; }),
  eq: vi.fn(function() { return this; }),
  then: vi.fn(function(resolve) { resolve({ data: [], error: null }); })
};

const mockInsert = {
  select: vi.fn(function() { return this; }),
  single: vi.fn(function() { return this; }),
  then: vi.fn(function(resolve) { resolve({ data: null, error: null }); })
};

const mockFrom = vi.fn(() => ({
  select: vi.fn(() => mockQuery),
  insert: vi.fn(() => mockInsert)
}));

vi.mock('../../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('../../../lib/auth', () => ({
  getAdminUser: vi.fn(),
}));

const { GET, POST } = await import('./equipment');
const { getAdminUser } = await import('../../../lib/auth');

describe('/api/admin/equipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/equipment');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result).toEqual({ error: 'No autorizado' });
      expect(getAdminUser).toHaveBeenCalledWith(request);
    });

    it('returns equipment when user is authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      const mockData = [
        {
          id: 1,
          tipo: 'inversor',
          nombre: 'Inversor Test',
          marca: 'Test Brand',
          modelo: 'Model X',
          potencia_watts: 5000,
          imagen_url: 'https://example.com/image.jpg',
          ficha_tecnica_url: 'https://example.com/specs.pdf',
          activo: true,
        },
      ];
      
      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockData, error: null });
      });

      const url = new URL('http://localhost/api/admin/equipment');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(getAdminUser).toHaveBeenCalledWith(request);
      expect(mockFrom).toHaveBeenCalledWith('equipment_details');
      expect(response.status).toBe(200);
      // GET maps snake_case DB columns to the camelCase shape the admin UI
      // and PDF builder expect (this used to be a pass-through, which made
      // fichaTecnicaUrl/imagenUrl/potenciaWatts always look empty).
      expect(result).toEqual({
        equipment: [
          {
            id: 1,
            tipo: 'inversor',
            nombre: 'Inversor Test',
            marca: 'Test Brand',
            modelo: 'Model X',
            potenciaWatts: 5000,
            descripcion: undefined,
            garantia: undefined,
            imagenUrl: 'https://example.com/image.jpg',
            fichaTecnicaUrl: 'https://example.com/specs.pdf',
            activo: true,
            createdAt: undefined,
            updatedAt: undefined,
          },
        ],
      });
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

      const url = new URL('http://localhost/api/admin/equipment');
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

      const url = new URL('http://localhost/api/admin/equipment');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({ equipment: [] });
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/equipment');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'inversor',
          nombre: 'Test',
          marca: 'Brand',
        }),
      });
      const response = await POST({ request } as any);
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

      const url = new URL('http://localhost/api/admin/equipment');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({ tipo: 'inversor' }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Faltan campos requeridos');
    });

    it('returns 400 when tipo is invalid', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      const url = new URL('http://localhost/api/admin/equipment');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'invalid',
          nombre: 'Test',
          marca: 'Brand',
        }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Tipo debe ser');
    });

    it('creates equipment successfully when authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue({
        id: '123',
        email: 'admin@test.com',
        role: 'admin',
      });

      const mockInsertData = {
        id: 1,
        tipo: 'inversor',
        nombre: 'Test Inversor',
        marca: 'Test Brand',
        activo: true,
      };

      mockInsert.then.mockImplementation(function(resolve) {
        resolve({ data: mockInsertData, error: null });
      });

      const url = new URL('http://localhost/api/admin/equipment');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'inversor',
          nombre: 'Test Inversor',
          marca: 'Test Brand',
        }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(mockFrom).toHaveBeenCalledWith('equipment_details');
      expect(response.status).toBe(201);
      expect(result).toEqual({ equipment: mockInsertData });
    });
  });
});