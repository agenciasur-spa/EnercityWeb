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

const ALLOWED_TYPES = ['stats', 'projects', 'solutions', 'nav_links', 'site_content'] as const;
type ContentType = (typeof ALLOWED_TYPES)[number];

function isAllowedType(type: string): type is ContentType {
  return ALLOWED_TYPES.includes(type as ContentType);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── GET: List all items for a content type ───────────────────
async function handleGet(type: ContentType): Promise<Response> {
  if (type === 'site_content') {
    const { data, error } = await supabaseAdmin
      .from('site_content')
      .select('*')
      .order('section', { ascending: true });

    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ data });
  }

  const { data, error } = await supabaseAdmin
    .from(type)
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data });
}

// ─── POST: Create a new item ──────────────────────────────────
async function handleCreate(type: ContentType, body: Record<string, unknown>): Promise<Response> {
  if (type === 'site_content') {
    return jsonResponse({ error: 'No se pueden crear nuevas secciones. Solo edición.' }, 400);
  }

  // Remove id and timestamps — let DB generate them
  const { id, created_at, updated_at, ...rowData } = body;

  const { data, error } = await supabaseAdmin
    .from(type)
    .insert(rowData)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache();
  return jsonResponse({ data }, 201);
}

// ─── PUT: Update an existing item ─────────────────────────────
async function handleUpdate(type: ContentType, body: Record<string, unknown>): Promise<Response> {
  if (type === 'site_content') {
    // site_content uses `section` as the key, not `id`
    const { section, data: sectionData } = body as { section: string; data: unknown };
    if (!section || !sectionData) {
      return jsonResponse({ error: 'Se requiere section y data' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('site_content')
      .update({ data: sectionData })
      .eq('section', section)
      .select()
      .single();

    if (error) return jsonResponse({ error: error.message }, 500);
    clearContentCache();
    return jsonResponse({ data });
  }

  const { id, created_at, updated_at, ...rowData } = body;
  if (!id || typeof id !== 'string') {
    return jsonResponse({ error: 'Se requiere id' }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from(type)
    .update(rowData)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache();
  return jsonResponse({ data });
}

// ─── DELETE: Delete an item ───────────────────────────────────
async function handleDelete(type: ContentType, body: { id?: string }): Promise<Response> {
  if (type === 'site_content') {
    return jsonResponse({ error: 'No se pueden eliminar secciones' }, 400);
  }

  if (!body.id) {
    return jsonResponse({ error: 'Se requiere id' }, 400);
  }

  const { error } = await supabaseAdmin
    .from(type)
    .delete()
    .eq('id', body.id);

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache();
  return jsonResponse({ success: true });
}

// ─── PATCH: Reorder items ─────────────────────────────────────
async function handleReorder(type: ContentType, body: { items: { id: string; sort_order: number }[] }): Promise<Response> {
  if (type === 'site_content') {
    return jsonResponse({ error: 'No aplica para site_content' }, 400);
  }

  if (!body.items || !Array.isArray(body.items)) {
    return jsonResponse({ error: 'Se requiere items array' }, 400);
  }

  const results = await Promise.all(
    body.items.map((item) =>
      supabaseAdmin
        .from(type)
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed && failed.error) {
    return jsonResponse({ error: failed.error.message }, 500);
  }

  clearContentCache();
  return jsonResponse({ success: true });
}

// ─── Router: Dispatch by method ───────────────────────────────
export const GET: APIRoute = async ({ params, request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  const type = params.type;
  if (!type || !isAllowedType(type)) {
    return jsonResponse({ error: `Tipo inválido. Permitidos: ${ALLOWED_TYPES.join(', ')}` }, 400);
  }
  return handleGet(type);
};

export const POST: APIRoute = async ({ params, request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  const type = params.type;
  if (!type || !isAllowedType(type)) {
    return jsonResponse({ error: `Tipo inválido. Permitidos: ${ALLOWED_TYPES.join(', ')}` }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  // Check if this is a reorder request
  if (body._action === 'reorder') {
    return handleReorder(type, body as { items: { id: string; sort_order: number }[] });
  }

  // Check if this is a delete request
  if (body._action === 'delete') {
    return handleDelete(type, body as { id: string });
  }

  return handleCreate(type, body);
};

export const PUT: APIRoute = async ({ params, request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  const type = params.type;
  if (!type || !isAllowedType(type)) {
    return jsonResponse({ error: `Tipo inválido. Permitidos: ${ALLOWED_TYPES.join(', ')}` }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  return handleUpdate(type, body);
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  const type = params.type;
  if (!type || !isAllowedType(type)) {
    return jsonResponse({ error: `Tipo inválido. Permitidos: ${ALLOWED_TYPES.join(', ')}` }, 400);
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  return handleDelete(type, body);
};
