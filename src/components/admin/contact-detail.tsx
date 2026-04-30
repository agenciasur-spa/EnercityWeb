import { useState, useCallback } from 'react';
import type { ContactDetailData, ContactStatus, TimelineEntry } from '@/types/admin';
import { CONTACT_TRANSITIONS } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeftIcon,
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { Timeline } from '@/components/admin/timeline';
import { AddNoteForm } from '@/components/admin/add-note-form';

const STATUS_LABELS: Record<ContactStatus, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  cerrado: 'Cerrado',
};

const STATUS_COLORS: Record<ContactStatus, string> = {
  nuevo: 'bg-blue-100 text-blue-800 border-blue-200',
  contactado: 'bg-amber-100 text-amber-800 border-amber-200',
  cerrado: 'bg-gray-100 text-gray-600 border-gray-200',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ContactDetailProps {
  data: ContactDetailData;
  adminUserId: string;
  adminEmail: string;
}

function ContactDetail({ data, adminUserId, adminEmail }: ContactDetailProps) {
  const { contact } = data;
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>(data.timeline);
  const [currentStatus, setCurrentStatus] = useState<ContactStatus>(contact.estado as ContactStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogNewStatus, setDialogNewStatus] = useState<ContactStatus | null>(null);
  const [dialogNotas, setDialogNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleStatusSelect = useCallback((newStatus: ContactStatus) => {
    setDialogNewStatus(newStatus);
    setDialogNotas('');
    setStatusError(null);
    setDialogOpen(true);
  }, []);

  const handleDialogConfirm = useCallback(async () => {
    if (!dialogNewStatus) return;

    setSubmitting(true);
    setStatusError(null);

    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: dialogNewStatus,
          notas: dialogNotas || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Error al actualizar');
      }

      const newEntry: TimelineEntry = {
        type: 'status_change',
        id: `tmp-${Date.now()}`,
        from_status: currentStatus,
        to_status: dialogNewStatus,
        notas: dialogNotas || null,
        changed_by_email: adminEmail,
        created_at: new Date().toISOString(),
      };

      setTimelineEntries(prev => [newEntry, ...prev]);
      setCurrentStatus(dialogNewStatus);
      setDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setStatusError(message);
    } finally {
      setSubmitting(false);
    }
  }, [dialogNewStatus, dialogNotas, currentStatus, contact.id, adminEmail]);

  const handleNoteAdded = useCallback((entry: TimelineEntry) => {
    setTimelineEntries(prev => [entry, ...prev]);
  }, []);

  const availableTransitions = CONTACT_TRANSITIONS[currentStatus] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <a
          href="/admin/contacts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#154660] transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a Contactos
        </a>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-[#154660]">
                {contact.nombre}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#154660] focus-visible:ring-offset-2 rounded-full">
                    <Badge
                      className={`cursor-pointer border text-sm px-3 py-1 ${STATUS_COLORS[currentStatus]}`}
                    >
                      {STATUS_LABELS[currentStatus] ?? currentStatus}
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onPointerDownOutside={(e) => e.preventDefault()}>
                  {availableTransitions.length === 0 ? (
                    <DropdownMenuItem disabled>
                      Sin transiciones disponibles
                    </DropdownMenuItem>
                  ) : (
                    availableTransitions.map((nextStatus) => (
                      <DropdownMenuItem
                        key={nextStatus}
                        onClick={() => handleStatusSelect(nextStatus)}
                      >
                        Cambiar a {STATUS_LABELS[nextStatus]}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <MailIcon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{contact.email}</p>
              </div>
            </div>
            {contact.telefono && (
              <div className="flex items-start gap-3">
                <PhoneIcon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-sm font-medium">{contact.telefono}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-4 w-4 shrink-0 flex items-center justify-center text-muted-foreground">📋</div>
              <div>
                <p className="text-xs text-muted-foreground">Proyecto</p>
                <p className="text-sm font-medium">{contact.proyecto}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarIcon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Creado</p>
                <p className="text-sm font-medium">{formatDate(contact.created_at)}</p>
              </div>
            </div>
          </div>

          {contact.mensaje && (
            <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquareIcon className="h-4 w-4" />
                Mensaje
              </div>
              <p className="text-sm whitespace-pre-wrap">{contact.mensaje}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline
            entries={timelineEntries}
            statusLabels={STATUS_LABELS}
            statusColors={STATUS_COLORS}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregar nota</CardTitle>
        </CardHeader>
        <CardContent>
          <AddNoteForm
            entityType="contacts"
            entityId={contact.id}
            onNoteAdded={handleNoteAdded}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Cambiar estado a {dialogNewStatus ? STATUS_LABELS[dialogNewStatus] : ''}
            </DialogTitle>
            <DialogDescription>
              {contact.nombre} — {contact.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="status-notas" className="text-sm font-medium">
                Notas (opcional)
              </label>
              <Textarea
                id="status-notas"
                placeholder="Agregar notas sobre este cambio..."
                value={dialogNotas}
                onChange={(e) => setDialogNotas(e.target.value)}
                rows={3}
              />
            </div>

            {statusError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {statusError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleDialogConfirm}
              disabled={submitting}
              className="bg-[#154660] hover:bg-[#1d5a7a]"
            >
              {submitting ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ContactDetail };
export default ContactDetail;