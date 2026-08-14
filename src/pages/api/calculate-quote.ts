import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import {
  findKitByConsumoAnual,
  calculateFinalPrice,
  calculateROI,
  classifyInvestment,
} from '../../lib/services/pricing';
import { getActiveTechos, getActiveMedidores } from '../../lib/services/variables';
import { getSettings } from '../../lib/settings';
import { ROI_CONSTANTS } from '../../lib/constants/roi';
import type { Kit } from '../../types/simulation';
import type { VariablesTecho, VariablesMedidor } from '../../types/simulation';

export const prerender = false;

type EstadoResultado = 'OK' | 'LIMITE' | 'EJECUTIVO' | 'ERROR';

interface RequestBody {
  montoBoleta: number;
  comunaId?: number;
  region?: string;
  // New: numeric IDs from DB
  techoId?: number;
  medidorId?: number;
  // Battery option
  batteryRequired?: boolean;
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
    const { montoBoleta, comunaId, region, techoId, medidorId, batteryRequired, tipoTecho, tipoMedidor } = body;

    if (!montoBoleta || (!comunaId && !region)) {
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

    // --- Fetch region data: average radiacion/tarifa from all active comunas in that region ---
    // dispatch_cost lives on `region_dispatch_costs` now (one row per region), not per comuna.
    let comuna: any = null;
    let resolvedRegion: string | null = null;

    if (region) {
      resolvedRegion = region;
      const { data: regionComunas } = await supabase
        .from('comunas')
        .select('id, nombre, region, radiacion_ghi, tarifa_est')
        .eq('region', region)
        .eq('activa', true);

      if (regionComunas && regionComunas.length > 0) {
        const avgRadiacion = regionComunas.reduce((s, c) => s + Number(c.radiacion_ghi), 0) / regionComunas.length;
        const avgTarifa = regionComunas.reduce((s, c) => s + Number(c.tarifa_est), 0) / regionComunas.length;
        comuna = {
          id: regionComunas[0].id,
          nombre: region,
          region,
          radiacion_ghi: avgRadiacion,
          tarifa_est: avgTarifa,
        };
      } else {
        // No hay comunas activas cargadas para esta región (ej. Ñuble): usar
        // promedios nacionales en vez de dejar `comuna` en null, que hacía
        // caer el simulador entero en el frontend.
        comuna = {
          id: 0,
          nombre: region,
          region,
          radiacion_ghi: ROI_CONSTANTS.radiacionGhi,
          tarifa_est: ROI_CONSTANTS.tarifaEst,
        };
      }
    } else if (comunaId) {
      const { data: comunaData } = await supabase
        .from('comunas')
        .select('id, nombre, region, radiacion_ghi, tarifa_est')
        .eq('id', comunaId)
        .maybeSingle();
      comuna = comunaData;
      resolvedRegion = comuna?.region ?? null;
    }

    let dispatchCost = 0;
    if (resolvedRegion) {
      const { data: regionDispatch } = await supabase
        .from('region_dispatch_costs')
        .select('dispatch_cost')
        .eq('region', resolvedRegion)
        .maybeSingle();
      dispatchCost = regionDispatch?.dispatch_cost ? Number(regionDispatch.dispatch_cost) : 0;
    }

    // Fetch battery cost if required
    let batteryCost = 0;
    if (batteryRequired) {
      const { data: battery, error: batteryError } = await supabase
        .from('almacenamiento_baterias')
        .select('precio_neto')
        .eq('activo', true)
        .single();

      if (!batteryError && battery) {
        batteryCost = Number(battery.precio_neto) || 0;
      }
    }

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

    // --- Calculate prices (factors apply to BOTH lista and transferencia; ---
    // --- dispatch cost is added on top of both, per producto) ---
    const precioTransferenciaBase = kit.precioTransferencia ?? kit.precioNetoBase;
    const precioListaBase = kit.precioLista ?? Math.round(precioTransferenciaBase * 1.11); // fallback 11% markup
    const precioLista = calculateFinalPrice(precioListaBase, factorTecho, factorMedidor) + dispatchCost;
    const precioFinal = calculateFinalPrice(precioTransferenciaBase, factorTecho, factorMedidor) + dispatchCost + batteryCost;

    // --- Calculate ROI ---
    // precioFinal ya incluye dispatchCost + batteryCost, no volver a sumarlos.
    const roi = calculateROI(
      kit.potenciaTotalSistema ?? kit.kwp,
      kit.generacionAnual ?? 0,
      precioFinal,
      montoBoleta
    );
    const clasificacion = classifyInvestment(roi.paybackAnos);

    // Admin-editable PDF/web texts from settings
    const settings = await getSettings();
    const garantiaText = String(settings.garantia_instalacion ?? '');
    let formasPago: string[] = [];
    try {
      const raw = String(settings.formas_pago ?? '');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) formasPago = parsed.map((s) => String(s));
    } catch {
      formasPago = [];
    }

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
      precio_transferencia: precioFinal - dispatchCost - batteryCost,
      dispatch_cost: dispatchCost,
      battery_cost: batteryCost,
      battery_required: batteryRequired,
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
            dispatchCost,
          }
        : undefined,
      calculo: {
        precioBase: precioTransferenciaBase,
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
      garantia_text: garantiaText,
      formas_pago: formasPago,
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
