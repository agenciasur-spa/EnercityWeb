import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const tipo = searchParams.get('tipo');
    const activo = searchParams.get('activo');

    let query = supabase
      .from('equipment_details')
      .select('*')
      .order('tipo', { ascending: true })
      .order('created_at', { ascending: false });

    if (tipo && (tipo === 'inversor' || tipo === 'panel')) {
      query = query.eq('tipo', tipo);
    }

    if (activo === 'true' || activo === 'false') {
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