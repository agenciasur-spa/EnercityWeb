import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AdminSetting } from '@/types/admin';

interface SettingsFormProps {
  settings: AdminSetting[];
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export default function SettingsForm({ settings }: SettingsFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const dirtyKeys = settings.filter((s) => values[s.key] !== s.value).map((s) => s.key);
  const hasChanges = dirtyKeys.length > 0;

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaveState('idle');
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaveState('saving');
    setErrorMsg('');

    const updates = dirtyKeys.map((key) => ({
      key,
      value: values[key],
    }));

    try {
      const res = await fetch('/api/admin/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Configuración del Negocio</h1>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveState === 'saving'}
        >
          {saveState === 'saving' ? 'Guardando...' : `Guardar cambios${dirtyKeys.length > 0 ? ` (${dirtyKeys.length})` : ''}`}
        </Button>
      </div>

      {saveState === 'success' && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
          Configuración guardada exitosamente.
        </div>
      )}

      {saveState === 'error' && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4">
        {settings.map((setting) => (
          <Card key={setting.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {setting.label || setting.key}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <code className="hidden text-xs text-muted-foreground sm:inline-block select-none bg-muted px-1.5 py-0.5 rounded mt-2">
                  {setting.key}
                </code>
                {setting.key === 'garantia_instalacion' || setting.key === 'formas_pago' ? (
                  <textarea
                    value={values[setting.key] ?? ''}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    rows={setting.key === 'formas_pago' ? 3 : 4}
                    className={cn(
                      'w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      values[setting.key] !== setting.value && 'border-orange-400 focus-visible:border-orange-400'
                    )}
                  />
                ) : (
                  <Input
                    value={values[setting.key] ?? ''}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className={cn(
                      'max-w-md',
                      values[setting.key] !== setting.value && 'border-orange-400 focus-visible:border-orange-400'
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}