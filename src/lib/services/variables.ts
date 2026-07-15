import { supabase } from '../supabase';
import type { VariablesTecho, VariablesMedidor } from '../types/simulation';

let cachedTechos: VariablesTecho[] | null = null;
let cachedMedidores: VariablesMedidor[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getActiveTechos(): Promise<VariablesTecho[]> {
  const now = Date.now();
  if (cachedTechos && now - cacheTime < CACHE_DURATION) {
    return cachedTechos;
  }

  const { data, error } = await supabase
    .from('variables_techo')
    .select('*')
    .eq('activo', true)
    .order('factor', { ascending: true });

  if (error || !data) return [];

  cachedTechos = data.map((t: any) => ({
    id: t.id,
    nombre: t.nombre,
    factor: Number(t.factor),
    descripcion: t.descripcion,
    activo: t.activo,
  }));
  cacheTime = now;
  return cachedTechos;
}

export async function getActiveMedidores(): Promise<VariablesMedidor[]> {
  const now = Date.now();
  if (cachedMedidores && now - cacheTime < CACHE_DURATION) {
    return cachedMedidores;
  }

  const { data, error } = await supabase
    .from('variables_medidor')
    .select('*')
    .eq('activo', true)
    .order('factor', { ascending: true });

  if (error || !data) return [];

  cachedMedidores = data.map((m: any) => ({
    id: m.id,
    nombre: m.nombre,
    factor: Number(m.factor),
    descripcion: m.descripcion,
    requiereVisitaTecnica: m.requiere_visita_tecnica,
    activo: m.activo,
  }));
  cacheTime = now;
  return cachedMedidores;
}

export function clearVariablesCache(): void {
  cachedTechos = null;
  cachedMedidores = null;
  cacheTime = 0;
}
