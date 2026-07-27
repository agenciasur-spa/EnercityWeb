export interface ProyectoDetalle {
  id: string;
  slug: string;
  nombre: string;
  segmento: string;
  descripcion: string | null;
  imagen_portada: string | null;
  potencia_kwp: number | null;
  generacion_mwh_anual: number | null;
  cantidad_paneles: number | null;
  marca_panel: string | null;
  cantidad_inversores: number | null;
  marca_inversor: string | null;
  tipo_estructura: string | null;
  ubicacion: string | null;
  region: string | null;
  ano: number | null;
  cliente: string | null;
  galeria: string[];
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}
