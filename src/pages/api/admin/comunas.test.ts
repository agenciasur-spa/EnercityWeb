import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = {
  order: vi.fn(function() { return this; }),
  eq: vi.fn(function() { return this; }),
  select: vi.fn(function() { return this; }),
  then: vi.fn(function(resolve) { resolve({ data: [], error: null }); })
};

const mockSingle = vi.fn(function() {
  return {
    then: vi.fn(function(resolve) { resolve({ data: { id: 99, nombre: 'Ñuñoa', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 5000, activa: true }, error: null }); })
  };
});

const mockInsertSelect = vi.fn(function() {
  return { single: mockSingle };
});

const mockInsert = vi.fn(function() {
  return { select: mockInsertSelect };
});

const mockUpdateEq = vi.fn(function() {
  return {
    select: vi.fn(function() {
      return {
        single: vi.fn(function() {
          return {
            then: vi.fn(function(resolve) { resolve({ data: { id: 1, nombre: 'Santiago', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 6000, activa: true }, error: null }); })
          };
        })
      };
    })
  };
});

const mockUpdate = vi.fn(function() {
  return { eq: mockUpdateEq };
});

const mockFrom = vi.fn(() => ({
  select: vi.fn(() => mockQuery),
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock('../../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('../../../lib/auth', () => ({
  getAdminUser: vi.fn(),
}));

vi.mock('../../../lib/validations/admin', () => ({
  validateComunaData: vi.fn(() => ({ valid: true })),
}));

const { GET, POST, PUT, DELETE } = await import('./comunas');
const { getAdminUser } = await import('../../../lib/auth');
const { validateComunaData } = await import('../../../lib/validations/admin');

describe('/api/admin/comunas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminUser = {
    id: '123',
    email: 'admin@test.com',
    role: 'admin',
  };

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result).toEqual({ error: 'No autorizado' });
      expect(getAdminUser).toHaveBeenCalledWith(request);
    });

    it('returns comunas when user is authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);

      const mockData = [
        { id: 1, nombre: 'Santiago', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 5000, activa: true },
        { id: 2, nombre: 'Providencia', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 5000, activa: true },
      ];
      
      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockData, error: null });
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(getAdminUser).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
      expect(result).toEqual({ comunas: mockData });
    });

    it('filters by region when region param is provided', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);

      const url = new URL('http://localhost/api/admin/comunas?region=Metropolitana');
      const request = new Request(url);
      await GET({ url, request } as any);

      expect(mockQuery.eq).toHaveBeenCalledWith('region', 'Metropolitana');
    });

    it('includes inactive comunas when includeInactive=true', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);

      const url = new URL('http://localhost/api/admin/comunas?includeInactive=true');
      const request = new Request(url);
      await GET({ url, request } as any);

      expect(mockQuery.eq).not.toHaveBeenCalledWith('activa', true);
    });

    it('returns 500 on database error', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);

      mockQuery.then.mockImplementation(function(resolve, reject) {
        reject(new Error('DB fail'));
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url);
      const response = await GET({ url, request } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Error interno del servidor');
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({ nombre: 'Test Comuna', region: 'Test Region' }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result).toEqual({ error: 'No autorizado' });
    });

    it('creates new comuna when authenticated and valid data', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      vi.mocked(validateComunaData).mockReturnValue({ valid: true });

      const mockExistingComunas = [
        { id: 99, nombre: 'Ñuñoa', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 5000, activa: true },
      ];

      const mockNewComuna = { id: 99, nombre: 'Ñuñoa', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 5000, activa: true };
      
      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockExistingComunas, error: null });
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Ñuñoa',
          region: 'Metropolitana',
          radiacion_ghi: 5.5,
          tarifa_est: 175,
          dispatch_cost: 5000,
          activa: true,
        }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(validateComunaData).toHaveBeenCalledWith({
        nombre: 'Ñuñoa',
        region: 'Metropolitana',
        radiacion_ghi: 5.5,
        tarifa_est: 175,
        dispatch_cost: 5000,
        activa: true,
      }, false, mockExistingComunas);
      expect(response.status).toBe(201);
      expect(result.data).toEqual(mockNewComuna);
    });

    it('returns 400 when validation fails', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      vi.mocked(validateComunaData).mockReturnValue({ valid: false, error: 'nombre es requerido' });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({ region: 'Test' }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('nombre es requerido');
    });

    it('returns 409 when duplicate comuna exists', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      vi.mocked(validateComunaData).mockReturnValue({
        valid: false,
        error: 'Ya existe una comuna activa con el nombre "Santiago" en la región Metropolitana.'
      });

      const mockExistingComunas = [
        { id: 1, nombre: 'Santiago', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 5000, activa: true },
      ];

      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockExistingComunas, error: null });
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Santiago',
          region: 'Metropolitana',
          radiacion_ghi: 5.5,
          tarifa_est: 175,
          dispatch_cost: 5000,
          activa: true,
        }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.error).toContain('Ya existe una comuna activa');
    });

    it('returns 409 for duplicate with case-insensitive comparison', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      vi.mocked(validateComunaData).mockReturnValue({
        valid: false,
        error: 'Ya existe una comuna activa con el nombre "SANTIAGO" en la región Metropolitana.'
      });

      const mockExistingComunas = [
        { id: 1, nombre: 'Santiago', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 5000, activa: true },
      ];

      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockExistingComunas, error: null });
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'SANTIAGO',
          region: 'Metropolitana',
          radiacion_ghi: 5.5,
          tarifa_est: 175,
        }),
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(409);
    });

    it('returns 409 for duplicate with accent-insensitive comparison', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      vi.mocked(validateComunaData).mockReturnValue({
        valid: false,
        error: 'Ya existe una comuna activa con el nombre "Ñuñoa" en la región Metropolitana.'
      });

      const mockExistingComunas = [
        { id: 1, nombre: 'Nunoa', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 5000, activa: true },
      ];

      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockExistingComunas, error: null });
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Ñuñoa',
          region: 'Metropolitana',
          radiacion_ghi: 5.5,
          tarifa_est: 175,
        }),
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(409);
    });
  });

  describe('PUT', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ id: 1, dispatch_cost: 6000 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result).toEqual({ error: 'No autorizado' });
    });

    it('updates comuna when authenticated and valid data', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      vi.mocked(validateComunaData).mockReturnValue({ valid: true });

      const mockExistingComunas = [
        { id: 1, nombre: 'Santiago', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 6000, activa: true },
      ];

      const mockUpdatedComuna = { id: 1, nombre: 'Santiago', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 6000, activa: true };
      
      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockExistingComunas, error: null });
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ id: 1, dispatch_cost: 6000 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(validateComunaData).toHaveBeenCalledWith({ id: 1, dispatch_cost: 6000 }, true, mockExistingComunas);
      expect(response.status).toBe(200);
      expect(result.data).toEqual(mockUpdatedComuna);
    });

    it('returns 400 when missing id', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ dispatch_cost: 6000 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Se requiere id numérico');
    });

    it('returns 400 when validation fails', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      vi.mocked(validateComunaData).mockReturnValue({ valid: false, error: 'radiacion_ghi debe ser un número entre 0 y 10' });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({ id: 1, radiacion_ghi: 15 }),
      });
      const response = await PUT({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('radiacion_ghi debe ser un número entre 0 y 10');
    });

    it('returns 409 when updating to duplicate another comuna', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      vi.mocked(validateComunaData).mockReturnValue({
        valid: false,
        error: 'Ya existe una comuna activa con el nombre "Santiago" en la región Metropolitana.'
      });

      const mockExistingComunas = [
        { id: 1, nombre: 'Santiago', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 6000, activa: true },
        { id: 2, nombre: 'Providencia', region: 'Metropolitana', radiacion_ghi: 5.5, tarifa_est: 175, dispatch_cost: 6000, activa: true },
      ];

      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: mockExistingComunas, error: null });
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'PUT',
        body: JSON.stringify({
          id: 2,
          nombre: 'Santiago',
          region: 'Metropolitana',
          radiacion_ghi: 5.5,
          tarifa_est: 175,
        }),
      });
      const response = await PUT({ request } as any);

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'DELETE',
        body: JSON.stringify({ id: 1 }),
      });
      const response = await DELETE({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result).toEqual({ error: 'No autorizado' });
    });

    it('soft deletes comuna when authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);

      mockQuery.then.mockImplementation(function(resolve) {
        resolve({ data: null, error: null });
      });

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'DELETE',
        body: JSON.stringify({ id: 1 }),
      });
      const response = await DELETE({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({ success: true });
    });

    it('returns 400 when missing id', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);

      const url = new URL('http://localhost/api/admin/comunas');
      const request = new Request(url, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
      const response = await DELETE({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Se requiere id numérico');
    });
  });
});