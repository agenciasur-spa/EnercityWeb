import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockSelectEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelectForExisting = vi.fn(() => ({ eq: mockSelectEq }));

const mockSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));

const mockUpdateSelect = vi.fn(() => ({ single: mockSingle }));
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

const mockDeleteEq = vi.fn(() => ({ error: null }));
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));

const mockFrom = vi.fn(() => ({
  select: mockSelectForExisting,
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

const { POST, PATCH, DELETE } = await import('./blog-posts');
const { getAdminUser } = await import('@/lib/auth');

describe('/api/admin/blog-posts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminUser = { id: '1', email: 'admin@test.com', role: 'admin' as const };

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);
      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nueva noticia', content: 'Contenido' }),
      });
      const response = await POST({ request } as any);
      expect(response.status).toBe(401);
    });

    it('returns 400 when title is missing', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'POST',
        body: JSON.stringify({ content: 'Contenido' }),
      });
      const response = await POST({ request } as any);
      expect(response.status).toBe(400);
    });

    it('returns 400 when content is missing', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nueva noticia' }),
      });
      const response = await POST({ request } as any);
      expect(response.status).toBe(400);
    });

    it('creates a draft post with generated slug and no published_at', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      mockSingle.mockResolvedValue({
        data: { id: '1', title: 'Nueva noticia', slug: 'nueva-noticia', status: 'draft', published_at: null },
        error: null,
      });

      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nueva noticia', content: 'Contenido de la noticia' }),
      });
      const response = await POST({ request } as any);
      const result = await response.json();

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'nueva-noticia', status: 'draft', published_at: null })
      );
      expect(response.status).toBe(201);
      expect(result.data.status).toBe('draft');
    });

    it('creates a published post with published_at set', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      mockSingle.mockResolvedValue({
        data: { id: '1', title: 'Nueva noticia', slug: 'nueva-noticia', status: 'published' },
        error: null,
      });

      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nueva noticia', content: 'Contenido', status: 'published' }),
      });
      await POST({ request } as any);

      const insertedRow = mockInsert.mock.calls[0][0] as Record<string, unknown>;
      expect(insertedRow.status).toBe('published');
      expect(typeof insertedRow.published_at).toBe('string');
    });
  });

  describe('PATCH', () => {
    it('returns 400 when id is missing', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'x' }),
      });
      const response = await PATCH({ request } as any);
      expect(response.status).toBe(400);
    });

    it('clears published_at when moving back to draft', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      mockSingle.mockResolvedValue({ data: { id: '1', status: 'draft', published_at: null }, error: null });

      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'PATCH',
        body: JSON.stringify({ id: '1', status: 'draft' }),
      });
      await PATCH({ request } as any);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', published_at: null }));
    });

    it('keeps existing published_at when already published', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      mockMaybeSingle.mockResolvedValue({ data: { published_at: '2026-01-01T00:00:00.000Z' }, error: null });
      mockSingle.mockResolvedValue({ data: { id: '1', status: 'published' }, error: null });

      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'PATCH',
        body: JSON.stringify({ id: '1', status: 'published', title: 'Editado' }),
      });
      await PATCH({ request } as any);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published', published_at: '2026-01-01T00:00:00.000Z' })
      );
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(null);
      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'DELETE',
        body: JSON.stringify({ id: '1' }),
      });
      const response = await DELETE({ request } as any);
      expect(response.status).toBe(401);
    });

    it('deletes a post by id', async () => {
      vi.mocked(getAdminUser).mockResolvedValue(mockAdminUser);
      const request = new Request('http://localhost/api/admin/blog-posts', {
        method: 'DELETE',
        body: JSON.stringify({ id: '1' }),
      });
      const response = await DELETE({ request } as any);
      const result = await response.json();

      expect(mockDeleteEq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual({ success: true });
    });
  });
});
