import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getAdminUser } from '../../../lib/auth';
import { clearContentCache } from '../../../lib/content-cache';
import { validateFactor } from '../../../lib/validations/admin';
import { clearVariablesCache } from '../../../lib/services/variables';

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

const VALID_TYPES = ['techo', 'medidor'] as const;
type VariableType = (typeof VALID_TYPES)[number];

function resolveTable(type: string): VariableType | null {
  if (type === 'techo') return 'techo';
  if (type === 'medidor') return 'medidor';
  return null;
}

function tableName(type: VariableType): string {
  return type === 'techo' ? 'variables_techo' : 'variables_medidor';
}

// ─── GET: List variables by type ──────────────────────────────
export const GET: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const type = resolveTable(url.searchParams.get('type') ?? '');

  if (!type) {
    return jsonResponse({ error: `Tipo inválido. Permitidos: ${VALID_TYPES.join(', ')}` }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from(tableName(type))
    .select('*')
    .order('factor', { ascending: true });

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data });
};

// ─── POST: Create a new variable ──────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const type = resolveTable(body.type as string);
  if (!type) {
    return jsonResponse({ error: `Tipo inválido. Permitidos: ${VALID_TYPES.join(', ')}` }, 400);
  }

  const { nombre, factor, descripcion, requiere_visita_tecnica } = body;

  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return jsonResponse({ error: 'nombre es requerido' }, 400);
  }

  const factorValidation = validateFactor(Number(factor));
  if (!factorValidation.valid) {
    return jsonResponse({ error: factorValidation.error }, 400);
  }

  const rowData: Record<string, unknown> = {
    nombre: nombre.trim(),
    factor: Number(factor),
    descripcion: descripcion ?? null,
  };

  if (type === 'medidor') {
    rowData.requiere_visita_tecnica = Boolean(requiere_visita_tecnica);
  }

  const { data, error } = await supabaseAdmin
    .from(tableName(type))
    .insert(rowData)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache();
  clearVariablesCache();
  return jsonResponse({ data }, 201);
};

// ─── PUT: Update a variable ───────────────────────────────────
export const PUT: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const type = resolveTable(body.type as string);
  if (!type) {
    return jsonResponse({ error: `Tipo inválido. Permitidos: ${VALID_TYPES.join(', ')}` }, 400);
  }

  const { id, type: _omit, nombre, factor, descripcion, requiere_visita_tecnica, activo } = body;

  if (!id || typeof id !== 'number') {
    return jsonResponse({ error: 'Se requiere id numérico' }, 400);
  }

  const updateData: Record<string, unknown> = {};
  if (nombre !== undefined) updateData.nombre = nombre;
  if (factor !== undefined) {
    const factorValidation = validateFactor(Number(factor));
    if (!factorValidation.valid) {
      return jsonResponse({ error: factorValidation.error }, 400);
    }
    updateData.factor = Number(factor);
  }
  if (descripcion !== undefined) updateData.descripcion = descripcion;
  if (activo !== undefined) updateData.activo = activo;
  if (type === 'medidor' && requiere_visita_tecnica !== undefined) {
    updateData.requiere_visita_tecnica = requiere_visita_tecnica;
  }

  const { data, error } = await supabaseAdmin
    .from(tableName(type))
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache();
  clearVariablesCache();
  return jsonResponse({ data });
};

// ─── DELETE: Soft-delete (set activo=false) ───────────────────
export const DELETE: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const type = resolveTable(body.type as string);
  if (!type) {
    return jsonResponse({ error: `Tipo inválido. Permitidos: ${VALID_TYPES.join(', ')}` }, 400);
  }

  const { id } = body;
  if (!id || typeof id !== 'number') {
    return jsonResponse({ error: 'Se requiere id numérico' }, 400);
  }

  const { error } = await supabaseAdmin
    .from(tableName(type))
    .update({ activo: false })
    .eq('id', id);

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache();
  clearVariablesCache();
  return jsonResponse({ success: true });
};
