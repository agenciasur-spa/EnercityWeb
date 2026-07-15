import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getAdminUser } from '../../../lib/auth';
import { clearContentCache } from '../../../lib/content-cache';
import { validateKitData } from '../../../lib/validations/admin';

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

// ─── GET: List all kits ordered by rango_desde ────────────────
export const GET: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  const { data, error } = await supabaseAdmin
    .from('precios_kits')
    .select(
      'id, rango_desde, rango_hasta, inversor_kw, paneles, potencia_panel, potencia_total_sistema, generacion_anual, precio_lista, precio_transferencia'
    )
    .order('rango_desde', { ascending: true });

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data });
};

// ─── PUT: Update a single kit with range validation ───────────
export const PUT: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const {
    id,
    rango_desde,
    rango_hasta,
    inversor_kw,
    paneles,
    potencia_panel,
    potencia_total_sistema,
    generacion_anual,
    precio_lista,
    precio_transferencia,
  } = body;

  if (!id || typeof id !== 'number') {
    return jsonResponse({ error: 'Se requiere id numérico' }, 400);
  }

  // Fetch all kits to validate range overlap
  const { data: allKits, error: fetchError } = await supabaseAdmin
    .from('precios_kits')
    .select('id, rango_desde, rango_hasta')
    .order('rango_desde', { ascending: true });

  if (fetchError) return jsonResponse({ error: fetchError.message }, 500);

  // Build the payload from provided fields
  const updateData: Record<string, unknown> = {};
  if (rango_desde !== undefined) updateData.rango_desde = rango_desde;
  if (rango_hasta !== undefined) updateData.rango_hasta = rango_hasta;
  if (inversor_kw !== undefined) updateData.inversor_kw = inversor_kw;
  if (paneles !== undefined) updateData.paneles = paneles;
  if (potencia_panel !== undefined) updateData.potencia_panel = potencia_panel;
  if (potencia_total_sistema !== undefined) updateData.potencia_total_sistema = potencia_total_sistema;
  if (generacion_anual !== undefined) updateData.generacion_anual = generacion_anual;
  if (precio_lista !== undefined) updateData.precio_lista = precio_lista;
  if (precio_transferencia !== undefined) updateData.precio_transferencia = precio_transferencia;

  // Range and price validation (only if range fields are being updated)
  if (rango_desde !== undefined || rango_hasta !== undefined || precio_lista !== undefined || precio_transferencia !== undefined) {
    // Merge the incoming values with existing for validation
    const existing = allKits?.find((k) => k.id === id);
    const mergedKit = {
      id,
      rango_desde: rango_desde !== undefined ? Number(rango_desde) : existing?.rango_desde ?? 0,
      rango_hasta: rango_hasta !== undefined ? Number(rango_hasta) : existing?.rango_hasta ?? 0,
      precio_lista: precio_lista !== undefined ? Number(precio_lista) : 1,
      precio_transferencia: precio_transferencia !== undefined ? Number(precio_transferencia) : 1,
    };

    const validation = validateKitData(mergedKit, allKits ?? []);
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('precios_kits')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  clearContentCache();
  return jsonResponse({ data });
};
