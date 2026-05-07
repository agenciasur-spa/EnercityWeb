import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Upload, X } from 'lucide-react';

type SiteContentRow = {
  id: string;
  section: string;
  data: Record<string, unknown>;
  updated_at: string;
};

interface SectionsEditorProps {
  sections: SiteContentRow[];
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

// Field definitions per section — maps JSONB key to label + type
type FieldDef = { key: string; label: string; type: 'text' | 'textarea' | 'image' };

const SECTION_FIELDS: Record<string, { title: string; fields: FieldDef[] }> = {
  hero: {
    title: 'Hero',
    fields: [
      { key: 'badge', label: 'Badge', type: 'text' },
      { key: 'headline', label: 'Título', type: 'text' },
      { key: 'headlineAccent', label: 'Título (acento)', type: 'text' },
      { key: 'subheadline', label: 'Subtítulo', type: 'textarea' },
      { key: 'ctaPrimary', label: 'CTA Principal', type: 'text' },
      { key: 'ctaSecondary', label: 'CTA Secundario', type: 'text' },
      { key: 'cardTitle', label: 'Tarjeta Título', type: 'text' },
      { key: 'cardSubtitle', label: 'Tarjeta Subtítulo', type: 'text' },
      { key: 'backgroundImage', label: 'Imagen de Fondo', type: 'image' },
      { key: 'backgroundVideo', label: 'Video de Fondo (URL)', type: 'text' },
    ],
  },
  guarantees: {
    title: 'Garantías',
    fields: [
      { key: 'headerTag', label: 'Tag Encabezado', type: 'text' },
      { key: 'headerTitle', label: 'Título', type: 'text' },
      { key: 'headerTitleAccent', label: 'Título (acento)', type: 'text' },
      { key: 'headerDescription', label: 'Descripción', type: 'textarea' },
    ],
  },
  contact_cta: {
    title: 'Contacto CTA',
    fields: [
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'headline', label: 'Título', type: 'text' },
      { key: 'headlineAccent', label: 'Título (acento)', type: 'text' },
    ],
  },
  footer: {
    title: 'Footer',
    fields: [
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'address', label: 'Dirección', type: 'text' },
      { key: 'phone', label: 'Teléfono', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
    ],
  },
  projects_section: {
    title: 'Proyectos',
    fields: [
      { key: 'tag', label: 'Tag', type: 'text' },
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'titleAccent', label: 'Título (acento)', type: 'text' },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'ctaText', label: 'Texto Botón CTA', type: 'text' },
    ],
  },
  solutions_section: {
    title: 'Soluciones',
    fields: [
      { key: 'tag', label: 'Tag', type: 'text' },
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'titleAccent', label: 'Título (acento)', type: 'text' },
    ],
  },
};

const SECTION_ORDER = ['hero', 'projects_section', 'solutions_section', 'guarantees', 'contact_cta', 'footer'];

