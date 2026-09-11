import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));

const mockUpdateEq = vi.fn(() => ({ select: mockSelect }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

const mockDeleteEq = vi.fn(() => ({ error: null }));
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));

const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('@/lib/auth', () => ({
  getAdminUser: vi.fn(),
}));

vi.mock('@/lib/content-cache', () => ({
  clearContentCache: vi.fn(),
}));

const { POST, PATCH, DELETE } = await import('./blog-categories');
const { getAdminUser } = await import('@/lib/auth');

describe('/api/admin/blog-categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminUser = { id: '1', email: 'admin@test.com', role: 'admin' as const };

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);
      const request = new Request('http://localhost/api/admin/blog-categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Novedades' }),
      });
      const response = await POST({ request } as any);
      expect(response.status).toBe(401);
    });

    it('creates a category with generated slug when authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      mockSingle.mockResolvedValue({ data: { id: '1', name: 'Novedades', slug: 'novedades' }, error: null });

      const request = new Request('http://localhost/api/admin/blog-categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Novedades' }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(mockInsert).toHaveBeenCalledWith({ name: 'Novedades', slug: 'novedades' });
      expect(response.status).toBe(201);
      expect(result.data.slug).toBe('novedades');
    });

    it('returns 400 when name is missing', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      const request = new Request('http://localhost/api/admin/blog-categories', {
        method: 'POST',
        body: JSON.stringify({ name: '  ' }),
      });
      const response = await POST({ request } as any);
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH', () => {
    it('returns 400 when id is missing', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      const request = new Request('http://localhost/api/admin/blog-categories', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'x' }),
      });
      const response = await PATCH({ request } as any);
      expect(response.status).toBe(400);
    });

    it('updates a category by id', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      mockSingle.mockResolvedValue({ data: { id: '1', name: 'Actualizado', slug: 'novedades' }, error: null });

      const request = new Request('http://localhost/api/admin/blog-categories', {
        method: 'PATCH',
        body: JSON.stringify({ id: '1', name: 'Actualizado' }),
      });
      const response = await PATCH({ request } as any);
      const result = await response.json();

      expect(mockUpdateEq).toHaveBeenCalledWith('id', '1');
      expect(response.status).toBe(200);
      expect(result.data.name).toBe('Actualizado');
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);
      const request = new Request('http://localhost/api/admin/blog-categories', {
        method: 'DELETE',
        body: JSON.stringify({ id: '1' }),
      });
      const response = await DELETE({ request } as any);
      expect(response.status).toBe(401);
    });

    it('deletes a category by id', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      const request = new Request('http://localhost/api/admin/blog-categories', {
        method: 'DELETE',
        body: JSON.stringify({ id: '1' }),
      });
      const response = await DELETE({ request } as any);
      const result = await response.json();

      expect(mockDeleteEq).toHaveBeenCalledWith('id', '1');
      expect(response.status).toBe(200);
      expect(result).toEqual({ success: true });
    });
  });
});
