import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminUser } from '@/lib/auth';
import { CONTACT_STATUSES } from '@/types/admin';

export const prerender = false;

type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const POST: APIRoute = async ({ request, params }) => {
  const user = await getAdminUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID de contacto faltante' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { status?: string; notas?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.status || !CONTACT_STATUSES.includes(body.status as ContactStatus)) {
    return new Response(JSON.stringify({ error: 'Estado inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: result, error: rpcError } = await supabaseAdmin.rpc(
    'update_contact_status_with_history',
    {
      p_contact_id: id,
      p_to_status: body.status,
      p_changed_by: user.id,
      p_notas: body.notas ?? null,
    }
  );

  if (rpcError) {
    if (rpcError.message.includes('not found')) {
      return new Response(JSON.stringify({ error: 'Contacto no encontrado' }), {
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