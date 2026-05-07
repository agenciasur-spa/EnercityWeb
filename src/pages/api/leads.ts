import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { sendLeadEmails } from '../../lib/email';
import type { LeadInput } from '../../types/simulation';

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeString(str: string): string {
  return str.trim().slice(0, 255);
}

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

const TIPO_TECHO_MAP: Record<number, string> = {
  1.0:   'Losa / Zinc / Pizarreño / Industrial',
  1.05:  'Teja Asfáltica',
  1.12:  'Teja Colonial',
  1.142: 'Teja Chilena',
};

const TIPO_MEDIDOR_MAP: Record<number, string> = {
  0:      'Muro de la casa',
  350000: 'Reja',
  450000: 'Fuera de la casa (Poste)',
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: LeadInput = await request.json();

    let { nombre, email, telefono, comunaId, montoBoletaIngresado, kitId, factorTechoAplicado, costoFijoMedidorAplicado, precioFinalIva } = body;

    if (!nombre || !email || !kitId || precioFinalIva === undefined) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    nombre = sanitizeString(nombre);
    email = sanitizeString(email);
    telefono = telefono ? sanitizeString(telefono) : '';

    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ error: 'Email invalido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (precioFinalIva <= 0) {
      return new Response(JSON.stringify({ error: 'Precio final invalido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: kitData } = await supabase
      .from('precios_kits')
      .select('*')
      .eq('id', kitId)
      .single();

    if (!kitData) {
      return new Response(JSON.stringify({ error: 'Kit no valido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let comunaNombre = 'No especificada';
    if (comunaId) {
      const { data: comunaData } = await supabase
        .from('comunas')
        .select('nombre')
        .eq('id', comunaId)
        .single();
      if (comunaData?.nombre) comunaNombre = comunaData.nombre;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        nombre,
        email,
        telefono: telefono || null,
        comuna_id: comunaId || null,
        monto_boleta_ingresado: montoBoletaIngresado,
        kit_id: kitId,
        factor_techo_aplicado: factorTechoAplicado,
        costo_fijo_medidor_aplicado: costoFijoMedidorAplicado,
        precio_final_iva: precioFinalIva,
        estado: 'nuevo'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting lead:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API] Lead creado: ${email}`);

    const tipoTechoLabel = TIPO_TECHO_MAP[factorTechoAplicado] ?? 'Otro';
    const tipoMedidorLabel = TIPO_MEDIDOR_MAP[costoFijoMedidorAplicado] ?? 'No especificado';

    let emailErrorDetails = null;
    try {
      await sendLeadEmails({
        cliente: {
          nombre,
          email,
          telefono: telefono || 'No proporcionado',
        },
        comuna: { nombre: comunaNombre },
        kit: {
          kwp: Number(kitData.kwp),
          paneles: kitData.paneles,
          inversorKw: Number(kitData.inversor_kw),
        },
        tipoTecho: tipoTechoLabel,
        tipoMedidor: tipoMedidorLabel,
        precioFinal: precioFinalIva,
        montoBoleta: montoBoletaIngresado,
        factorTecho: factorTechoAplicado,
        costoMedidor: costoFijoMedidorAplicado,
      });
    } catch (emailError) {
      emailErrorDetails = {
        message: emailError instanceof Error ? emailError.message : 'Error desconocido',
        stack: emailError instanceof Error ? emailError.stack : undefined,
        timestamp: new Date().toISOString()
      };
      console.error('[Email] Fallo en envio (no bloquea respuesta):', emailError);
      console.error('[Email] Error details:', JSON.stringify(emailErrorDetails, null, 2));
    }

    return new Response(JSON.stringify({ 
      success: true, 
      lead: data,
      email: emailErrorDetails ? { 
        failed: true, 
        details: emailErrorDetails 
      } : { 
        failed: false 
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error processing lead:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
