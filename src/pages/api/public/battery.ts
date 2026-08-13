import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('almacenamiento_baterias')
      .select('id, etiqueta, precio_neto')
      .eq('activo', true)
      .maybeSingle();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    if (!data) {
      return jsonResponse({ error: 'No hay batería activa configurada' }, 404);
    }

    return jsonResponse({ battery: data });
  } catch (err) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};