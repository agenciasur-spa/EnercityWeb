/**
 * Hardcoded ROI averages for Chile central.
 * PM decision: conservative approach - use averages instead of per-comuna data.
 */
export const ROI_CONSTANTS = {
  radiacionGhi: 1600, // kWh/m²/año — Chile central average
  tarifaEst: 180, // CLP/kWh — average electricity rate
  performanceRatio: 0.75, // system performance ratio
} as const;
