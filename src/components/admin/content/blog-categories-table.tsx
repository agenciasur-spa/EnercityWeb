import { useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { BlogCategory } from '@/types/blog';

interface BlogCategoriesTableProps {
  categories: BlogCategory[];
}

type FormData = { name: string; slug: string };

const emptyForm: FormData = { name: '', slug: '' };

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BlogCategoriesTable({ categories }: BlogCategoriesTableProps) {
  const [items, setItems] = useState<BlogCategory[]>(categories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((c: BlogCategory) => {
    setEditingId(c.id);
    setForm({ name: c.name, slug: c.slug });
    setError('');
    setDialogOpen(true);
  }, []);

  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const row = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
      };

      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { id: editingId, ...row } : row;

      const res = await fetch('/api/admin/blog-categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar');
      }

      const { data: saved } = (await res.json()) as { data: BlogCategory };
      if (editingId) {
        setItems((prev) => prev.map((c) => (c.id === editingId ? saved : c)));
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
    if (!confirm('¿Eliminar esta categoría? Los posts asociados quedarán sin categoría.')) return;
    try {
      const res = await fetch('/api/admin/blog-categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al eliminar');
      }
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Categorías del Blog</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} categoría{items.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#154660] hover:bg-[#1d5a7a]">
          <Plus className="mr-2 size-4" />
          Nueva categoría
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No hay categorías. Crea la primera.
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(c.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifica el nombre o slug.' : 'Completa los datos de la nueva categoría.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Novedades"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Slug{' '}
                <span className="text-muted-foreground font-normal">
                  (se genera automáticamente si lo dejas vacío)
                </span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={form.slug}
                  onChange={(e) => setField('slug', e.target.value)}
                  placeholder={slugify(form.name) || 'novedades'}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={() => setField('slug', slugify(form.name))}>
                  Generar
                </Button>
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
