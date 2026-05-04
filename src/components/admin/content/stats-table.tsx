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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { StatItem } from '@/types/content';

// Icons available for selection
const ICON_OPTIONS = ['Users', 'Zap', 'Award', 'CheckCircle', 'Sun', 'Battery', 'Wrench', 'ShieldCheck', 'Globe', 'BarChart3', 'Building2'];

interface StatsTableProps {
  stats: StatItem[];
}

type FormData = {
  value: string;
  label: string;
  description: string;
  icon: string;
  sort_order: number;
  active: boolean;
};

const emptyForm: FormData = {
  value: '',
  label: '',
  description: '',
  icon: 'Users',
  sort_order: 0,
  active: true,
};

export default function StatsTable({ stats }: StatsTableProps) {
  const [items, setItems] = useState<StatItem[]>(stats);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: items.length });
    setError('');
    setDialogOpen(true);
  }, [items.length]);

  const openEdit = useCallback((stat: StatItem) => {
    setEditingId(stat.id);
    setForm({
      value: stat.value,
      label: stat.label,
      description: stat.description ?? '',
      icon: stat.icon,
      sort_order: stat.sort_order,
      active: stat.active,
    });
    setError('');
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.value.trim() || !form.label.trim()) {
      setError('Valor y etiqueta son requeridos');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = editingId
        ? '/api/admin/content/stats'
        : '/api/admin/content/stats';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? { id: editingId, ...form }
        : form;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      const { data: saved } = await res.json();
      if (editingId) {
        setItems((prev) => prev.map((s) => (s.id === editingId ? saved : s)));
      } else {
        setItems((prev) => [...prev, saved]);
      }

      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }, [editingId, form]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta estadística?')) return;

    try {
      const res = await fetch('/api/admin/content/stats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, []);

  const handleToggleActive = useCallback(async (stat: StatItem) => {
    try {
      const res = await fetch('/api/admin/content/stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stat.id, active: !stat.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      setItems((prev) =>
        prev.map((s) => (s.id === stat.id ? { ...s, active: !s.active } : s))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} estadísticas en total
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#154660] hover:bg-[#1d5a7a]">
          <Plus className="mr-2 size-4" />
          Nueva estadística
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valor</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead className="hidden md:table-cell">Icono</TableHead>
              <TableHead className="hidden md:table-cell">Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay estadísticas. Creá la primera.
                </TableCell>
              </TableRow>
            ) : (
              items.map((stat) => (
                <TableRow key={stat.id}>
                  <TableCell className="font-semibold">{stat.value}</TableCell>
                  <TableCell>{stat.label}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{stat.icon}</code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{stat.sort_order}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(stat)}>
                      <Badge
                        className={`cursor-pointer border ${
                          stat.active
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {stat.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(stat)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(stat.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar estadística' : 'Nueva estadística'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los campos que necesites.' : 'Completá los datos de la nueva estadística.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor *</label>
                <Input
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="500+"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Etiqueta *</label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Proyectos Instalados"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Hogares y empresas"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Icono</label>
                <Select
                  value={form.icon}
                  onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Orden</label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
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
