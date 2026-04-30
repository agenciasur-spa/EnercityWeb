import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { TimelineEntry } from '@/types/admin';

interface AddNoteFormProps {
  entityType: 'leads' | 'contacts';
  entityId: string;
  onNoteAdded?: (entry: TimelineEntry) => void;
}

function AddNoteForm({ entityType, entityId, onNoteAdded }: AddNoteFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/${entityType}/${entityId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Error al guardar la nota');
      }

      setContent('');

      if (onNoteAdded && data.note) {
        const entry: TimelineEntry = {
          type: 'note',
          id: data.note.id,
          content: data.note.content,
          created_by_email: data.note.created_by_email ?? null,
          created_at: data.note.created_at,
        };
        onNoteAdded(entry);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [content, entityType, entityId, onNoteAdded]);

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Escribir una nota..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={submitting}
      />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="bg-[#154660] hover:bg-[#1d5a7a]"
        >
          {submitting ? 'Guardando...' : 'Agregar nota'}
        </Button>
      </div>
    </div>
  );
}

export { AddNoteForm };
export default AddNoteForm;