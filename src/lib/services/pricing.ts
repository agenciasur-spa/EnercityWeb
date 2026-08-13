import type { Kit } from '../types/simulation';
import { ROI_CONSTANTS } from '../constants/roi';

/**
 * Range-based kit lookup.
 * Finds the first kit whose [rangoDesde, rangoHasta] range contains consumoAnual.
 * Replaces the old threshold matching in quote.ts findBestKit.
 */
export function findKitByConsumoAnual(kits: Kit[], consumoAnual: number): Kit | null {
  for (const kit of kits) {
    const desde = kit.rangoDesde ?? 0;
    const hasta = kit.rangoHasta ?? Infinity;
    if (consumoAnual >= desde && consumoAnual <= hasta) {
      return kit;
    }
  }
  return null;
}

/**
 * Multiplicative pricing.
 * precio_final = precioTransferencia * factorTecho * factorMedidor
 * Replaces the additive pricing in quote.ts calculatePriceBreakdown.
 */
export function calculateFinalPrice(
  precioTransferencia: number,
  factorTecho: number,
  factorMedidor: number
): number {
  return Math.round(precioTransferencia * factorTecho * factorMedidor);
}

/**
 * ROI calculation using hardcoded averages from ROI_CONSTANTS.
 * PM decision: conservative approach — use national averages instead of per-comuna data.
 *
 * @param potenciaTotalSistema - System peak power in kW
 * @param generacionAnual - Pre-calculated annual generation in kWh (0 = fallback to estimate)
 * @param precioFinal - Final price after all factors
 * @param montoBoleta - Monthly electricity bill in CLP
 * @param dispatchCost - Regional fixed dispatch cost (optional, defaults to 0)
 */
export function calculateROI(
  potenciaTotalSistema: number,
  generacionAnual: number,
  precioFinal: number,
  montoBoleta: number,
  dispatchCost: number = 0
) {
  const { radiacionGhi, tarifaEst, performanceRatio } = ROI_CONSTANTS;

  const consumoKwhAnual = (montoBoleta / tarifaEst) * 12;
  const generacionEstimada =
    generacionAnual > 0
      ? generacionAnual
      : (potenciaTotalSistema * radiacionGhi * 365 * performanceRatio) / 1000;
  const ahorroAnual = Math.min(generacionEstimada, consumoKwhAnual) * tarifaEst;
  const ahorroMensual = ahorroAnual / 12;
  const coberturaPorcentaje =
    consumoKwhAnual > 0 ? Math.min((generacionEstimada / consumoKwhAnual) * 100, 95) : 0;

  // Include dispatch cost in payback calculation
  const totalInversion = precioFinal + dispatchCost;
  const paybackAnos = ahorroAnual > 0 ? totalInversion / ahorroAnual : 999;

  return {
    consumoKwhAnual: Math.round(consumoKwhAnual),
    generacionAnualKwh: Math.round(generacionEstimada),
    ahorroAnual: Math.round(ahorroAnual),
    ahorroMensual: Math.round(ahorroMensual),
    coberturaPorcentaje: Math.round(coberturaPorcentaje * 10) / 10,
    paybackAnos: Math.round(paybackAnos * 10) / 10,
  };
}

/**
 * Classify investment quality based on payback period.
 * <= 5 years: ALTA_RETORNO
 * <= 10 years: MEDIO_RETORNO
 * > 10 years: BAJA_RETORNO
 */
export function classifyInvestment(
  paybackYears: number
): 'ALTA_RETORNO' | 'MEDIO_RETORNO' | 'BAJA_RETORNO' {
  if (paybackYears <= 5) return 'ALTA_RETORNO';
  if (paybackYears <= 10) return 'MEDIO_RETORNO';
  return 'BAJA_RETORNO';
}
