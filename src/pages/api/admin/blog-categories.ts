import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminUser } from '@/lib/auth';
import { clearContentCache } from '@/lib/content-cache';

export const prerender = false;

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'No autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const POST: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON invalido' }, 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return jsonResponse({ error: 'El nombre es obligatorio' }, 400);
  }

  const slug =
    typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : generateSlug(name);

  const { data, error } = await supabaseAdmin
    .from('blog_categories')
    .insert({ name, slug })
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache('blog_categories');
  return jsonResponse({ data }, 201);
};

export const PATCH: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON invalido' }, 400);
  }

  const { id, created_at, ...rest } = body;
  if (!id || typeof id !== 'string') {
    return jsonResponse({ error: 'Se requiere id' }, 400);
  }

  const row: Record<string, unknown> = { ...rest };
  if (typeof rest.name === 'string' && rest.name.trim() && !rest.slug) {
    row.slug = generateSlug(rest.name);
  }

  const { data, error } = await supabaseAdmin
    .from('blog_categories')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache('blog_categories');
  return jsonResponse({ data });
};

export const DELETE: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON invalido' }, 400);
  }

  if (!body.id) {
    return jsonResponse({ error: 'Se requiere id' }, 400);
  }

  const { error } = await supabaseAdmin.from('blog_categories').delete().eq('id', body.id);

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache('blog_categories');
  return jsonResponse({ success: true });
};
