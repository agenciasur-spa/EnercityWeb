import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import {
  findKitByConsumoAnual,
  calculateFinalPrice,
  calculateROI,
  classifyInvestment,
} from '../../lib/services/pricing';
import { getActiveTechos, getActiveMedidores } from '../../lib/services/variables';
import { ROI_CONSTANTS } from '../../lib/constants/roi';
import type { Kit } from '../../types/simulation';
import type { VariablesTecho, VariablesMedidor } from '../../types/simulation';

export const prerender = false;

type EstadoResultado = 'OK' | 'LIMITE' | 'EJECUTIVO' | 'ERROR';

interface RequestBody {
  montoBoleta: number;
  comunaId: number;
  // New: numeric IDs from DB
  techoId?: number;
  medidorId?: number;
  // Backward compat: string labels
  tipoTecho?: string;
  tipoMedidor?: string;
}

/**
 * Resolve the techo variable: prefer numeric ID, fall back to name match.
 */
function resolveTecho(
  techos: VariablesTecho[],
  techoId?: number,
  tipoTecho?: string
): VariablesTecho | null {
  if (techoId != null) {
    return techos.find((t) => t.id === techoId) ?? null;
  }
  if (tipoTecho) {
    return techos.find((t) => t.nombre.toLowerCase() === tipoTecho.toLowerCase()) ?? null;
  }
  return null;
}

/**
 * Resolve the medidor variable: prefer numeric ID, fall back to name match.
 */
