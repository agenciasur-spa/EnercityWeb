import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedPosts } from '@/lib/content';

export const prerender = false;

export async function GET(context: APIContext) {
  const { posts } = await getPublishedPosts({ page: 1, perPage: 30 });

  return rss({
    title: 'Blog Enercity',
    description: 'Noticias, novedades y contenido sobre energía solar de Enercity.',
    site: context.site ?? 'https://enercity.cl',
    items: posts.map((post) => ({
      title: post.title,
      description: post.excerpt ?? undefined,
      link: `/blog/${post.slug}`,
      pubDate: post.published_at ? new Date(post.published_at) : undefined,
      categories: post.category ? [post.category.name] : undefined,
    })),
  });
}
