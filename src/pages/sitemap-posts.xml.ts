import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const prerender = false;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = (site?.toString() ?? 'https://enercity.cl').replace(/\/$/, '');

  const [{ data: posts }, { data: categories }] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase.from('blog_categories').select('slug'),
  ]);

  const urls = [
    { loc: `${siteUrl}/blog`, lastmod: undefined as string | undefined },
    ...(categories ?? []).map((c) => ({ loc: `${siteUrl}/blog/categoria/${c.slug}`, lastmod: undefined as string | undefined })),
    ...(posts ?? []).map((p) => ({ loc: `${siteUrl}/blog/${p.slug}`, lastmod: p.updated_at as string })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
};
