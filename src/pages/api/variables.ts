import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get('type');
  const table = type === 'techo' ? 'variables_techo' : 'variables_medidor';

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('activo', true)
    .order('factor');

  return new Response(JSON.stringify(data || []), {
    headers: { 'Content-Type': 'application/json' },
  });
};
