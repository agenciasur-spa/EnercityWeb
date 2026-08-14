import type { EquipmentCard } from '../lib/pdf-types';

export interface Kit {
  id: number;
  consumoBruto: number;
  amperajeNecesario: string;
  inversorKw: number;
  paneles: number;
  kwp: number;
  precioNetoBase: number;
  // Q4 fields:
  rangoDesde?: number;
  rangoHasta?: number;
  precioLista?: number;
  precioTransferencia?: number;
  potenciaPanel?: number;
  potenciaTotalSistema?: number;
  generacionAnual?: number;
}

export interface VariablesTecho {
  id: number;
  nombre: string;
  factor: number;
  descripcion?: string;
  activo: boolean;
}

export interface VariablesMedidor {
  id: number;
  nombre: string;
  factor: number;
  descripcion?: string;
  requiereVisitaTecnica: boolean;
  activo: boolean;
}

export interface Comuna {
  id: number;
  nombre: string;
  activa: boolean;
  region: string;
  dispatchCost?: number;
}

export type TipoTecho = 'Teja Chilena' | 'Losa' | 'Otro';
export type TipoMedidor = 'Normal' | 'Reja/Fuera';
export type EstadoLead = 'nuevo' | 'contactado' | 'cerrado' | 'perdido';

export interface SimulationInput {
  montoBoleta: number;
  tipoTecho: TipoTecho;
  tipoMedidor: TipoMedidor;
  comunaId?: number;
}

export interface SimulationResult {
  kit: Kit;
  precioBase: number;
  factorTecho: number;
  recargoTecho: number;
  costoFijoMedidor: number;
  precioSinIva: number;
  precioFinal: number;
  requiereContactoEjecutivo: boolean;
  esNoViable: boolean;
  mensaje?: string;
}

export interface LeadInput {
  nombre: string;
  email: string;
  telefono: string;
  comunaId?: number;
  region?: string;
  montoBoletaIngresado: number;
  kitId: number;
  factorTechoAplicado: number;
  techoNombreAplicado?: string;
  medidorFactorAplicado?: number;
  medidorNombreAplicado?: string;
  costoFijoMedidorAplicado: number;
  precioFinalIva: number;
  precioLista?: number;
  precioTransferencia?: number;
  precioFinal?: number;
  batteryRequired?: boolean;
  batteryCost?: number;
  dispatchCost?: number;
  equipment?: EquipmentCard[];
  garantiaText?: string;
  formasPago?: string[];
}

export interface Lead extends LeadInput {
  id: string;
  estado: EstadoLead;
  createdAt: Date;
}

export interface EquipmentDetail {
  id: number;
  tipo: 'inversor' | 'panel' | 'bateria';
  nombre: string;
  marca: string;
  modelo?: string;
  potenciaWatts?: number;
  descripcion?: string;
  garantia?: string;
  imagenUrl?: string;
  fichaTecnicaUrl?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
