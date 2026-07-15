import { useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Sun, Zap } from 'lucide-react';

interface VariableTecho {
  id: number;
  nombre: string;
  factor: number;
  descripcion: string | null;
  activo: boolean;
}

interface VariableMedidor {
  id: number;
  nombre: string;
  factor: number;
  descripcion: string | null;
  requiere_visita_tecnica: boolean;
  activo: boolean;
}

interface VariablesTableProps {
  initialTechos: VariableTecho[];
  initialMedidores: VariableMedidor[];
}

type TabType = 'techo' | 'medidor';

type FormData = {
  nombre: string;
  factor: string;
  descripcion: string;
  requiere_visita_tecnica: boolean;
};

const emptyForm: FormData = {
  nombre: '',
  factor: '1.0',
  descripcion: '',
  requiere_visita_tecnica: false,
};

export default function VariablesTable({ initialTechos, initialMedidores }: VariablesTableProps) {
  const [techos, setTechos] = useState<VariableTecho[]>(initialTechos);
  const [medidores, setMedidores] = useState<VariableMedidor[]>(initialMedidores);
  const [activeTab, setActiveTab] = useState<TabType>('techo');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError('');
    setDialogOpen(true);
  }, []);

  const openEditTecho = useCallback((item: VariableTecho) => {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      factor: String(item.factor),
      descripcion: item.descripcion ?? '',
      requiere_visita_tecnica: false,
    });
    setError('');
    setDialogOpen(true);
  }, []);

  const openEditMedidor = useCallback((item: VariableMedidor) => {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      factor: String(item.factor),
      descripcion: item.descripcion ?? '',
      requiere_visita_tecnica: item.requiere_visita_tecnica,
    });
    setError('');
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.nombre.trim()) {
      setError('Nombre es requerido');
      return;
    }

    const factorNum = Number(form.factor);
    if (isNaN(factorNum) || factorNum <= 0) {
      setError('Factor debe ser un número positivo');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        type: activeTab,
        nombre: form.nombre.trim(),
        factor: factorNum,
        descripcion: form.descripcion.trim() || null,
      };

      if (activeTab === 'medidor') {
        payload.requiere_visita_tecnica = form.requiere_visita_tecnica;
      }

      const method = editingId ? 'PUT' : 'POST';
      if (editingId) payload.id = editingId;

      const res = await fetch('/api/admin/variables', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      const { data: saved } = await res.json();

      if (activeTab === 'techo') {
        if (editingId) {
          setTechos((prev) => prev.map((t) => (t.id === editingId ? saved : t)));
        } else {
          setTechos((prev) => [...prev, saved]);
        }
      } else {
        if (editingId) {
          setMedidores((prev) => prev.map((m) => (m.id === editingId ? saved : m)));
        } else {
          setMedidores((prev) => [...prev, saved]);
        }
      }

      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }, [activeTab, editingId, form]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('¿Desactivar esta variable? (soft delete)')) return;

    try {
      const res = await fetch('/api/admin/variables', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      if (activeTab === 'techo') {
        setTechos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, activo: false } : t))
        );
      } else {
        setMedidores((prev) =>
          prev.map((m) => (m.id === id ? { ...m, activo: false } : m))
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, [activeTab]);

  const handleToggleActive = useCallback(async (
    id: number,
    currentActivo: boolean,
    type: TabType
  ) => {
    try {
      const res = await fetch('/api/admin/variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, activo: !currentActivo }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      if (type === 'techo') {
        setTechos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, activo: !currentActivo } : t))
        );
      } else {
        setMedidores((prev) =>
          prev.map((m) => (m.id === id ? { ...m, activo: !currentActivo } : m))
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Variables Simulador</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona factores de techo y medidor
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'techo' ? 'default' : 'outline'}
          onClick={() => setActiveTab('techo')}
          className={activeTab === 'techo' ? 'bg-[#154660] hover:bg-[#1d5a7a]' : ''}
        >
          <Sun className="mr-2 size-4" />
          Techo ({techos.filter((t) => t.activo).length})
        </Button>
        <Button
          variant={activeTab === 'medidor' ? 'default' : 'outline'}
          onClick={() => setActiveTab('medidor')}
          className={activeTab === 'medidor' ? 'bg-[#154660] hover:bg-[#1d5a7a]' : ''}
        >
          <Zap className="mr-2 size-4" />
          Medidor ({medidores.filter((m) => m.activo).length})
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-24">Factor</TableHead>
              <TableHead>Descripcion</TableHead>
              {activeTab === 'medidor' && (
                <TableHead className="w-40">Visita Tecnica</TableHead>
              )}
              <TableHead className="w-28">Estado</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeTab === 'techo' ? (
              techos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No hay variables de techo.
                  </TableCell>
                </TableRow>
              ) : (
                techos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-[#F07E04]">{item.factor}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.descripcion ?? '-'}</TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleActive(item.id, item.activo, 'techo')}>
                        <Badge
                          className={`cursor-pointer border ${
                            item.activo
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditTecho(item)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )
            ) : (
              medidores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No hay variables de medidor.
                  </TableCell>
                </TableRow>
              ) : (
                medidores.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-[#F07E04]">{item.factor}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.descripcion ?? '-'}</TableCell>
                    <TableCell>
                      {item.requiere_visita_tecnica && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                          Requiere visita
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleActive(item.id, item.activo, 'medidor')}>
                        <Badge
                          className={`cursor-pointer border ${
                            item.activo
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditMedidor(item)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )
            )}
          </TableBody>
        </Table>
      </div>

      <Button onClick={openCreate} className="bg-[#154660] hover:bg-[#1d5a7a]">
        <Plus className="mr-2 size-4" />
        Nueva variable de {activeTab}
      </Button>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? `Editar variable de ${activeTab}` : `Nueva variable de ${activeTab}`}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifica los campos que necesites.' : 'Completa los datos de la nueva variable.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Inclinado con Teja asfaltica"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Factor *</label>
              <Input
                type="number"
                step="0.01"
                value={form.factor}
                onChange={(e) => setForm((f) => ({ ...f, factor: e.target.value }))}
                placeholder="1.0"
              />
              <p className="text-xs text-muted-foreground">
                Factor multiplicativo (1.0 = sin recargo, 1.14 = +14%)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripcion</label>
              <Input
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Sin recargo"
              />
            </div>

            {activeTab === 'medidor' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requiere_visita"
                  checked={form.requiere_visita_tecnica}
                  onChange={(e) => setForm((f) => ({ ...f, requiere_visita_tecnica: e.target.checked }))}
                  className="size-4 rounded border-gray-300"
                />
                <label htmlFor="requiere_visita" className="text-sm font-medium">
                  Requiere visita tecnica
                </label>
              </div>
            )}

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
