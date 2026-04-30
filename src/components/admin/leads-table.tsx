import { useState, useMemo, useCallback } from 'react';
import type { LeadStatus } from '@/types/admin';
import { LEAD_STATUSES, LEAD_TRANSITIONS } from '@/types/admin';
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

type LeadRow = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estado: string;
  created_at: string;
  updated_at: string | null;
  monto_boleta_ingresado: number;
  precio_final_iva: number;
  comunas: { nombre: string } | null;
  precios_kits: { consumo_bruto: number; paneles: number; kwp: number } | null;
};

interface LeadsTableProps {
  leads: LeadRow[];
  total: number;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  calificado: 'Calificado',
  cerrado: 'Cerrado',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: 'bg-blue-100 text-blue-800 border-blue-200',
  contactado: 'bg-amber-100 text-amber-800 border-amber-200',
  calificado: 'bg-green-100 text-green-800 border-green-200',
  cerrado: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | 'all';

function formatCLP(value: number): string {
  return '$' + Number(value).toLocaleString('es-CL');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function LeadsTable({ leads, total }: LeadsTableProps) {
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLead, setDialogLead] = useState<LeadRow | null>(null);
  const [dialogNewStatus, setDialogNewStatus] = useState<LeadStatus | null>(null);
  const [dialogNotas, setDialogNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = leads;

    if (statusFilter !== 'all') {
      result = result.filter((l) => l.estado === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.nombre.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, statusFilter, search]);

  const effectivePageSize = pageSize === 'all' ? filtered.length : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const safePage = Math.min(page, totalPages - 1);

  const paginated = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const start = safePage * effectivePageSize;
    return filtered.slice(start, start + effectivePageSize);
  }, [filtered, safePage, effectivePageSize, pageSize]);

  const handleStatusSelect = useCallback((lead: LeadRow, newStatus: LeadStatus) => {
    setDialogLead(lead);
    setDialogNewStatus(newStatus);
    setDialogNotas('');
    setError(null);
    setDialogOpen(true);
  }, []);

  const handleDialogConfirm = useCallback(async () => {
    if (!dialogLead || !dialogNewStatus) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dialogLead.id,
          status: dialogNewStatus,
          notas: dialogNotas || undefined,
          table: 'leads',
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
  }, [dialogLead, dialogNewStatus, dialogNotas]);

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
            Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} leads en total
          </p>
        </div>
        <a href="/api/admin/export-leads">
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
          {LEAD_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(0); }}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? STATUS_COLORS[status]
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {STATUS_LABELS[status]}
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
              <TableHead className="hidden lg:table-cell">Comuna</TableHead>
              <TableHead className="hidden lg:table-cell">Kit</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No se encontraron leads
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    <a href={`/admin/leads/${lead.id}`} className="text-[#154660] hover:underline">{lead.nombre}</a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {lead.telefono ?? '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {lead.comunas?.nombre ?? '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {lead.precios_kits ? (
                      <span className="text-sm">
                        {lead.precios_kits.kwp} kWp · {lead.precios_kits.paneles}p
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCLP(lead.precio_final_iva)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#154660] focus-visible:ring-offset-2 rounded-full"
                        >
                          <Badge
                            className={`cursor-pointer border ${STATUS_COLORS[lead.estado as LeadStatus]}`}
                          >
                            {STATUS_LABELS[lead.estado as LeadStatus] ?? lead.estado}
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(LEAD_TRANSITIONS[lead.estado as LeadStatus] ?? []).length === 0 ? (
                          <DropdownMenuItem disabled>
                            Sin transiciones disponibles
                          </DropdownMenuItem>
                        ) : (
                          LEAD_TRANSITIONS[lead.estado as LeadStatus]?.map((nextStatus) => (
                            <DropdownMenuItem
                              key={nextStatus}
                              onClick={() => handleStatusSelect(lead, nextStatus)}
                            >
                              Cambiar a {STATUS_LABELS[nextStatus]}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatDate(lead.created_at)}
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
              Cambiar estado a {dialogNewStatus ? STATUS_LABELS[dialogNewStatus] : ''}
            </DialogTitle>
            <DialogDescription>
              {dialogLead?.nombre} — {dialogLead?.email}
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

export { LeadsTable };
export default LeadsTable;