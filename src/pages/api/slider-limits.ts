import type { APIRoute } from 'astro';
import { getSettings } from '../../lib/settings';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const settings = await getSettings();
    
    return new Response(
      JSON.stringify({
        limiteInferior: Number(settings.limite_inferior) || 50000,
        limiteSuperior: Number(settings.limite_superior) || 400000,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[slider-limits] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error al cargar límites' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
