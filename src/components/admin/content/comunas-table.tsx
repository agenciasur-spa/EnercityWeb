import { useState, useCallback, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Sun, RefreshCw, Search } from 'lucide-react';
import { CHILEAN_REGIONS } from '@/lib/constants/regions';

interface Comuna {
  id: number;
  nombre: string;
  region: string;
  radiacion_ghi: number;
  tarifa_est: number;
  activa: boolean;
  created_at: string;
}

interface ComunasTableProps {
  initialComunas: Comuna[];
}

type FormData = {
  nombre: string;
  region: string;
  radiacion_ghi: string;
  tarifa_est: string;
  activa: boolean;
};

const emptyForm: FormData = {
  nombre: '',
  region: '',
  radiacion_ghi: '5.0',
  tarifa_est: '175.00',
  activa: true,
};

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatCLP(value: number): string {
  return clpFormatter.format(value);
}

export default function ComunasTable({ initialComunas }: ComunasTableProps) {
  const [comunas, setComunas] = useState<Comuna[]>(initialComunas);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [existingComunas, setExistingComunas] = useState<Comuna[]>(initialComunas);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError('');
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((comuna: Comuna) => {
    setEditingId(comuna.id);
    setForm({
      nombre: comuna.nombre,
      region: comuna.region,
      radiacion_ghi: String(comuna.radiacion_ghi),
      tarifa_est: String(comuna.tarifa_est),
      activa: comuna.activa,
    });
    setError('');
    setDialogOpen(true);
  }, []);

  const fetchComunas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/comunas?includeInactive=true');
      if (!res.ok) throw new Error('Error al cargar comunas');
      const data = await res.json();
      setComunas(data.comunas || []);
      setExistingComunas(data.comunas || []);
    } catch (err) {
      console.error('Error fetching comunas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep existingComunas in sync
  useEffect(() => {
    setExistingComunas(comunas);
  }, [comunas]);

  const handleSave = useCallback(async () => {
    if (!form.nombre.trim()) {
      setError('Nombre es requerido');
      return;
    }

    if (!form.region) {
      setError('Región es requerida');
      return;
    }

    const radiacionGhi = Number(form.radiacion_ghi);
    if (isNaN(radiacionGhi) || radiacionGhi < 0 || radiacionGhi > 10) {
      setError('Radiación GHI debe ser un número entre 0 y 10');
      return;
    }

    const tarifaEst = Number(form.tarifa_est);
    if (isNaN(tarifaEst) || tarifaEst <= 0) {
      setError('Tarifa est debe ser un número positivo');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const payload = {
        nombre: form.nombre.trim(),
        region: form.region,
        radiacion_ghi: radiacionGhi,
        tarifa_est: tarifaEst,
        activa: form.activa,
      };

      if (editingId) {
        (payload as any).id = editingId;
      }

      const res = await fetch('/api/admin/comunas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        // Handle specific duplicate error from server
        if (res.status === 409) {
          throw new Error(responseData.error || 'Ya existe una comuna con estos datos');
        }
        throw new Error(responseData.error || 'Error al guardar');
      }

      const { data: saved } = responseData;

      if (editingId) {
        setComunas((prev) => prev.map((c) => (c.id === editingId ? saved : c)));
      } else {
        setComunas((prev) => [...prev, saved]);
      }

      setDialogOpen(false);
      await fetchComunas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }, [editingId, form, fetchComunas]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('¿Desactivar esta comuna? (soft delete)')) return;

    try {
      const res = await fetch('/api/admin/comunas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setComunas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, activa: false } : c))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, []);

  const handleToggleActive = useCallback(async (id: number, currentActiva: boolean) => {
    try {
      const res = await fetch('/api/admin/comunas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activa: !currentActiva }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      setComunas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, activa: !currentActiva } : c))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  const filteredComunas = comunas.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedComunas = filteredComunas.reduce((acc, comuna) => {
    if (!acc[comuna.region]) acc[comuna.region] = [];
    acc[comuna.region].push(comuna);
    return acc;
  }, {} as Record<string, Comuna[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Comunas</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona comunas y sus regiones asociadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchComunas} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={openCreate} className="bg-[#154660] hover:bg-[#1d5a7a]">
            <Plus className="mr-2 size-4" />
            Nueva comuna
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comuna o región..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {comunas.filter((c) => c.activa).length} activas / {comunas.length} total
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F07E04]"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedComunas).map(([region, regionComunas]) => (
            <div key={region} className="rounded-lg border bg-white overflow-hidden">
              <div className="bg-[#154660]/5 px-4 py-2 border-b">
                <h3 className="font-semibold text-[#154660]">{region}</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comuna</TableHead>
                    <TableHead className="w-24">
                      <div className="flex items-center gap-1">
                        <Sun className="w-4 h-4" />
                        GHI
                      </div>
                    </TableHead>
                    <TableHead className="w-28">Tarifa Est</TableHead>
                    <TableHead className="w-28">Estado</TableHead>
                    <TableHead className="w-32 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionComunas.map((comuna) => (
                    <TableRow key={comuna.id}>
                      <TableCell className="font-medium">{comuna.nombre}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-[#F07E04]">{comuna.radiacion_ghi}</span>
                      </TableCell>
                      <TableCell>{formatCLP(comuna.tarifa_est)}</TableCell>
                      <TableCell>
                        <button onClick={() => handleToggleActive(comuna.id, comuna.activa)}>
                          <Badge
                            className={`cursor-pointer border ${
                              comuna.activa
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {comuna.activa ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(comuna)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(comuna.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar comuna' : 'Nueva comuna'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifica los campos que necesites.' : 'Completa los datos de la nueva comuna.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="comuna-nombre" className="text-sm font-medium">Nombre *</label>
              <Input
                id="comuna-nombre"
                list="comuna-nombres"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Santiago"
              />
              {editingId === null && (
                <datalist id="comuna-nombres">
                  {Array.from(new Set(existingComunas.map(c => c.nombre))).map((nombre) => (
                    <option key={nombre} value={nombre} />
                  ))}
                </datalist>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="comuna-region" className="text-sm font-medium">Región *</label>
              <Select
                value={form.region}
                onValueChange={(value) => setForm((f) => ({ ...f, region: value }))}
              >
                <SelectTrigger id="comuna-region">
                  <SelectValue placeholder="Selecciona una región" />
                </SelectTrigger>
                <SelectContent>
                  {CHILEAN_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="comuna-radiacion" className="text-sm font-medium">
                <div className="flex items-center gap-1">
                  <Sun className="w-4 h-4" />
                  Radiación GHI *
                </div>
              </label>
              <Input
                id="comuna-radiacion"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={form.radiacion_ghi}
                onChange={(e) => setForm((f) => ({ ...f, radiacion_ghi: e.target.value }))}
                placeholder="5.50"
              />
              <p className="text-xs text-muted-foreground">
                Índice de radiación solar global (0-10)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="comuna-tarifa" className="text-sm font-medium">Tarifa Est *</label>
              <Input
                id="comuna-tarifa"
                type="number"
                step="0.01"
                min="0"
                value={form.tarifa_est}
                onChange={(e) => setForm((f) => ({ ...f, tarifa_est: e.target.value }))}
                placeholder="175.00"
              />
              <p className="text-xs text-muted-foreground">
                Tarifa eléctrica estimada (CLP/kWh)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="activa"
                checked={form.activa}
                onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))}
                className="size-4 rounded border-gray-300"
              />
              <label htmlFor="activa" className="text-sm font-medium">
                Activa
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#154660] hover:bg-[#1d5a7a]">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}