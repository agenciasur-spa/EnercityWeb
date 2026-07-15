import type { DashboardMetrics as DashboardMetricsType } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DashboardMetricsProps {
  metrics: DashboardMetricsType;
}

const STATUS_COLORS: Record<string, string> = {
  nuevo: 'bg-blue-100 text-blue-700 border-blue-200',
  contactado: 'bg-amber-100 text-amber-700 border-amber-200',
  calificado: 'bg-green-100 text-green-700 border-green-200',
  cerrado: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  calificado: 'Calificado',
  cerrado: 'Cerrado',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

function MetricCard({ icon, value, label, accent }: { icon: string; value: number; label: string; accent: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status] ?? ''}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function RecentLeadsTable({ leads }: { leads: DashboardMetricsType['recent_leads'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay leads</p>
        ) : (
          <ul className="space-y-3">
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{lead.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={lead.estado} />
                  <span className="text-xs text-muted-foreground">{formatDate(lead.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentContactsTable({ contacts }: { contacts: DashboardMetricsType['recent_contacts'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contactos Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay contactos</p>
        ) : (
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{contact.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={contact.estado} />
                  <span className="text-xs text-muted-foreground">{formatDate(contact.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general del panel</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon="👥" value={metrics.total_leads} label="Total Leads" accent="bg-[#154660]/10 text-[#154660]" />
        <MetricCard icon="✉️" value={metrics.total_contacts} label="Total Contactos" accent="bg-[#154660]/10 text-[#154660]" />
        <MetricCard icon="🆕" value={metrics.leads_by_status.nuevo} label="Leads Nuevos" accent="bg-blue-50 text-blue-600" />
        <MetricCard icon="🆕" value={metrics.contacts_by_status.nuevo} label="Contactos Nuevos" accent="bg-blue-50 text-blue-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentLeadsTable leads={metrics.recent_leads} />
        <RecentContactsTable contacts={metrics.recent_contacts} />
      </div>
    </div>
  );
}

export { StatusBadge };