import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrder = vi.fn();
const mockEq = vi.fn(() => ({ order: mockOrder }));
const mockSelect = vi.fn(() => ({ eq: mockEq, order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('./supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { getBlogCategories } = await import('./content');
const { clearContentCache } = await import('./content-cache');

describe('getBlogCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearContentCache();
  });

  it('returns categories ordered by name', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: '1', name: 'Novedades', slug: 'novedades', created_at: '2026-01-01' }],
      error: null,
    });

    const categories = await getBlogCategories();

    expect(mockFrom).toHaveBeenCalledWith('blog_categories');
    expect(categories).toEqual([{ id: '1', name: 'Novedades', slug: 'novedades', created_at: '2026-01-01' }]);
  });

  it('falls back to an empty array on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('DB fail') });

    const categories = await getBlogCategories();

    expect(categories).toEqual([]);
  });
});
