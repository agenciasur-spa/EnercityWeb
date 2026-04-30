import { useState, useMemo, useCallback } from 'react';
import type { ContactStatus } from '@/types/admin';
import { CONTACT_STATUSES, CONTACT_TRANSITIONS } from '@/types/admin';
import { StatusBadge } from '@/components/admin/dashboard-metrics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  SearchIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';

type ContactRow = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  proyecto: string;
  mensaje: string | null;
  estado: string;
  created_at: string;
  updated_at: string | null;
};

interface ContactsTableProps {
  contacts: ContactRow[];
  total: number;
}

const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  cerrado: 'Cerrado',
};

const CONTACT_STATUS_COLORS: Record<ContactStatus, string> = {
  nuevo: 'bg-blue-100 text-blue-800 border-blue-200',
  contactado: 'bg-amber-100 text-amber-800 border-amber-200',
  cerrado: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | 'all';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return '—';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function ContactsTable({ contacts, total }: ContactsTableProps) {
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContact, setDialogContact] = useState<ContactRow | null>(null);
  const [dialogNewStatus, setDialogNewStatus] = useState<ContactStatus | null>(null);
  const [dialogNotas, setDialogNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = contacts;

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.estado === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [contacts, statusFilter, search]);

  const effectivePageSize = pageSize === 'all' ? filtered.length : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const safePage = Math.min(page, totalPages - 1);

  const paginated = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const start = safePage * effectivePageSize;
    return filtered.slice(start, start + effectivePageSize);
  }, [filtered, safePage, effectivePageSize, pageSize]);

  const handleStatusSelect = useCallback((contact: ContactRow, newStatus: ContactStatus) => {
    setDialogContact(contact);
    setDialogNewStatus(newStatus);
    setDialogNotas('');
    setError(null);
    setDialogOpen(true);
  }, []);

  const handleDialogConfirm = useCallback(async () => {
    if (!dialogContact || !dialogNewStatus) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dialogContact.id,
          status: dialogNewStatus,
          notas: dialogNotas || undefined,
          table: 'contacts',
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Error al actualizar');
      }

      setDialogOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [dialogContact, dialogNewStatus, dialogNotas]);

  const handlePageSizeChange = useCallback((value: string) => {
    if (value === 'all') {
      setPageSize('all');
    } else {
      setPageSize(Number(value) as PageSizeOption);
    }
    setPage(0);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">
            Contactos
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} contactos en total
          </p>
        </div>
        <a href="/api/admin/export-contacts">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 size-4" />
            Exportar CSV
          </Button>
        </a>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setStatusFilter('all'); setPage(0); }}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#154660] text-white border-[#154660]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {CONTACT_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(0); }}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? CONTACT_STATUS_COLORS[status]
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {CONTACT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Teléfono</TableHead>
              <TableHead className="hidden lg:table-cell">Proyecto</TableHead>
              <TableHead className="hidden lg:table-cell">Mensaje</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No se encontraron contactos
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    <a href={`/admin/contacts/${contact.id}`} className="text-[#154660] hover:underline">{contact.nombre}</a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {contact.telefono ?? '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {contact.proyecto}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {truncate(contact.mensaje, 40)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#154660] focus-visible:ring-offset-2 rounded-full"
                        >
                          <Badge
                            className={`cursor-pointer border ${CONTACT_STATUS_COLORS[contact.estado as ContactStatus]}`}
                          >
                            {CONTACT_STATUS_LABELS[contact.estado as ContactStatus] ?? contact.estado}
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(CONTACT_TRANSITIONS[contact.estado as ContactStatus] ?? []).length === 0 ? (
                          <DropdownMenuItem disabled>
                            Sin transiciones disponibles
                          </DropdownMenuItem>
                        ) : (
                          CONTACT_TRANSITIONS[contact.estado as ContactStatus]?.map((nextStatus) => (
                            <DropdownMenuItem
                              key={nextStatus}
                              onClick={() => handleStatusSelect(contact, nextStatus)}
                            >
                              Cambiar a {CONTACT_STATUS_LABELS[nextStatus]}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatDate(contact.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrando</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger size="sm" className="h-7 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          <span>de {filtered.length}</span>
        </div>

        {pageSize !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={safePage === 0}
              onClick={() => setPage(0)}
            >
              <ChevronsLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="px-2 text-sm text-muted-foreground">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
            >
              <ChevronsRightIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Cambiar estado a {dialogNewStatus ? CONTACT_STATUS_LABELS[dialogNewStatus] : ''}
            </DialogTitle>
            <DialogDescription>
              {dialogContact?.nombre} — {dialogContact?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="notas" className="text-sm font-medium">
                Notas (opcional)
              </label>
              <Textarea
                id="notas"
                placeholder="Agregar notas sobre este cambio..."
                value={dialogNotas}
                onChange={(e) => setDialogNotas(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
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

export { ContactsTable };
export default ContactsTable;