export const LEAD_STATUSES = ['nuevo', 'contactado', 'calificado', 'cerrado'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CONTACT_STATUSES = ['nuevo', 'contactado', 'cerrado'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  nuevo: ['contactado'],
  contactado: ['calificado', 'cerrado'],
  calificado: ['cerrado'],
  cerrado: [],
};

export const CONTACT_TRANSITIONS: Record<ContactStatus, ContactStatus[]> = {
  nuevo: ['contactado'],
  contactado: ['cerrado'],
  cerrado: [],
};

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}

export interface AdminLead {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  comuna_id: number;
  comuna_nombre: string;
  kit_id: number;
  kit_label: string;
  monto_boleta_ingresado: number;
  factor_techo_aplicado: number;
  costo_fijo_medidor_aplicado: number;
  precio_final_iva: number;
  estado: LeadStatus;
  notas: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AdminContact {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  proyecto: string;
  mensaje: string | null;
  estado: ContactStatus;
  notas: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  from_status: string | null;
  to_status: string;
  notas: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  created_at: string;
}

export interface ContactStatusHistory {
  id: string;
  contact_id: string;
  from_status: string | null;
  to_status: string;
  notas: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  content: string;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
}

export type TimelineEntry =
  | { type: 'status_change'; id: string; from_status: string | null; to_status: string; notas: string | null; changed_by_email: string | null; created_at: string }
  | { type: 'note'; id: string; content: string; created_by_email: string | null; created_at: string };

export interface LeadDetailData {
  lead: AdminLead;
  status_history: LeadStatusHistory[];
  notes: LeadNote[];
  timeline: TimelineEntry[];
}

export interface ContactDetailData {
  contact: AdminContact;
  status_history: ContactStatusHistory[];
  notes: ContactNote[];
  timeline: TimelineEntry[];
}

export interface DashboardMetrics {
  total_leads: number;
  total_contacts: number;
  leads_by_status: Record<LeadStatus, number>;
  contacts_by_status: Record<ContactStatus, number>;
  recent_leads: AdminLead[];
  recent_contacts: AdminContact[];
}

export interface StatusChangeInput {
  id: string;
  table: 'leads' | 'contacts';
  new_status: LeadStatus | ContactStatus;
  notas?: string;
}

export interface AdminSetting {
  key: string;
  value: string;
  label: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface LeadFilters {
  status?: LeadStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ContactFilters {
  status?: ContactStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}