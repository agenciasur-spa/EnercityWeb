import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
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

export const GET: APIRoute = async ({ url, request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();
  try {
    const searchParams = new URL(url).searchParams;
    const region = searchParams.get('region');

    let query = supabase
      .from('comunas')
      .select('id, nombre, region, dispatch_cost')
      .order('region', { ascending: true })
      .order('nombre', { ascending: true });

    if (region) {
      query = query.eq('region', region);
    }

    const { data, error } = await query;

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ comunas: data || [] });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { comunaId, dispatchCost } = body;

    if (!comunaId || dispatchCost === undefined || dispatchCost === null) {
      return jsonResponse({ error: 'Faltan campos requeridos: comunaId, dispatchCost' }, 400);
    }

    const { error } = await supabase
      .from('comunas')
      .update({ dispatch_cost: dispatchCost })
      .eq('id', comunaId);

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};