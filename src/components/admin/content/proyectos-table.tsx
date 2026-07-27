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
  Plus, Pencil, Trash2, Upload, Image as ImageIcon, X, MapPin, Zap,
} from 'lucide-react';
import type { ProyectoDetalle } from '@/types/proyecto-detalle';

interface ProyectosTableProps {
  proyectos: ProyectoDetalle[];
}

type FormData = {
  nombre: string;
  slug: string;
  segmento: string;
  descripcion: string;
  imagen_portada: string;
  potencia_kwp: string;
  generacion_mwh_anual: string;
  cantidad_paneles: string;
  marca_panel: string;
  cantidad_inversores: string;
  marca_inversor: string;
  tipo_estructura: string;
  ubicacion: string;
  region: string;
  ano: string;
  cliente: string;
  galeria: string[];
  activo: boolean;
  orden: number;
};

const emptyForm: FormData = {
  nombre: '',
  slug: '',
  segmento: 'Industrial',
  descripcion: '',
  imagen_portada: '',
  potencia_kwp: '',
  generacion_mwh_anual: '',
  cantidad_paneles: '',
  marca_panel: '',
  cantidad_inversores: '',
  marca_inversor: '',
  tipo_estructura: '',
  ubicacion: '',
  region: '',
  ano: '',
  cliente: '',
  galeria: [],
  activo: true,
  orden: 0,
};

