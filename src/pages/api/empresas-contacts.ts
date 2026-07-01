import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { sendEnterpriseContactEmails } from '../../lib/email';
import { z } from 'zod';
import { checkRateLimit, getClientIP, createRateLimitResponse } from '../../lib/rate-limit';
import { verifyTurnstileToken } from '../../lib/turnstile';

export const prerender = false;

// ────────────────────────────────────────────────
// Chilean RUT validation with checksum verification
// ────────────────────────────────────────────────

function isGibberish(text: string): boolean {
  if (!text || text.length < 4) return false;
  const vowels = text.match(/[aeiouáéíóúü]/gi)?.length || 0;
  const consonants = text.replace(/[aeiouáéíóúü\s\d]/gi, '').length;
  const total = vowels + consonants;
  if (total === 0) return false;
  return consonants / total > 0.65; // 65% consonants = likely gibberish
}

function validarRUT(rut: string): boolean {
  // Remove dots and spaces, keep format as XXXXXXXX-Y or XXXXXXXXY
  const clean = rut.replace(/[.\s]/g, '').toUpperCase();
  const match = clean.match(/^(\d{1,8})-?([\dK])$/);
  if (!match) return false;
  const num = parseInt(match[1], 10);
  const dv = match[2];

  // Reject all zeros
  if (num === 0) return false;

  // Calculate verification digit using modulo 11
  let sum = 0;
  let mult = 2;
  const digits = match[1].split('').reverse();
  for (const d of digits) {
    sum += parseInt(d) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expectedDv = 11 - (sum % 11);
  const computedDv =
    expectedDv === 11 ? '0' : expectedDv === 10 ? 'K' : String(expectedDv);
  return dv === computedDv;
}

// ────────────────────────────────────────────────
// Zod validation schema
// ────────────────────────────────────────────────

const COSTO_OPTIONS = [
  '$0 a $200 mil',
  '$200 a $800 mil',
  '$800mil a $1.5MM',
  '$1.5MM o más',
] as const;

const METODO_OPTIONS = ['WhatsApp', 'Correo', 'Teléfono'] as const;

const REGIONES_CHILE = [
  'Región Metropolitana de Santiago',
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  "Libertador General Bernardo O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes y de la Antártica Chilena',
] as const;

const enterpriseContactSchema = z.object({
  nombre: z
    .string()
    .min(3, 'Nombre demasiado corto')
    .transform((v) => v.trim().slice(0, 255)),
  email: z
    .string()
    .email('Email inválido')
    .transform((v) => v.trim().slice(0, 255)),
  telefono: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => v?.trim().slice(0, 50) || undefined),
  empresa: z
    .string()
    .min(2, 'Nombre de empresa demasiado corto')
    .transform((v) => v.trim().slice(0, 255)),
  rut: z
    .string()
    .min(1, 'RUT requerido')
    .refine(validarRUT, 'RUT inválido'),
  costoElectrico: z.enum(COSTO_OPTIONS, {
    errorMap: () => ({ message: 'Selecciona un rango de costo' }),
  }),
  region: z.enum(REGIONES_CHILE, {
    errorMap: () => ({ message: 'Selecciona una región válida' }),
  }),
  metodoContacto: z.enum(METODO_OPTIONS, {
    errorMap: () => ({ message: 'Selecciona un método de contacto' }),
  }),
  mensaje: z
    .string()
    .optional()
    .transform((v) => v?.trim().slice(0, 2000) || undefined),
  website: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),
  captchaToken: z
    .string()
    .optional()
    .transform((v) => v || ''),
  timeTaken: z.number().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.log(`[RateLimit] Bot detected from IP: ${clientIP}`);
      return createRateLimitResponse(rateLimitResult.resetAt);
    }

    const body = await request.json();

    // 2. Honeypot check
    if (body.website && body.website.trim() !== '') {
      console.log(
        `[Honeypot] Bot detected from IP: ${clientIP} - website field filled: "${body.website}"`,
      );
      return new Response(JSON.stringify({ error: 'Bot detectado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Time honeypot check
    if (typeof body.timeTaken === 'number' && body.timeTaken < 3000) {
      console.log(
        `[TimeHoneypot] Bot detected from IP: ${clientIP} - timeTaken: ${body.timeTaken}ms`,
      );
      return new Response(JSON.stringify({ error: 'Formulario enviado demasiado rápido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Turnstile check
    if (!(await verifyTurnstileToken(body.captchaToken || ''))) {
      console.log(`[Turnstile] Bot detected from IP: ${clientIP}`);
      return new Response(JSON.stringify({ error: 'Captcha inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Zod validation
    const parsed = enterpriseContactSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return new Response(JSON.stringify({ error: firstError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { nombre, email, telefono, empresa, rut, costoElectrico, region, metodoContacto, mensaje } =
      parsed.data;

    // 6. Gibberish check on mensaje (bot spam detection)
    if (mensaje && isGibberish(mensaje)) {
      return new Response(JSON.stringify({ error: 'Mensaje inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. Insert into enterprise_contacts table
    const { data, error } = await supabase
      .from('enterprise_contacts')
      .insert({
        nombre,
        email,
        telefono,
        empresa,
        rut,
        costo_electrico: costoElectrico,
        region,
        metodo_contacto: metodoContacto,
        mensaje: mensaje || null,
        estado: 'nuevo',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting enterprise contact:', error);
      return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 8. Send emails (non-blocking — catch errors, don't fail request)
    try {
      await sendEnterpriseContactEmails({
        nombre,
        email,
        telefono,
        empresa,
        rut,
        costoElectrico,
        region,
        metodoContacto,
        mensaje,
      });
    } catch (emailError) {
      console.error('[Email] Fallo en envío empresarial (no bloquea respuesta):', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact: { id: data?.id, nombre, email },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('Error processing enterprise contact:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
