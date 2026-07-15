import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const prerender = false;

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, title, description, image_url } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabaseAdmin
      .from('open_graph_data')
      .update({
        title,
        description,
        image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating open_graph_data:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/open-graph:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
