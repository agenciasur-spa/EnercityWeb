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
      .from('region_dispatch_costs')
      .select('id, region, dispatch_cost')
      .order('region', { ascending: true });

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ regions: data || [] });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { region, dispatchCost } = body;

    if (!region || dispatchCost === undefined || dispatchCost === null) {
      return jsonResponse({ error: 'Faltan campos requeridos: region, dispatchCost' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('region_dispatch_costs')
      .update({ dispatch_cost: dispatchCost })
      .eq('region', region)
      .select()
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ success: true, region: data });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};
