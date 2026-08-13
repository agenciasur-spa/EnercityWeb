import { useState, useMemo, useCallback } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SearchIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTACT_STATUSES } from '@/types/admin';

type EnterpriseContactRow = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  empresa: string;
  rut: string;
  costo_electrico: string;
  region: string;
  metodo_contacto: string;
  mensaje: string | null;
  estado: string;
  created_at: string;
};

interface EmpresasContactsTableProps {
  contacts: EnterpriseContactRow[];
  total: number;
}

const ESTADO_STYLES: Record<string, string> = {
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

function exportCsv(rows: EnterpriseContactRow[]) {
  const headers = [
    'Nombre', 'Email', 'Teléfono', 'Empresa', 'RUT',
    'Costo Eléctrico', 'Región', 'Método Contacto', 'Mensaje', 'Estado', 'Fecha',
  ];
  const escape = (val: string) => `"${(val ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      escape(r.nombre), escape(r.email), escape(r.telefono ?? ''),
      escape(r.empresa), escape(r.rut), escape(r.costo_electrico),
      escape(r.region), escape(r.metodo_contacto), escape(r.mensaje ?? ''),
      escape(r.estado), escape(formatDate(r.created_at)),
    ].join(',')
  );
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contactos-empresariales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EmpresasContactsTable({ contacts, total }: EmpresasContactsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);
  const [rows, setRows] = useState<EnterpriseContactRow[]>(contacts);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, table: 'empresas_contacts' }),
      });
      if (!res.ok) throw new Error('Error al actualizar estado');
      setRows((prev) => prev.map((c) => (c.id === id ? { ...c, estado: newStatus } : c)));
    } catch (err) {
      console.error('Error updating enterprise contact status:', err);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.empresa.toLowerCase().includes(q) ||
        c.rut.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const effectivePageSize = pageSize === 'all' ? filtered.length : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const safePage = Math.min(page, totalPages - 1);

  const paginated = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const start = safePage * effectivePageSize;
    return filtered.slice(start, start + effectivePageSize);
  }, [filtered, safePage, effectivePageSize, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">
            Contactos Empresariales
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} contacto{total !== 1 ? 's' : ''} recibido{total !== 1 ? 's' : ''} desde el formulario de empresas.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
        >
          <DownloadIcon className="mr-2 size-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, empresa, RUT…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            setPageSize(v === 'all' ? 'all' : Number(v) as PageSizeOption);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((s) => (
              <SelectItem key={s} value={String(s)}>{s} por página</SelectItem>
            ))}
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Costo Eléctrico</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No hay contactos para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>{c.empresa}</TableCell>
                  <TableCell className="text-sm">{c.email}</TableCell>
                  <TableCell className="text-sm">{c.telefono ?? '—'}</TableCell>
                  <TableCell className="text-sm">{c.rut}</TableCell>
                  <TableCell className="text-sm">{c.costo_electrico}</TableCell>
                  <TableCell className="text-sm">{truncate(c.region, 20)}</TableCell>
                  <TableCell className="text-sm">{c.metodo_contacto}</TableCell>
                  <TableCell>
                    <Select
                      value={c.estado}
                      onValueChange={(v) => handleStatusChange(c.id, v)}
                      disabled={updatingId === c.id}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs" aria-label={`Cambiar estado de ${c.nombre}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(c.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {safePage + 1} de {totalPages} — {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmpresasContactsTable;
