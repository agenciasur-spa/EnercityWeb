import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getAdminUser } from '../../../lib/auth';

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

export const GET: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const { data, error } = await supabaseAdmin
      .from('almacenamiento_baterias')
      .select('*')
      .eq('activo', true)
      .maybeSingle();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ battery: data });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { id, etiqueta, precioNeto, activo = true } = body;

    if (!id) {
      return jsonResponse({ error: 'Falta el campo id' }, 400);
    }

    if (!etiqueta || precioNeto === undefined || precioNeto === null) {
      return jsonResponse({ error: 'Faltan campos requeridos: etiqueta, precioNeto' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('almacenamiento_baterias')
      .update({
        etiqueta,
        precio_neto: precioNeto,
        activo,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ battery: data });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};