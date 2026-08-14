import type { EquipmentDetail } from '../../types/simulation';

/**
 * Supabase returns `equipment_details` rows in snake_case; every consumer
 * (admin table, PDF builder) expects camelCase. Centralized here so both
 * API routes (admin + public) stay in sync.
 */
export function mapEquipmentRow(row: any): EquipmentDetail {
  return {
    id: row.id,
    tipo: row.tipo,
    nombre: row.nombre,
    marca: row.marca,
    modelo: row.modelo ?? undefined,
    potenciaWatts: row.potencia_watts ?? undefined,
    descripcion: row.descripcion ?? undefined,
    garantia: row.garantia ?? undefined,
    imagenUrl: row.imagen_url ?? undefined,
    fichaTecnicaUrl: row.ficha_tecnica_url ?? undefined,
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const equipmentCache = new Map<string, EquipmentDetail[]>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  data: EquipmentDetail[];
  timestamp: number;
}

export async function fetchEquipmentCatalog(filters?: { tipo?: 'inversor' | 'panel' | 'bateria'; activo?: boolean }): Promise<EquipmentDetail[]> {
  const cacheKey = JSON.stringify(filters);
  const cached = equipmentCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const params = new URLSearchParams();
  if (filters?.tipo) params.set('tipo', filters.tipo);
  if (filters?.activo !== undefined) params.set('activo', filters.activo.toString());

  const url = `/api/public/equipment${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch equipment catalog: ${response.statusText}`);
  }

  const result = await response.json();
  const equipment = result.equipment || [];

  equipmentCache.set(cacheKey, {
    data: equipment,
    timestamp: Date.now(),
  });

  return equipment;
}

export function clearEquipmentCache(): void {
  equipmentCache.clear();
}

export function findActiveEquipmentByType(
  equipment: EquipmentDetail[],
  tipo: 'inversor' | 'panel' | 'bateria'
): EquipmentDetail | null {
  return equipment.find(eq => eq.tipo === tipo && eq.activo) || null;
}

export function buildEquipmentCard(
  equipmentDetail: EquipmentDetail | null,
  tipo: 'inversor' | 'panel' | 'bateria',
  fallbackData: { nombre: string; marca: string; modelo?: string; potenciaWatts?: number }
): EquipmentDetail {
  if (!equipmentDetail) {
    return {
      id: 0,
      tipo,
      nombre: fallbackData.nombre,
      marca: fallbackData.marca,
      modelo: fallbackData.modelo,
      potenciaWatts: fallbackData.potenciaWatts,
      descripcion: undefined,
      garantia: undefined,
      imagenUrl: undefined,
      fichaTecnicaUrl: undefined,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return {
    ...equipmentDetail,
    descripcion: equipmentDetail.descripcion || undefined,
    garantia: equipmentDetail.garantia || undefined,
    imagenUrl: equipmentDetail.imagenUrl || undefined,
    fichaTecnicaUrl: equipmentDetail.fichaTecnicaUrl || undefined,
  };
}