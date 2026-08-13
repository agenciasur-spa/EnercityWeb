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

export const GET: APIRoute = async ({ url, request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();
  try {
    const searchParams = new URL(url).searchParams;
    const tipo = searchParams.get('tipo');
    const activo = searchParams.get('activo');

    let query = supabaseAdmin
      .from('equipment_details')
      .select('*')
      .order('tipo', { ascending: true })
      .order('created_at', { ascending: false });

    if (tipo && (tipo === 'inversor' || tipo === 'panel')) {
      query = query.eq('tipo', tipo);
    }

    if (activo !== null) {
      query = query.eq('activo', activo === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ equipment: data || [] });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { id, tipo, nombre, marca, modelo, potenciaWatts, descripcion, garantia, imagenUrl, fichaTecnicaUrl, activo = true } = body;

    if (!tipo || !nombre || !marca) {
      return jsonResponse({ error: 'Faltan campos requeridos: tipo, nombre, marca' }, 400);
    }

    if (tipo !== 'inversor' && tipo !== 'panel') {
      return jsonResponse({ error: 'Tipo debe ser "inversor" o "panel"' }, 400);
    }

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('equipment_details')
        .update({
          tipo,
          nombre,
          marca,
          modelo,
          potencia_watts: potenciaWatts,
          descripcion,
          garantia,
          imagen_url: imagenUrl,
          ficha_tecnica_url: fichaTecnicaUrl,
          activo,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ equipment: data }, 200);
    }

    const { data, error } = await supabaseAdmin
      .from('equipment_details')
      .insert({
        tipo,
        nombre,
        marca,
        modelo,
        potencia_watts: potenciaWatts,
        descripcion,
        garantia,
        imagen_url: imagenUrl,
        ficha_tecnica_url: fichaTecnicaUrl,
        activo,
      })
      .select()
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ equipment: data }, 201);
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { id, tipo, nombre, marca, modelo, potenciaWatts, descripcion, garantia, imagenUrl, fichaTecnicaUrl, activo = true } = body;

    if (!id) {
      return jsonResponse({ error: 'Falta el campo id' }, 400);
    }

    if (!tipo || !nombre || !marca) {
      return jsonResponse({ error: 'Faltan campos requeridos: tipo, nombre, marca' }, 400);
    }

    if (tipo !== 'inversor' && tipo !== 'panel') {
      return jsonResponse({ error: 'Tipo debe ser "inversor" o "panel"' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('equipment_details')
      .update({
        tipo,
        nombre,
        marca,
        modelo,
        potencia_watts: potenciaWatts,
        descripcion,
        garantia,
        imagen_url: imagenUrl,
        ficha_tecnica_url: fichaTecnicaUrl,
        activo,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ equipment: data }, 200);
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return jsonResponse({ error: 'Falta el parámetro id' }, 400);
    }

    const { error } = await supabaseAdmin
      .from('equipment_details')
      .delete()
      .eq('id', id);

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};