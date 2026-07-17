import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Check, Upload, Eye, X } from 'lucide-react';

interface OpenGraphData {
  id: number;
  route: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
}

interface Props {
  initialData: OpenGraphData[];
}

export default function OpenGraphForm({ initialData }: Props) {
  const [data, setData] = useState<OpenGraphData[]>(initialData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<OpenGraphData>>({});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = (item: OpenGraphData) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      image_url: item.image_url || '',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/content/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al subir imagen');
      }

      const { url } = await res.json();
      setEditForm(prev => ({ ...prev, image_url: url }));
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/open-graph', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...editForm,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      const result = await response.json();
      
      setData(prev => prev.map(item => 
        item.id === id ? result.data : item
      ));
      
      setEditingId(null);
      setEditForm({});
      setSavedId(id);
      
      setTimeout(() => setSavedId(null), 2000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Open Graph Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los metadatos de Open Graph para cada página
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {data.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{item.route}</CardTitle>
                  <Badge variant="outline">{item.route === '/' ? 'Home' : 'Página'}</Badge>
                </div>
                {editingId !== item.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingId === item.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Título</label>
                    <Input
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Título para Open Graph"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Descripción</label>
                    <Textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Descripción para Open Graph"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">URL de Imagen</label>
                    <div className="flex gap-2">
                      <Input
                        value={editForm.image_url || ''}
                        onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                        placeholder="https://ejemplo.com/og-image.png"
                        className="flex-1"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleUploadImage}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        title="Subir imagen"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendado: 1200x630px para Facebook, LinkedIn y WhatsApp. Máx 5MB. JPEG, PNG o WebP.
                    </p>
                    {editForm.image_url && (
                      <div className="mt-2 relative group">
                        <img
                          src={editForm.image_url}
                          alt="Preview"
                          className="w-full max-w-md h-32 object-cover rounded-md border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <a
                          href={editForm.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Abrir imagen en nueva pestaña"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSave(item.id)}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Título:</span>
                    <p className="text-sm mt-1">{item.title || <span className="text-muted-foreground italic">Sin título</span>}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Descripción:</span>
                    <p className="text-sm mt-1">{item.description || <span className="text-muted-foreground italic">Sin descripción</span>}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Imagen:</span>
                    <p className="text-sm mt-1 break-all">
                      {item.image_url ? (
                        <a 
                          href={item.image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {item.image_url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">Sin imagen</span>
                      )}
                    </p>
                  </div>
                  {savedId === item.id && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <Check className="w-4 h-4" />
                      Guardado correctamente
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
