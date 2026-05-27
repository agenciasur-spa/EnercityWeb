import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FAQItem {
  pregunta: string;
  respuesta: string;
}

interface FAQTableProps {
  faqs: FAQItem[];
  onSave: (faqs: FAQItem[]) => Promise<void>;
}

const emptyForm: FAQItem = {
  pregunta: '',
  respuesta: '',
};

export default function FAQTable({ faqs, onSave }: FAQTableProps) {
  const [items, setItems] = useState<FAQItem[]>(faqs);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FAQItem>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const openCreate = useCallback(() => {
    setEditingIndex(null);
    setForm({ ...emptyForm });
    setError('');
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setForm({ ...items[index] });
    setError('');
    setDialogOpen(true);
  }, [items]);

  const handleSave = useCallback(async () => {
    if (!form.pregunta.trim() || !form.respuesta.trim()) {
      setError('La pregunta y la respuesta son obligatorias');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const newItems = [...items];
      if (editingIndex !== null) {
        newItems[editingIndex] = form;
      } else {
        newItems.push(form);
      }

      await onSave(newItems);
      setItems(newItems);
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [form, items, editingIndex, onSave]);

  const handleDelete = useCallback(async (index: number) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return;

    try {
      const newItems = items.filter((_, i) => i !== index);
      await onSave(newItems);
      setItems(newItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, [items, onSave]);

  const toggleExpand = useCallback((index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newItems.length) return;

    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
    onSave(newItems);
  }, [items, onSave]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preguntas Frecuentes</CardTitle>
          <Button onClick={openCreate} className="bg-[#F07E04] hover:bg-[#e07504]">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Pregunta
          </Button>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            {error}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay preguntas frecuentes. Haz clic en "Agregar Pregunta" para comenzar.
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{item.pregunta}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(index)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => toggleExpand(index)}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    {expandedItems.has(index) ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Ocultar respuesta
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Ver respuesta
                      </>
                    )}
                  </button>
                  {expandedItems.has(index) && (
                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {item.respuesta}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Editar Pregunta' : 'Nueva Pregunta'}
              </DialogTitle>
              <DialogDescription>
                {editingIndex !== null
                  ? 'Edita la pregunta y respuesta'
                  : 'Agrega una nueva pregunta frecuente'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Pregunta *</label>
                <Textarea
                  value={form.pregunta}
                  onChange={(e) => setForm({ ...form, pregunta: e.target.value })}
                  placeholder="¿Cuánto cuesta instalar paneles solares?"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Respuesta *</label>
                <Textarea
                  value={form.respuesta}
                  onChange={(e) => setForm({ ...form, respuesta: e.target.value })}
                  placeholder="Depende del consumo eléctrico de cada vivienda..."
                  rows={4}
                />
              </div>
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
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
      </CardContent>
    </Card>
  );
}