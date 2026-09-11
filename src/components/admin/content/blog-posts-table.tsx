import { useState, useCallback, useRef } from 'react';
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
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import type { BlogPostWithCategory, BlogCategory, PostStatus } from '@/types/blog';

interface BlogPostsTableProps {
  posts: BlogPostWithCategory[];
  categories: BlogCategory[];
}

type FormData = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category_id: string;
  status: PostStatus;
  author_name: string;
};

const emptyForm: FormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  category_id: '',
  status: 'draft',
  author_name: '',
};

function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BlogPostsTable({ posts, categories }: BlogPostsTableProps) {
  const [items, setItems] = useState<BlogPostWithCategory[]>(posts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((p: BlogPostWithCategory) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? '',
      content: p.content,
      cover_image_url: p.cover_image_url ?? '',
      category_id: p.category_id ?? '',
      status: p.status,
      author_name: p.author_name ?? '',
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
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/content/upload-image', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al subir imagen');
      }
      const { url } = await res.json();
      setForm((f) => ({ ...f, cover_image_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  }, []);

  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (!form.content.trim()) {
      setError('El contenido es obligatorio');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const row = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        cover_image_url: form.cover_image_url || null,
        category_id: form.category_id || null,
        status: form.status,
        author_name: form.author_name.trim() || null,
      };

      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { id: editingId, ...row } : row;

      const res = await fetch('/api/admin/blog-posts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar');
      }

      const { data: saved } = (await res.json()) as { data: BlogPostWithCategory };
      if (editingId) {
        setItems((prev) => prev.map((p) => (p.id === editingId ? saved : p)));
      } else {
        setItems((prev) => [saved, ...prev]);
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }, [editingId, form]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta noticia? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch('/api/admin/blog-posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al eliminar');
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, []);

  const handleToggleStatus = useCallback(async (p: BlogPostWithCategory) => {
    const nextStatus: PostStatus = p.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch('/api/admin/blog-posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, status: nextStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al actualizar');
      }
      const { data: saved } = (await res.json()) as { data: BlogPostWithCategory };
      setItems((prev) => prev.map((item) => (item.id === p.id ? saved : item)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Noticias del Blog</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} noticia{items.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#154660] hover:bg-[#1d5a7a]">
          <Plus className="mr-2 size-4" />
          Nueva noticia
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Imagen</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay noticias. Crea la primera.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} alt={p.title} className="size-10 rounded object-cover" />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>
                    {p.category ? <Badge variant="secondary">{p.category.name}</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{p.author_name || '—'}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleStatus(p)}>
                      <Badge
                        className={`cursor-pointer border ${
                          p.status === 'published'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {p.status === 'published' ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(p.id)}
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar noticia' : 'Nueva noticia'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifica los campos que necesites.' : 'Completa los datos de la nueva noticia.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto pr-1">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="Enercity inaugura nueva planta solar en Maipu"
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
                    placeholder={slugify(form.title) || 'nueva-planta-solar'}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={() => setField('slug', slugify(form.title))}>
                    Generar
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Extracto</label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => setField('excerpt', e.target.value)}
                  placeholder="Resumen corto para el listado y para redes sociales"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Contenido * (Markdown)</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setField('content', e.target.value)}
                  placeholder="## Título del bloque&#10;&#10;Texto de la noticia..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#154660]">Imagen de portada</p>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-2 size-4" />
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                </Button>
                {form.cover_image_url && (
                  <img src={form.cover_image_url} alt="Preview portada" className="size-12 rounded object-cover border" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Máximo 5MB. Se comprime automáticamente a WebP.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Categoría</label>
                <Select value={form.category_id || undefined} onValueChange={(v) => setField('category_id', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Autor</label>
                <Input
                  value={form.author_name}
                  onChange={(e) => setField('author_name', e.target.value)}
                  placeholder="Equipo Enercity"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Estado</label>
              <button type="button" onClick={() => setField('status', form.status === 'published' ? 'draft' : 'published')}>
                <Badge
                  className={`cursor-pointer border ${
                    form.status === 'published'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {form.status === 'published' ? 'Publicado' : 'Borrador'}
                </Badge>
              </button>
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
