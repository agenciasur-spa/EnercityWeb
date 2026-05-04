import { useState, useCallback, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import type { Project } from '@/types/content';

interface ProjectsTableProps {
  projects: Project[];
}

type FormData = {
  name: string;
  type: string;
  image_url: string;
  saving: string;
  saving_label: string;
  alt_text: string;
  sort_order: number;
  active: boolean;
};

const emptyForm: FormData = {
  name: '',
  type: '',
  image_url: '',
  saving: '',
  saving_label: 'Ahorro Mensual',
  alt_text: '',
  sort_order: 0,
  active: true,
};

export default function ProjectsTable({ projects }: ProjectsTableProps) {
  const [items, setItems] = useState<Project[]>(projects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: items.length });
    setError('');
    setDialogOpen(true);
  }, [items.length]);

  const openEdit = useCallback((project: Project) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      type: project.type,
      image_url: project.image_url ?? '',
      saving: project.saving,
      saving_label: project.saving_label,
      alt_text: project.alt_text ?? '',
      sort_order: project.sort_order,
      active: project.active,
    });
    setError('');
    setDialogOpen(true);
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/content/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al subir imagen');
      }

      const { url } = await res.json();
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.type.trim() || !form.saving.trim()) {
      setError('Nombre, tipo y ahorro son requeridos');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;

      const res = await fetch('/api/admin/content/projects', {
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
        setItems((prev) => prev.map((p) => (p.id === editingId ? saved : p)));
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
    if (!confirm('¿Eliminar este proyecto?')) return;

    try {
      const res = await fetch('/api/admin/content/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, []);

  const handleToggleActive = useCallback(async (project: Project) => {
    try {
      const res = await fetch('/api/admin/content/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, active: !project.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      setItems((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, active: !p.active } : p))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} proyectos en total
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#154660] hover:bg-[#1d5a7a]">
          <Plus className="mr-2 size-4" />
          Nuevo proyecto
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ahorro</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay proyectos. Creá el primero.
                </TableCell>
              </TableRow>
            ) : (
              items.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    {project.image_url ? (
                      <img
                        src={project.image_url}
                        alt={project.alt_text ?? project.name}
                        className="size-10 rounded object-cover"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.type}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-[#F07E04]">{project.saving}</span>
                    <span className="text-xs text-muted-foreground ml-1">{project.saving_label}</span>
                  </TableCell>
                  <TableCell>{project.sort_order}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(project)}>
                      <Badge
                        className={`cursor-pointer border ${
                          project.active
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {project.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(project)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(project.id)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los campos que necesites.' : 'Completá los datos del nuevo proyecto.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Planta Industrial Maipú"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo *</label>
                <Input
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  placeholder="Logística"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ahorro *</label>
                <Input
                  value={form.saving}
                  onChange={(e) => setForm((f) => ({ ...f, saving: e.target.value }))}
                  placeholder="45%"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Label de ahorro</label>
                <Input
                  value={form.saving_label}
                  onChange={(e) => setForm((f) => ({ ...f, saving_label: e.target.value }))}
                  placeholder="Ahorro Mensual"
                />
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Imagen</label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 size-4" />
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                </Button>
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="size-12 rounded object-cover border"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Máximo 5MB. JPEG, PNG, WebP.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Texto alternativo</label>
              <Input
                value={form.alt_text}
                onChange={(e) => setForm((f) => ({ ...f, alt_text: e.target.value }))}
                placeholder="Descripción de la imagen para accesibilidad"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Orden</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                className="w-24"
              />
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
