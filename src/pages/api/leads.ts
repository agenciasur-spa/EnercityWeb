import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { sendLeadEmails } from '../../lib/email';
import { generatePDF } from '../../lib/pdfGenerator_new';
import type { PDFData } from '../../lib/pdf-types';
import type { LeadInput } from '../../types/simulation';
import { checkRateLimit, getClientIP, createRateLimitResponse } from '../../lib/rate-limit';
import { verifyTurnstileToken } from '../../lib/turnstile';

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
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.log(`[RateLimit] Bot detected from IP: ${clientIP}`);
      return createRateLimitResponse(rateLimitResult.resetAt);
    }

    const body: LeadInput = await request.json();

    // Honeypot check
    if (body.website && body.website.trim() !== '') {
      console.log(`[Honeypot] Bot detected from IP: ${clientIP} - website field filled: "${body.website}"`);
      return new Response(JSON.stringify({ error: 'Bot detected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Time honeypot check
    if (typeof (body as Record<string, unknown>).timeTaken === 'number' && (body as Record<string, unknown>).timeTaken < 3000) {
      console.log(`[TimeHoneypot] Bot detected from IP: ${clientIP} - timeTaken: ${(body as Record<string, unknown>).timeTaken}ms`);
      return new Response(JSON.stringify({ error: 'Form submitted too fast' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Turnstile check
    if (!await verifyTurnstileToken(body.captchaToken || '')) {
      console.log(`[Turnstile] Bot detected from IP: ${clientIP}`);
      return new Response(JSON.stringify({ error: 'Captcha invalido 00' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let { nombre, email, telefono, comunaId, montoBoletaIngresado, kitId, factorTechoAplicado, techoNombreAplicado, medidorNombreAplicado, costoFijoMedidorAplicado, precioFinalIva, website, precioSinIva, generacionAnualKwh, kitKwp, kitPaneles, comunaNombre, comunaRegion, ahorroAnual, ahorroMensual, anosRecuperacion, cobertura, clasificacion, batteryRequired, batteryCost, region, precioLista, precioTransferencia, precioFinal, dispatchCost, equipment, garantiaText, formasPago } = body;

    if (!nombre || !email || !telefono || !kitId || precioFinalIva === undefined) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    nombre = sanitizeString(nombre);
    email = sanitizeString(email);
    telefono = sanitizeString(telefono);

    if (!/^\d{9}$/.test(telefono)) {
      return new Response(JSON.stringify({ error: 'Teléfono debe tener exactamente 9 dígitos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    if (!comunaNombre) comunaNombre = 'No especificada';
    if (comunaId) {
      const { data: comunaData } = await supabase
        .from('comunas')
        .select('nombre')
        .eq('id', comunaId)
        .single();
      if (comunaData?.nombre) comunaNombre = comunaData.nombre;
    }

    // Generate sequential quote number: YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const { count: leadsThisYear } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${currentYear}-01-01T00:00:00Z`);
    const sequential = (leadsThisYear ?? 0) + 1;
    const numeroCotizacion = `${currentYear}-${String(sequential).padStart(4, '0')}`;

    // Insert lead. anon has INSERT-only access (leads are private data, no public SELECT),
    // so we must not request the inserted row back with `.select()`.
    const { error } = await supabase
      .from('leads')
      .insert({
        nombre,
        email,
        telefono,
        comuna_id: comunaId || null,
        region: region || comunaRegion || null,
        numero_cotizacion: numeroCotizacion,
        monto_boleta_ingresado: montoBoletaIngresado,
        kit_id: kitId,
        factor_techo_aplicado: factorTechoAplicado,
        costo_fijo_medidor_aplicado: costoFijoMedidorAplicado,
        precio_final_iva: precioFinalIva,
        battery_required: batteryRequired === true,
        battery_cost: batteryCost ? Number(batteryCost) || 0 : 0,
        estado: 'nuevo'
      });

    if (error) {
      console.error('Error inserting lead:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prefer the label the customer actually saw in the simulator; the
    // factor→label maps below are a legacy fallback and can point at the
    // wrong option (e.g. multiple techos now share the same factor).
    const tipoTechoLabel = techoNombreAplicado || TIPO_TECHO_MAP[factorTechoAplicado] || 'Otro';
    const tipoMedidorLabel = medidorNombreAplicado || TIPO_MEDIDOR_MAP[costoFijoMedidorAplicado] || 'No especificado';

    let pdfBytes: Uint8Array | undefined = undefined;
    try {
      const pdfData: PDFData = {
        customerName: nombre,
        customerEmail: email,
        customerPhone: telefono || '',
        kitName: `Kit ${kitKwp || Number(kitData.kwp)} kWP — ${kitPaneles || kitData.paneles} paneles`,
        kitPower: `${kitKwp || Number(kitData.kwp)} kWP`,
        panelCount: kitPaneles || kitData.paneles,
        panelWattage: Math.round(((kitKwp || Number(kitData.kwp)) * 1000) / (kitPaneles || kitData.paneles)),
        roofType: tipoTechoLabel,
        meterLocation: tipoMedidorLabel,
        comunaName: comunaNombre || 'No especificada',
        regionName: comunaRegion || undefined,
        monthlyBill: montoBoletaIngresado,
        annualSavings: ahorroAnual || 0,
        monthlySavings: ahorroMensual || 0,
        systemPrice: precioFinalIva,
        systemPriceNoIva: precioSinIva || 0,
        paybackYears: anosRecuperacion || 0,
        coveragePercent: cobertura || 0,
        co2Reduction: Math.round((generacionAnualKwh || 0) * 0.5),
        investmentClassification: clasificacion || 'No disponible',
        roi25Years: (ahorroAnual || 0) * 25,
        quoteDate: new Date().toISOString(),
        numeroCotizacion,
        precioLista: precioLista || undefined,
        precioTransferencia: precioTransferencia || undefined,
        precioFinal: precioFinal || undefined,
        dispatchCost: dispatchCost || 0,
        batteryCost: batteryCost ? Number(batteryCost) || 0 : 0,
        equipment: Array.isArray(equipment) && equipment.length > 0 ? equipment : undefined,
        garantiaText: garantiaText || undefined,
        formasPago: Array.isArray(formasPago) && formasPago.length > 0 ? formasPago : undefined,
      };

      pdfBytes = await generatePDF(pdfData);
    } catch (pdfError) {
      console.error('[API] Error generando PDF server-side:', pdfError);
    }

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
        pdfBytes,
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
      lead: null,
      numeroCotizacion: numeroCotizacion,
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
