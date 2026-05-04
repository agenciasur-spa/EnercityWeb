import { useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import type { Solution } from '@/types/content';

const ICON_OPTIONS = ['Sun', 'Battery', 'Zap', 'Wrench', 'ShieldCheck', 'Users', 'Globe', 'BarChart3', 'Leaf'];

interface SolutionsTableProps {
  solutions: Solution[];
}

type FormData = {
  slug: string;
  title: string;
  badge: string;
  description: string;
  features: string[];
  tooltip: string;
  icon: string;
  color: string;
  colorbg: string;
  sort_order: number;
  active: boolean;
};

const emptyForm: FormData = {
  slug: '',
  title: '',
  badge: '',
  description: '',
  features: [],
  tooltip: '',
  icon: 'Sun',
  color: 'rgb(240, 126, 4)',
  colorbg: 'rgba(240, 126, 4, 0.08)',
  sort_order: 0,
  active: true,
};

export default function SolutionsTable({ solutions }: SolutionsTableProps) {
  const [items, setItems] = useState<Solution[]>(solutions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newFeature, setNewFeature] = useState('');

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: items.length });
    setError('');
    setDialogOpen(true);
  }, [items.length]);

  const openEdit = useCallback((solution: Solution) => {
    setEditingId(solution.id);
    setForm({
      slug: solution.slug,
      title: solution.title,
      badge: solution.badge,
      description: solution.description ?? '',
      features: solution.features ?? [],
      tooltip: solution.tooltip ?? '',
      icon: solution.icon,
      color: solution.color,
      colorbg: solution.colorbg,
      sort_order: solution.sort_order,
      active: solution.active,
    });
    setError('');
    setDialogOpen(true);
  }, []);

  const addFeature = useCallback(() => {
    if (!newFeature.trim()) return;
    setForm((f) => ({ ...f, features: [...f.features, newFeature.trim()] }));
    setNewFeature('');
  }, [newFeature]);

  const removeFeature = useCallback((index: number) => {
    setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== index) }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.slug.trim() || !form.title.trim() || !form.badge.trim()) {
      setError('Slug, título y badge son requeridos');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;

      const res = await fetch('/api/admin/content/solutions', {
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
    if (!confirm('¿Eliminar esta solución?')) return;

    try {
      const res = await fetch('/api/admin/content/solutions', {
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

  const handleToggleActive = useCallback(async (solution: Solution) => {
    try {
      const res = await fetch('/api/admin/content/solutions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: solution.id, active: !solution.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      setItems((prev) =>
        prev.map((s) => (s.id === solution.id ? { ...s, active: !s.active } : s))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Soluciones</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} soluciones en total
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#154660] hover:bg-[#1d5a7a]">
          <Plus className="mr-2 size-4" />
          Nueva solución
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="hidden md:table-cell">Badge</TableHead>
              <TableHead className="hidden md:table-cell">Icono</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay soluciones. Creá la primera.
                </TableCell>
              </TableRow>
            ) : (
              items.map((solution) => (
                <TableRow key={solution.id}>
                  <TableCell className="font-medium">{solution.title}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{solution.slug}</code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{solution.badge}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{solution.icon}</code>
                  </TableCell>
                  <TableCell>{solution.sort_order}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(solution)}>
                      <Badge
                        className={`cursor-pointer border ${
                          solution.active
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {solution.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(solution)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(solution.id)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar solución' : 'Nueva solución'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los campos que necesites.' : 'Completá los datos de la nueva solución.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug *</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="on-grid"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Sistemas On-Grid"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Badge *</label>
                <Input
                  value={form.badge}
                  onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  placeholder="Más popular"
                />
              </div>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Descripción de la solución..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tooltip</label>
              <Input
                value={form.tooltip}
                onChange={(e) => setForm((f) => ({ ...f, tooltip: e.target.value }))}
                placeholder="Texto del tooltip informativo"
              />
            </div>

            {/* Features editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Features</label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Nueva feature..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.features.map((feature, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium"
                  >
                    {feature}
                    <button onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color.startsWith('rgb') ? '#F07E04' : form.color}
                    onChange={(e) => {
                      const hex = e.target.value;
                      // Convert hex to rgb format for consistency
                      setForm((f) => ({
                        ...f,
                        color: `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`,
                      }));
                    }}
                    className="size-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="flex-1 text-xs"
                  />
                </div>
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
