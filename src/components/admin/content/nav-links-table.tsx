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
import type { NavLink } from '@/types/content';

interface NavLinksTableProps {
  navLinks: NavLink[];
}

type FormData = {
  location: 'navbar' | 'footer';
  label: string;
  href: string;
  sort_order: number;
  active: boolean;
};

const emptyForm: FormData = {
  location: 'navbar',
  label: '',
  href: '',
  sort_order: 0,
  active: true,
};

export default function NavLinksTable({ navLinks }: NavLinksTableProps) {
  const [items, setItems] = useState<NavLink[]>(navLinks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locationFilter, setLocationFilter] = useState<'navbar' | 'footer' | 'all'>('all');

  const filtered = locationFilter === 'all' ? items : items.filter((l) => l.location === locationFilter);

  const openCreate = useCallback(() => {
    setEditingId(null);
    const maxOrder = Math.max(0, ...items.map((l) => l.sort_order)) + 1;
    setForm({ ...emptyForm, sort_order: maxOrder });
    setError('');
    setDialogOpen(true);
  }, [items]);

  const openEdit = useCallback((link: NavLink) => {
    setEditingId(link.id);
    setForm({
      location: link.location,
      label: link.label,
      href: link.href,
      sort_order: link.sort_order,
      active: link.active,
    });
    setError('');
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.label.trim() || !form.href.trim()) {
      setError('Etiqueta y URL son requeridas');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;

      const res = await fetch('/api/admin/content/nav_links', {
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
        setItems((prev) => prev.map((l) => (l.id === editingId ? saved : l)));
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
    if (!confirm('¿Eliminar este enlace?')) return;

    try {
      const res = await fetch('/api/admin/content/nav_links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setItems((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, []);

  const handleToggleActive = useCallback(async (link: NavLink) => {
    try {
      const res = await fetch('/api/admin/content/nav_links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, active: !link.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      setItems((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, active: !l.active } : l))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Navegación</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} enlaces en total
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#154660] hover:bg-[#1d5a7a]">
          <Plus className="mr-2 size-4" />
          Nuevo enlace
        </Button>
      </div>

      {/* Location filter */}
      <div className="flex gap-2">
        {(['all', 'navbar', 'footer'] as const).map((loc) => (
          <button
            key={loc}
            onClick={() => setLocationFilter(loc)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              locationFilter === loc
                ? 'bg-[#154660] text-white border-[#154660]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {loc === 'all' ? 'Todos' : loc === 'navbar' ? 'Navbar' : 'Footer'}
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Etiqueta</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay enlaces.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.label}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{link.href}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {link.location === 'navbar' ? 'Navbar' : 'Footer'}
                    </Badge>
                  </TableCell>
                  <TableCell>{link.sort_order}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(link)}>
                      <Badge
                        className={`cursor-pointer border ${
                          link.active
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {link.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(link)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(link.id)}
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
            <DialogTitle>{editingId ? 'Editar enlace' : 'Nuevo enlace'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los campos que necesites.' : 'Completá los datos del nuevo enlace.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Etiqueta *</label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Inicio"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL *</label>
                <Input
                  value={form.href}
                  onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
                  placeholder="#inicio"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ubicación</label>
                <Select
                  value={form.location}
                  onValueChange={(v) => setForm((f) => ({ ...f, location: v as 'navbar' | 'footer' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="navbar">Navbar</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
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