function resolveMedidor(
  medidores: VariablesMedidor[],
  medidorId?: number,
  tipoMedidor?: string
): VariablesMedidor | null {
  if (medidorId != null) {
    return medidores.find((m) => m.id === medidorId) ?? null;
  }
  if (tipoMedidor) {
    return medidores.find((m) => m.nombre.toLowerCase() === tipoMedidor.toLowerCase()) ?? null;
  }
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: RequestBody = await request.json();
    const { montoBoleta, comunaId, techoId, medidorId, tipoTecho, tipoMedidor } = body;

    if (!montoBoleta || !comunaId) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!(techoId ?? tipoTecho) || !(medidorId ?? tipoMedidor)) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: techo y medidor' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Fetch all kits first (limits derived from actual data) ---
    const { data: dbKits, error: errorKits } = await supabase
      .from('precios_kits')
      .select('*')
      .order('rango_desde', { ascending: true });

    if (errorKits || !dbKits) {
      return new Response(
        JSON.stringify({
          estado: 'ERROR' as EstadoResultado,
          mensaje: 'No se pudieron cargar los kits.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Derive limits from actual kit ranges
    const limiteInferior = dbKits[0]?.rango_desde ?? 50000;
    const limiteSuperior = dbKits[dbKits.length - 1]?.rango_hasta ?? 404024;

    // --- Validate limits ---
    if (montoBoleta < limiteInferior) {
      return new Response(
        JSON.stringify({
          estado: 'LIMITE' as EstadoResultado,
          mensaje: `El monto mínimo para un sistema solar es de $${limiteInferior.toLocaleString('es-CL')}.`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (montoBoleta > limiteSuperior) {
      return new Response(
        JSON.stringify({
          estado: 'EJECUTIVO' as EstadoResultado,
          mensaje: 'Tu consumo es alto. Un ejecutivo te contactará.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Fetch comuna (backward compat: savings-calculator reads datosComuna) ---
    const { data: comuna, error: errorComuna } = await supabase
      .from('comunas')
      .select('id, nombre, region, radiacion_ghi, tarifa_est')
      .eq('id', comunaId)
      .single();

    const kits: Kit[] = dbKits.map((k: any) => ({
      id: k.id,
      nombre: '',
      consumoBruto: k.consumo_bruto ?? 0,
      amperajeNecesario: k.amperaje_necesario ?? '',
      inversorKw: Number(k.inversor_kw),
      paneles: k.paneles,
      kwp: Number(k.kwp),
      precioNetoBase: Number(k.precio_neto_base ?? k.precio_transferencia ?? 0),
      rangoDesde: k.rango_desde != null ? Number(k.rango_desde) : undefined,
      rangoHasta: k.rango_hasta != null ? Number(k.rango_hasta) : undefined,
      precioLista: k.precio_lista != null ? Number(k.precio_lista) : undefined,
      precioTransferencia: k.precio_transferencia != null ? Number(k.precio_transferencia) : undefined,
      potenciaPanel: k.potencia_panel != null ? Number(k.potencia_panel) : undefined,
      potenciaTotalSistema: k.potencia_total_sistema != null ? Number(k.potencia_total_sistema) : undefined,
      generacionAnual: k.generacion_anual != null ? Number(k.generacion_anual) : undefined,
    }));

    const kit = findKitByConsumoAnual(kits, montoBoleta);

    if (!kit) {
      return new Response(
        JSON.stringify({
          estado: 'ERROR' as EstadoResultado,
          mensaje: 'No se encontró un kit compatible.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Fetch techo and medidor variables from DB ---
    const [techos, medidores] = await Promise.all([
      getActiveTechos(),
      getActiveMedidores(),
    ]);

    const techo = resolveTecho(techos, techoId, tipoTecho);
    const medidor = resolveMedidor(medidores, medidorId, tipoMedidor);

    // Default to factor 1.0 if not found (graceful degradation)
    const factorTecho = techo?.factor ?? 1.0;
    const factorMedidor = medidor?.factor ?? 1.0;
    const techoNombre = techo?.nombre ?? 'Standard';
    const medidorNombre = medidor?.nombre ?? 'Standard';

    // --- Calculate prices ---
    const precioTransferencia = kit.precioTransferencia ?? kit.precioNetoBase;
    const precioLista = kit.precioLista ?? Math.round(precioTransferencia * 1.11); // fallback 11% markup
    const precioFinal = calculateFinalPrice(precioTransferencia, factorTecho, factorMedidor);

    // --- Calculate ROI ---
    const roi = calculateROI(
      kit.potenciaTotalSistema ?? kit.kwp,
      kit.generacionAnual ?? 0,
      precioFinal,
      montoBoleta
    );
    const clasificacion = classifyInvestment(roi.paybackAnos);

    // --- Build response (new + backward compat) ---
    const response = {
      estado: 'OK' as EstadoResultado,
      mensaje: null,

      // New dual-pricing fields
      kit: {
        id: kit.id,
        paneles: kit.paneles,
        potenciaTotalSistema: kit.potenciaTotalSistema ?? kit.kwp,
        inversorKw: kit.inversorKw,
        generacionAnual: kit.generacionAnual ?? 0,
        rangoDesde: kit.rangoDesde,
        rangoHasta: kit.rangoHasta,
        // Backward compat: savings-calculator reads kwp
        kwp: kit.kwp,
        consumoBruto: kit.consumoBruto,
        precioNetoBase: kit.precioNetoBase,
      },
      precio_lista: precioLista,
      precio_transferencia: precioTransferencia,
      precio_final: precioFinal,
      factors: {
        techo_nombre: techoNombre,
        techo_factor: factorTecho,
        medidor_nombre: medidorNombre,
        medidor_factor: factorMedidor,
      },
      roi: {
        ahorro_mensual: roi.ahorroMensual,
        ahorro_anual: roi.ahorroAnual,
        payback_years: roi.paybackAnos,
        cobertura_porcentaje: roi.coberturaPorcentaje,
      },

      // --- Backward compat fields (savings-calculator.tsx reads these until PR 4) ---
      input: {
        montoBoleta,
        comunaId,
        tipoTecho: tipoTecho ?? '',
        tipoMedidor: tipoMedidor ?? '',
      },
      datosComuna: comuna
        ? {
            id: comuna.id,
            nombre: comuna.nombre,
            region: comuna.region,
            radiacionGhi: Number(comuna.radiacion_ghi) || ROI_CONSTANTS.radiacionGhi,
            tarifaEst: Number(comuna.tarifa_est) || ROI_CONSTANTS.tarifaEst,
          }
        : undefined,
      calculo: {
        precioBase: precioTransferencia,
        factorTecho,
        recargoTecho: 0,
        costoMedidor: 0,
        precioSinIva: precioFinal, // backward compat alias
        iva: 0,
        precioFinal: precioFinal,
        precioFinalIva: precioFinal, // savings-calculator reads this
        consumoKwhAnual: roi.consumoKwhAnual,
        generacionAnualKwh: roi.generacionAnualKwh,
        ahorroAnual: roi.ahorroAnual,
        ahorroMensual: roi.ahorroMensual,
        coberturaPorcentaje: roi.coberturaPorcentaje,
        paybackAnos: roi.paybackAnos,
      },
      resumenInversion: {
        ahorroMensual: roi.ahorroMensual,
        ahorroAnual: roi.ahorroAnual,
        inversionTotal: precioFinal,
        anosRecuperacion: roi.paybackAnos,
        cobertura: roi.coberturaPorcentaje,
        clasificacion,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error calculating quote:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
