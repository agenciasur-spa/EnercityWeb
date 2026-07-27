import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminUser } from '@/lib/auth';
import type { ProyectoDetalle } from '@/types/proyecto-detalle';

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

function generateSlug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Fields that can be set on the row (everything except DB-managed fields)
type ProyectoRow = Omit<ProyectoDetalle, 'id' | 'created_at' | 'updated_at'>;

// ─── POST: Create a new proyecto ───────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON invalido' }, 400);
  }

  const { id, created_at, updated_at, ...rest } = body;

  const nombre = typeof rest.nombre === 'string' ? rest.nombre.trim() : '';
  if (!nombre) {
    return jsonResponse({ error: 'El nombre es obligatorio' }, 400);
  }

  const slug =
    typeof rest.slug === 'string' && rest.slug.trim()
      ? rest.slug.trim()
      : generateSlug(nombre);

  const row: Record<string, unknown> = {
    ...rest,
    nombre,
    slug,
    galeria: Array.isArray(rest.galeria) ? rest.galeria : [],
  };

  const { data, error } = await supabaseAdmin
    .from('proyectos')
    .insert(row)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data }, 201);
};

// ─── PATCH: Update an existing proyecto by id ──────────────────
export const PATCH: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON invalido' }, 400);
  }

  const { id, created_at, updated_at, ...rest } = body;
  if (!id || typeof id !== 'string') {
    return jsonResponse({ error: 'Se requiere id' }, 400);
  }

  const row: Record<string, unknown> = { ...rest };

  // Regenerate slug if nombre changed and no explicit slug given
  if (typeof rest.nombre === 'string' && rest.nombre.trim() && !rest.slug) {
    row.slug = generateSlug(rest.nombre);
  }

  const { data, error } = await supabaseAdmin
    .from('proyectos')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data });
};

// ─── DELETE: Delete a proyecto by id ───────────────────────────
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

  const { error } = await supabaseAdmin
    .from('proyectos')
    .delete()
    .eq('id', body.id);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ success: true });
};
