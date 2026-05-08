import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { sendContactEmails } from '../../lib/email';
import { z } from 'zod';
import { checkRateLimit, getClientIP, createRateLimitResponse } from '../../lib/rate-limit';
import { verifyTurnstileToken } from '../../lib/turnstile';

function isGibberish(text: string): boolean {
  if (!text || text.length < 4) return false;
  const vowels = text.match(/[aeiouáéíóúü]/gi)?.length || 0;
  const consonants = text.replace(/[aeiouáéíóúü\s\d]/gi, '').length;
  const total = vowels + consonants;
  if (total === 0) return false;
  return consonants / total > 0.65; // 65% consonants = likely gibberish
}

export const prerender = false;

const contactSchema = z.object({
  nombre: z.string().min(3, 'Nombre demasiado corto').transform(v => v.trim().slice(0, 255)),
  email: z.string().email('Email inválido').transform(v => v.trim().slice(0, 255)),
  telefono: z.string().optional().transform(v => v?.trim().slice(0, 50) || undefined),
  proyecto: z.enum(['residencial', 'industrial', 'agricola'], { errorMap: () => ({ message: 'Proyecto inválido' }) }),
  mensaje: z.string().optional().transform(v => v?.trim().slice(0, 2000) || undefined),
  website: z.string().optional().transform(v => v?.trim() || undefined),
  captchaToken: z.string().optional().transform(v => v || ''),
  timeTaken: z.number().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.log(`[RateLimit] Bot detected from IP: ${clientIP}`);
      return createRateLimitResponse(rateLimitResult.resetAt);
    }

    const body = await request.json();

    // Honeypot check
    if (body.website && body.website.trim() !== '') {
      console.log(`[Honeypot] Bot detected from IP: ${clientIP} - website field filled: "${body.website}"`);
      return new Response(JSON.stringify({ error: 'Bot detected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Time honeypot check
    if (typeof body.timeTaken === 'number' && body.timeTaken < 3000) {
      console.log(`[TimeHoneypot] Bot detected from IP: ${clientIP} - timeTaken: ${body.timeTaken}ms`);
      return new Response(JSON.stringify({ error: 'Form submitted too fast' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Turnstile check
    if (!await verifyTurnstileToken(body.captchaToken || '')) {
      console.log(`[Turnstile] Bot detected from IP: ${clientIP}`);
      return new Response(JSON.stringify({ error: 'Captcha invalido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return new Response(JSON.stringify({ error: firstError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { nombre, email, telefono, proyecto, mensaje, website } = parsed.data;

    // Gibberish check on mensaje
    if (mensaje) {
      const vowels = mensaje.match(/[aeiouáéíóúü]/gi)?.length || 0;
      const consonants = mensaje.replace(/[aeiouáéíóúü\s\d]/gi, '').length;
      const total = vowels + consonants;
      const ratio = total > 0 ? consonants / total : 0;
      console.log(`[DEBUG] Gibberish check: "${mensaje}" | vowels=${vowels} consonants=${consonants} ratio=${(ratio*100).toFixed(1)}%`);
    }
    if (mensaje && isGibberish(mensaje)) {
      console.log(`[Gibberish] Spam detected from IP: ${clientIP} - mensaje: "${mensaje}"`);
      return new Response(JSON.stringify({ error: 'Mensaje inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        nombre,
        email,
        telefono: telefono || null,
        proyecto,
        mensaje: mensaje || null,
        estado: 'nuevo',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting contact:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[API] Contacto creado: ${email}`);

    try {
      await sendContactEmails({
        nombre,
        email,
        telefono,
        proyecto,
        mensaje,
      });
    } catch (emailError) {
      console.error('[Email] Fallo en envio (no bloquea respuesta):', emailError);
    }

    return new Response(JSON.stringify({ success: true, contact: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing contact:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};