export default function SectionsEditor({ sections }: SectionsEditorProps) {
  // Build a map: section -> data (stored as state for proper dirty tracking)
  const initialMap = Object.fromEntries(sections.map((s) => [s.section, s.data]));

  const [savedData, setSavedData] = useState<Record<string, Record<string, unknown>>>(initialMap);
  const [sectionData, setSectionData] = useState<Record<string, Record<string, unknown>>>(initialMap);
  const [activeTab, setActiveTab] = useState<string>('hero');
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const hasChanges = useCallback(
    (section: string) => {
      const original = savedData[section] ?? {};
      const current = sectionData[section] ?? {};
      return JSON.stringify(original) !== JSON.stringify(current);
    },
    [savedData, sectionData]
  );

  const handleChange = useCallback((section: string, key: string, value: unknown) => {
    setSectionData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] ?? {}),
        [key]: value,
      },
    }));
    setSaveStates((prev) => ({ ...prev, [section]: 'idle' }));
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrors((prev) => ({ ...prev, [activeTab]: '' }));

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
      handleChange(activeTab, 'backgroundImage', url);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [activeTab]: err instanceof Error ? err.message : 'Error al subir imagen',
      }));
    } finally {
      setUploadingImage(false);
    }
  }, [handleChange, activeTab]);

  const handleSave = useCallback(async (section: string) => {
    setSaveStates((prev) => ({ ...prev, [section]: 'saving' }));
    setErrors((prev) => ({ ...prev, [section]: '' }));

    try {
      const res = await fetch('/api/admin/content/site_content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          data: sectionData[section] ?? {},
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Error al guardar');
      }

      setSaveStates((prev) => ({ ...prev, [section]: 'success' }));
      // Update savedData so hasChanges resets properly
      setSavedData((prev) => ({
        ...prev,
        [section]: { ...(sectionData[section] ?? {}) },
      }));
      setTimeout(() => setSaveStates((prev) => ({ ...prev, [section]: 'idle' })), 3000);
    } catch (err) {
      setSaveStates((prev) => ({ ...prev, [section]: 'error' }));
      setErrors((prev) => ({
        ...prev,
        [section]: err instanceof Error ? err.message : 'Error desconocido',
      }));
    }
  }, [sectionData]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Secciones del Sitio</h1>
        <p className="text-sm text-muted-foreground">
          Editá el contenido de cada sección. Los cambios se reflejan en el sitio en hasta 5 minutos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {SECTION_ORDER.map((section) => {
          const config = SECTION_FIELDS[section];
          if (!config) return null;
          const changed = hasChanges(section);
          return (
            <button
              key={section}
              onClick={() => setActiveTab(section)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === section
                  ? 'border-[#F07E04] text-[#154660]'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
                changed && activeTab !== section && 'text-orange-600 border-orange-300'
              )}
            >
              {config.title}
              {changed && <span className="ml-1 text-xs">●</span>}
            </button>
          );
        })}
      </div>

      {/* Active section editor */}
      {SECTION_ORDER.map((section) => {
        if (section !== activeTab) return null;
        const config = SECTION_FIELDS[section];
        if (!config) return null;

        const state = saveStates[section] ?? 'idle';
        const error = errors[section] ?? '';
        const data = sectionData[section] ?? {};
        const changed = hasChanges(section);

        return (
          <div key={section} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{config.title}</h2>
              <Button
                onClick={() => handleSave(section)}
                disabled={!changed || state === 'saving'}
                className="bg-[#154660] hover:bg-[#1d5a7a]"
              >
                {state === 'saving' ? 'Guardando...' : changed ? 'Guardar cambios' : 'Sin cambios'}
              </Button>
            </div>

            {state === 'success' && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
                Sección guardada exitosamente.
              </div>
            )}

            {state === 'error' && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-4">
              {config.fields.map((field) => (
                <Card key={field.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {field.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {field.type === 'textarea' ? (
                      <Textarea
                        value={String(data[field.key] ?? '')}
                        onChange={(e) => handleChange(section, field.key, e.target.value)}
                        rows={3}
                        className={cn(
                          String(data[field.key] ?? '') !== String(savedData[section]?.[field.key] ?? '') &&
                            'border-orange-400 focus-visible:border-orange-400'
                        )}
                      />
                    ) : field.type === 'image' ? (
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                          >
                            <Upload className="mr-2 size-4" />
                            {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                          </Button>
                          {!!data[field.key] && (
                            <div className="relative size-16 rounded overflow-hidden border">
                              <img
                                src={String(data[field.key])}
                                alt="Preview"
                                className="size-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleChange(section, field.key, '')}
                                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {!!data[field.key] && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {String(data[field.key])}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">Máximo 5MB. JPEG, PNG, WebP.</p>
                      </div>
                    ) : (
                      <Input
                        value={String(data[field.key] ?? '')}
                        onChange={(e) => handleChange(section, field.key, e.target.value)}
                        className={cn(
                          'max-w-xl',
                          String(data[field.key] ?? '') !== String(savedData[section]?.[field.key] ?? '') &&
                            'border-orange-400 focus-visible:border-orange-400'
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Arrays editor for cards / stats / benefits / socials */}
            {section === 'hero' && (
              <ArrayEditor
                label="Estadísticas de Tarjeta"
                data={data}
                field="cardStats"
                subfields={[
                  { key: 'value', label: 'Valor' },
                  { key: 'label', label: 'Etiqueta' },
                ]}
                onChange={(field, items) => handleChange(section, field, items)}
              />
            )}

            {section === 'guarantees' && (
              <ArrayEditor
                label="Tarjetas de Garantía"
                data={data}
                field="cards"
                subfields={[
                  { key: 'title', label: 'Título' },
                  { key: 'subtitle', label: 'Subtítulo' },
                  { key: 'description', label: 'Descripción' },
                  { key: 'tag', label: 'Tag' },
                  { key: 'icon', label: 'Icono' },
                  { key: 'color', label: 'Color' },
                ]}
                onChange={(field, items) => handleChange(section, field, items)}
              />
            )}

            {section === 'projects_section' && (
              <ArrayEditor
                label="Características (Checkmarks)"
                data={data}
                field="features"
                subfields={[
                  { key: 'text', label: 'Texto' },
                ]}
                onChange={(field, items) => handleChange(section, field, items)}
              />
            )}

            {section === 'contact_cta' && (
              <ArrayEditor
                label="Beneficios"
                data={data}
                field="benefits"
                subfields={[
                  { key: 'icon', label: 'Icono' },
                  { key: 'text', label: 'Texto' },
                ]}
                onChange={(field, items) => handleChange(section, field, items)}
              />
            )}

            {section === 'footer' && (
              <ArrayEditor
                label="Redes Sociales"
                data={data}
                field="socials"
                subfields={[
                  { key: 'icon', label: 'Icono' },
                  { key: 'href', label: 'URL' },
                  { key: 'label', label: 'Label' },
                ]}
                onChange={(field, items) => handleChange(section, field, items)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Reusable Array Editor for JSONB arrays ──────────────────
interface ArrayEditorProps {
  label: string;
  data: Record<string, unknown>;
  field: string;
  subfields: { key: string; label: string }[];
  onChange: (field: string, items: Record<string, string>[]) => void;
}

function ArrayEditor({ label, data, field, subfields, onChange }: ArrayEditorProps) {
  const raw = data[field];
  const items: Record<string, string>[] = Array.isArray(raw)
    ? raw
    : (() => {
        try { return JSON.parse(String(raw ?? '[]')); } catch { return []; }
      })();

  const updateItem = (index: number, key: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: value };
    onChange(field, updated);
  };

  const addItem = () => {
    const newItem = Object.fromEntries(subfields.map((sf) => [sf.key, '']));
    onChange(field, [...items, newItem]);
  };

  const removeItem = (index: number) => {
    onChange(field, items.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 size-3" />
            Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start border-b pb-3 last:border-0 last:pb-0">
            <span className="text-xs text-muted-foreground mt-2 min-w-[24px]">{i + 1}.</span>
            <div className="flex-1 grid grid-cols-2 gap-2">
              {subfields.map((sf) => (
                <div key={sf.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{sf.label}</label>
                  <Input
                    value={String(item[sf.key] ?? '')}
                    onChange={(e) => updateItem(i, sf.key, e.target.value)}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeItem(i)}
              className="mt-5 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No hay elementos. Hacé clic en "Agregar".
          </p>
        )}
      </CardContent>
    </Card>
  );
}
