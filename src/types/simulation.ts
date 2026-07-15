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
  montoBoletaIngresado: number;
  kitId: number;
  factorTechoAplicado: number;
  costoFijoMedidorAplicado: number;
  precioFinalIva: number;
}

export interface Lead extends LeadInput {
  id: string;
  estado: EstadoLead;
  createdAt: Date;
}
