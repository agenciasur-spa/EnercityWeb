import { supabase } from './supabase';

let cachedSettings: Record<string, number | string> | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const DEFAULT_SETTINGS: Record<string, number | string> = {
  iva: 1.19,
  limite_inferior: 50000,
  limite_superior: 400000,
  performance_ratio: 0.80,
  potencia_modulo_wp: 450,
  email_from_name: 'Enercity',
  email_from_address: 'presupuestos@enercity.cl',
  email_telefono: '+56912345678',
};

export async function getSettings(): Promise<Record<string, number | string>> {
  const now = Date.now();
  
  if (cachedSettings && (now - cacheTime) < CACHE_DURATION) {
    return cachedSettings;
  }
  
  const { data, error } = await supabase
    .from('settings')
    .select('key, value');
  
  if (error || !data) {
    console.error('Error fetching settings:', error);
    return DEFAULT_SETTINGS;
  }
  
  cachedSettings = data.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, { ...DEFAULT_SETTINGS });
  
  cacheTime = now;
  
  return cachedSettings;
}

export function clearSettingsCache(): void {
  cachedSettings = null;
  cacheTime = 0;
}