function slugify(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Convert form string fields to the numeric/null shape the DB expects. */
function toDbNumber(val: string): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

export default function ProyectosTable({ proyectos }: ProyectosTableProps) {
  const [items, setItems] = useState<ProyectoDetalle[]>(proyectos);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Dialog open helpers ──────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm, orden: items.length });
    setError('');
    setDialogOpen(true);
  }, [items.length]);

  const openEdit = useCallback((p: ProyectoDetalle) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre ?? '',
      slug: p.slug ?? '',
      segmento: p.segmento ?? 'Industrial',
      descripcion: p.descripcion ?? '',
      imagen_portada: p.imagen_portada ?? '',
      potencia_kwp: p.potencia_kwp != null ? String(p.potencia_kwp) : '',
      generacion_mwh_anual: p.generacion_mwh_anual != null ? String(p.generacion_mwh_anual) : '',
      cantidad_paneles: p.cantidad_paneles != null ? String(p.cantidad_paneles) : '',
      marca_panel: p.marca_panel ?? '',
      cantidad_inversores: p.cantidad_inversores != null ? String(p.cantidad_inversores) : '',
      marca_inversor: p.marca_inversor ?? '',
      tipo_estructura: p.tipo_estructura ?? '',
      ubicacion: p.ubicacion ?? '',
      region: p.region ?? '',
      ano: p.ano != null ? String(p.ano) : '',
      cliente: p.cliente ?? '',
      galeria: p.galeria ?? [],
      activo: p.activo,
      orden: p.orden,
    });
    setError('');
    setDialogOpen(true);
  }, []);

  // ── Image upload (cover) ─────────────────────────────────────
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
      setForm((f) => ({ ...f, imagen_portada: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  }, []);

  // ── Gallery image upload ─────────────────────────────────────
  const handleGalleryUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setGalleryUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/content/upload-image', { method: 'POST', body: fd });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Error al subir imagen de galeria');
        }
        const { url } = await res.json();
        uploaded.push(url);
      }
      setForm((f) => ({ ...f, galeria: [...f.galeria, ...uploaded] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagenes');
    } finally {
      setGalleryUploading(false);
      // reset so the same file can be re-selected
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  }, []);

  const removeGalleryImage = useCallback((idx: number) => {
    setForm((f) => ({ ...f, galeria: f.galeria.filter((_, i) => i !== idx) }));
  }, []);

  const addGalleryUrl = useCallback(() => {
    setForm((f) => ({ ...f, galeria: [...f.galeria, ''] }));
  }, []);

  const updateGalleryUrl = useCallback((idx: number, value: string) => {
    setForm((f) => ({
      ...f,
      galeria: f.galeria.map((url, i) => (i === idx ? value : url)),
    }));
  }, []);

  // ── Save (create / update) ───────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const row = {
        nombre: form.nombre.trim(),
        slug: form.slug.trim() || slugify(form.nombre),
        segmento: form.segmento.trim() || 'Industrial',
        descripcion: form.descripcion.trim() || null,
        imagen_portada: form.imagen_portada || null,
        potencia_kwp: toDbNumber(form.potencia_kwp),
        generacion_mwh_anual: toDbNumber(form.generacion_mwh_anual),
        cantidad_paneles: toDbNumber(form.cantidad_paneles),
        marca_panel: form.marca_panel.trim() || null,
        cantidad_inversores: toDbNumber(form.cantidad_inversores),
        marca_inversor: form.marca_inversor.trim() || null,
        tipo_estructura: form.tipo_estructura.trim() || null,
        ubicacion: form.ubicacion.trim() || null,
        region: form.region.trim() || null,
        ano: toDbNumber(form.ano),
        cliente: form.cliente.trim() || null,
        galeria: form.galeria.filter((u) => u.trim() !== ''),
        activo: form.activo,
        orden: form.orden,
      };

      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { id: editingId, ...row } : row;

      const res = await fetch('/api/admin/proyectos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar');
      }

      const { data: saved } = await res.json() as { data: ProyectoDetalle };
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

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Eliminar este proyecto? Esta accion no se puede deshacer.')) return;
    try {
      const res = await fetch('/api/admin/proyectos', {
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

  // ── Toggle active ────────────────────────────────────────────
  const handleToggleActive = useCallback(async (p: ProyectoDetalle) => {
    try {
      const res = await fetch('/api/admin/proyectos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, activo: !p.activo }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al actualizar');
      }
      setItems((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, activo: !item.activo } : item))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  // Helpers for form fields
  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Proyectos Detallados</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} proyecto{items.length !== 1 ? 's' : ''} en total
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
              <TableHead>Segmento</TableHead>
              <TableHead>Potencia</TableHead>
              <TableHead>Ubicacion</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No hay proyectos detallados. Creá el primero.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.imagen_portada ? (
                      <img
                        src={p.imagen_portada}
                        alt={p.nombre}
                        className="size-10 rounded object-cover"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.nombre}
                    {p.cliente && (
                      <span className="block text-xs text-muted-foreground">{p.cliente}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.segmento}</Badge>
                  </TableCell>
                  <TableCell>
                    {p.potencia_kwp != null ? (
                      <span className="font-semibold text-[#F07E04]">{p.potencia_kwp} kWp</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{p.ubicacion || '—'}</TableCell>
                  <TableCell>{p.orden}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(p)}>
                      <Badge
                        className={`cursor-pointer border ${
                          p.activo
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
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

      {/* ── Create/Edit Dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los campos que necesites.'
                : 'Completa los datos del nuevo proyecto.'}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 space-y-5 overflow-y-auto pr-1">
            {/* Section: General */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#154660]">General</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nombre *</label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setField('nombre', e.target.value)}
                    placeholder="Planta Industrial Maipu"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Segmento</label>
                  <Input
                    value={form.segmento}
                    onChange={(e) => setField('segmento', e.target.value)}
                    placeholder="Industrial / Comercial / Residencial"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Slug{' '}
                  <span className="text-muted-foreground font-normal">
                    (se genera automaticamente si lo dejas vacio)
                  </span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)}
                    placeholder={slugify(form.nombre) || 'planta-industrial-maipu'}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setField('slug', slugify(form.nombre))}
                  >
                    Generar
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descripcion</label>
                <Textarea
                  value={form.descripcion}
                  onChange={(e) => setField('descripcion', e.target.value)}
                  placeholder="Descripcion del proyecto, instalaciones, resultados..."
                  rows={3}
                />
              </div>
            </div>

            {/* Section: Imagen de portada */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#154660]">
                Imagen de Portada
              </p>
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
                {form.imagen_portada && (
                  <img
                    src={form.imagen_portada}
                    alt="Preview portada"
                    className="size-12 rounded object-cover border"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Maximo 5MB. JPEG, PNG, WebP.</p>
            </div>

            {/* Section: Especificaciones tecnicas */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#154660]">
                Especificaciones Tecnicas
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Zap className="size-3.5 text-[#F07E04]" /> Potencia (kWp)
                  </label>
                  <Input
                    type="number"
                    value={form.potencia_kwp}
                    onChange={(e) => setField('potencia_kwp', e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Generacion (MWh/año)</label>
                  <Input
                    type="number"
                    value={form.generacion_mwh_anual}
                    onChange={(e) => setField('generacion_mwh_anual', e.target.value)}
                    placeholder="850"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cantidad de paneles</label>
                  <Input
                    type="number"
                    value={form.cantidad_paneles}
                    onChange={(e) => setField('cantidad_paneles', e.target.value)}
                    placeholder="1200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Marca de panel</label>
                  <Input
                    value={form.marca_panel}
                    onChange={(e) => setField('marca_panel', e.target.value)}
                    placeholder="Jinko Solar"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cantidad de inversores</label>
                  <Input
                    type="number"
                    value={form.cantidad_inversores}
                    onChange={(e) => setField('cantidad_inversores', e.target.value)}
                    placeholder="6"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Marca de inversor</label>
                  <Input
                    value={form.marca_inversor}
                    onChange={(e) => setField('marca_inversor', e.target.value)}
                    placeholder="Huawei"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tipo de estructura</label>
                  <Input
                    value={form.tipo_estructura}
                    onChange={(e) => setField('tipo_estructura', e.target.value)}
                    placeholder="Coplanar / Sobre techo / Tracker"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Año</label>
                  <Input
                    type="number"
                    value={form.ano}
                    onChange={(e) => setField('ano', e.target.value)}
                    placeholder="2024"
                  />
                </div>
              </div>
            </div>

            {/* Section: Ubicacion y cliente */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#154660]">
                Ubicacion y Cliente
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="size-3.5 text-[#F07E04]" /> Ubicacion
                  </label>
                  <Input
                    value={form.ubicacion}
                    onChange={(e) => setField('ubicacion', e.target.value)}
                    placeholder="Maipu, Santiago"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Region</label>
                  <Input
                    value={form.region}
                    onChange={(e) => setField('region', e.target.value)}
                    placeholder="Metropolitana"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cliente</label>
                  <Input
                    value={form.cliente}
                    onChange={(e) => setField('cliente', e.target.value)}
                    placeholder="Empresa S.A."
                  />
                </div>
              </div>
            </div>

            {/* Section: Galeria */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#154660]">
                Galeria de imagenes
              </p>

              {/* Bulk upload */}
              <div className="flex items-center gap-3">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleGalleryUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={galleryUploading}
                >
                  <Upload className="mr-2 size-4" />
                  {galleryUploading ? 'Subiendo...' : 'Subir imagenes'}
                </Button>
                <Button type="button" variant="ghost" onClick={addGalleryUrl}>
                  <Plus className="mr-2 size-4" />
                  Agregar URL
                </Button>
              </div>

              {form.galeria.length > 0 && (
                <div className="space-y-2">
                  {form.galeria.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {url.startsWith('http') && (
                        <img
                          src={url}
                          alt={`Galeria ${idx + 1}`}
                          className="size-8 rounded object-cover border shrink-0"
                        />
                      )}
                      <Input
                        value={url}
                        onChange={(e) => updateGalleryUrl(idx, e.target.value)}
                        placeholder="https://... o pega una URL de imagen"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeGalleryImage(idx)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Las URLs vacias se ignoraran al guardar.
              </p>
            </div>

            {/* Section: Estado y orden */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Orden</label>
                <Input
                  type="number"
                  value={form.orden}
                  onChange={(e) => setField('orden', Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => setField('activo', !form.activo)}
                  className="cursor-pointer"
                >
                  <Badge
                    className={`border ${
                      form.activo
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {form.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </button>
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
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#154660] hover:bg-[#1d5a7a]"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
