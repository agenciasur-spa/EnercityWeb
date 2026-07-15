import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrder = vi.fn();
const mockEq = vi.fn(() => ({ order: mockOrder }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const { GET } = await import('./variables');

describe('/api/variables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns techo variables when type=techo', async () => {
    const mockData = [
      { id: 1, nombre: 'Losa', factor: 1.0, descripcion: 'Sin recargo', activo: true },
      { id: 2, nombre: 'Teja Chilena', factor: 1.14, descripcion: 'Recargo', activo: true },
    ];
    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const url = new URL('http://localhost/api/variables?type=techo');
    const response = await GET({ url } as any);
    const result = await response.json();

    expect(mockFrom).toHaveBeenCalledWith('variables_techo');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('activo', true);
    expect(mockOrder).toHaveBeenCalledWith('factor');
    expect(response.status).toBe(200);
    expect(result).toEqual(mockData);
  });

  it('returns medidor variables when type=medidor', async () => {
    const mockData = [
      { id: 1, nombre: 'Muro de la casa', factor: 1.0, descripcion: 'Interior', activo: true },
      { id: 2, nombre: 'Reja', factor: 1.05, descripcion: 'Exterior', activo: true },
    ];
    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const url = new URL('http://localhost/api/variables?type=medidor');
    const response = await GET({ url } as any);
    const result = await response.json();

    expect(mockFrom).toHaveBeenCalledWith('variables_medidor');
    expect(result).toEqual(mockData);
  });

  it('defaults to medidor table when type is missing', async () => {
    const mockData: any[] = [];
    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const url = new URL('http://localhost/api/variables');
    const response = await GET({ url } as any);
    const result = await response.json();

    expect(mockFrom).toHaveBeenCalledWith('variables_medidor');
    expect(result).toEqual([]);
  });

  it('defaults to medidor table when type is unknown', async () => {
    const mockData: any[] = [];
    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const url = new URL('http://localhost/api/variables?type=unknown');
    const response = await GET({ url } as any);

    expect(mockFrom).toHaveBeenCalledWith('variables_medidor');
  });

  it('returns empty array on supabase error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('DB fail') });

    const url = new URL('http://localhost/api/variables?type=techo');
    const response = await GET({ url } as any);
    const result = await response.json();

    expect(result).toEqual([]);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('returns empty array when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const url = new URL('http://localhost/api/variables?type=techo');
    const response = await GET({ url } as any);
    const result = await response.json();

    expect(result).toEqual([]);
  });
});
