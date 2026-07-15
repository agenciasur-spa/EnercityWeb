import { supabase } from './supabase';

export interface OpenGraphData {
  id: number;
  route: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
}

let cachedOGData: Map<string, OpenGraphData> | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getOpenGraphData(route: string): Promise<OpenGraphData | null> {
  const now = Date.now();
  
  // Si el caché está vacío o expiró, recargar
  if (!cachedOGData || (now - cacheTime) > CACHE_DURATION) {
    const { data, error } = await supabase
      .from('open_graph_data')
      .select('id, route, title, description, image_url');
    
    if (error || !data) {
      console.error('Error fetching open_graph_data:', error);
      return null;
    }
    
    // Crear un Map para búsqueda rápida por ruta
    cachedOGData = new Map(data.map(item => [item.route, item]));
    cacheTime = now;
  }
  
  return cachedOGData.get(route) || null;
}

export function clearOGDataCache(): void {
  cachedOGData = null;
  cacheTime = 0;
}
