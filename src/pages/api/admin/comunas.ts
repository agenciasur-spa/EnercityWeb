import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getAdminUser } from '../../../lib/auth';
import { validateComunaData } from '../../../lib/validations/admin';
import { normalizeRegion } from '../../../lib/constants/regions';

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
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = supabaseAdmin
      .from('comunas')
      .select('*')
      .order('region', { ascending: true })
      .order('nombre', { ascending: true });

    if (region) {
      query = query.eq('region', region);
    }

    if (!includeInactive) {
      query = query.eq('activa', true);
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

export const POST: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { nombre, region, radiacion_ghi, tarifa_est, dispatch_cost, activa } = body;

    const { data: existingComunas, error: fetchError } = await supabaseAdmin
      .from('comunas')
      .select('id, nombre, region, activa')
      .eq('activa', true);

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500);
    }

    const validation = validateComunaData(body, false, existingComunas || []);
    if (!validation.valid) {
      const isErrorDuplicate = validation.error?.includes('Ya existe una comuna activa');
      return jsonResponse({ error: validation.error }, isErrorDuplicate ? 409 : 400);
    }

    const { data, error } = await supabaseAdmin
      .from('comunas')
      .insert({
        nombre: nombre.trim(),
        region: normalizeRegion(region.trim()) || region.trim(),
        radiacion_ghi: Number(radiacion_ghi),
        tarifa_est: Number(tarifa_est),
        dispatch_cost: dispatch_cost !== undefined ? Number(dispatch_cost) : 0,
        activa: activa !== undefined ? Boolean(activa) : true,
      })
      .select()
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ data }, 201);
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { id, nombre, region, radiacion_ghi, tarifa_est, dispatch_cost, activa } = body;

    if (!id || typeof id !== 'number') {
      return jsonResponse({ error: 'Se requiere id numérico' }, 400);
    }

    const { data: existingComunas, error: fetchError } = await supabaseAdmin
      .from('comunas')
      .select('id, nombre, region, activa')
      .eq('activa', true);

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500);
    }

    const validation = validateComunaData(body, true, existingComunas || []);
    if (!validation.valid) {
      const isErrorDuplicate = validation.error?.includes('Ya existe una comuna activa');
      return jsonResponse({ error: validation.error }, isErrorDuplicate ? 409 : 400);
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre.trim();
    if (region !== undefined) {
      const normalizedRegion = normalizeRegion(region.trim());
      updateData.region = normalizedRegion || region.trim();
    }
    if (radiacion_ghi !== undefined) updateData.radiacion_ghi = Number(radiacion_ghi);
    if (tarifa_est !== undefined) updateData.tarifa_est = Number(tarifa_est);
    if (dispatch_cost !== undefined) updateData.dispatch_cost = Number(dispatch_cost);
    if (activa !== undefined) updateData.activa = Boolean(activa);

    const { data, error } = await supabaseAdmin
      .from('comunas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ data });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'number') {
      return jsonResponse({ error: 'Se requiere id numérico' }, 400);
    }

    const { error } = await supabaseAdmin
      .from('comunas')
      .update({ activa: false })
      .eq('id', id);

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};