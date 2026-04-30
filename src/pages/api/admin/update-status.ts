import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminUser } from '@/lib/auth';
import { LEAD_STATUSES, CONTACT_STATUSES } from '@/types/admin';

export const prerender = false;

type LeadStatus = (typeof LEAD_STATUSES)[number];
type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const POST: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    id?: string;
    status?: string;
    notas?: string;
    table?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id, status, notas, table } = body;

  if (!id || !status || !table) {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (table !== 'leads' && table !== 'contacts') {
    return new Response(JSON.stringify({ error: 'Tabla inválida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (table === 'leads' && !LEAD_STATUSES.includes(status as LeadStatus)) {
    return new Response(JSON.stringify({ error: 'Estado inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (table === 'contacts' && !CONTACT_STATUSES.includes(status as ContactStatus)) {
    return new Response(JSON.stringify({ error: 'Estado inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rpcName = table === 'leads'
    ? 'update_lead_status_with_history'
    : 'update_contact_status_with_history';

  const rpcParams = table === 'leads'
    ? { p_lead_id: id, p_to_status: status, p_changed_by: user.id, p_notas: notas ?? null }
    : { p_contact_id: id, p_to_status: status, p_changed_by: user.id, p_notas: notas ?? null };

  const { error: rpcError } = await supabaseAdmin.rpc(rpcName, rpcParams);

  if (rpcError) {
    if (rpcError.message.includes('not found')) {
      return new Response(JSON.stringify({ error: table === 'leads' ? 'Lead no encontrado' : 'Contacto no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: rpcError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};