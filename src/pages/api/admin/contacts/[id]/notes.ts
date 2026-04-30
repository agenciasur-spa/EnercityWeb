import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminUser } from '@/lib/auth';

export const prerender = false;

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

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
    return new Response(JSON.stringify({ error: 'El contenido de la nota es requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: contact, error: contactError } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('id', id)
    .single();

  if (contactError || !contact) {
    return new Response(JSON.stringify({ error: 'Contacto no encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: note, error: insertError } = await supabaseAdmin
    .from('contact_notes')
    .insert({
      contact_id: id,
      content: body.content.trim(),
      created_by: user.id,
    })
    .select('id, contact_id, content, created_by, created_at')
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, note: { ...note, created_by_email: user.email } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};